                               
pragma solidity 0.8.30;
import {FoundryHook} from "./FoundryHook.sol";
import {AdminAccess} from "./AdminAccess.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta,BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

                                                                                              
contract FoundryRouter is AdminAccess {
    using BalanceDeltaLibrary for BalanceDelta;
    FoundryHook public immutable hook;
    IPoolManager public immutable manager;
    IERC20 public immutable token;
    bool private active;
    bool private quoting;
    error Unauthorized();error InvalidAmount();error Slippage();error Expired();error QuoteResult(uint256 output,uint256 input);
    constructor(address administrator,address payable h) AdminAccess(administrator){hook=FoundryHook(h);manager=hook.manager();token=IERC20(address(hook.token()));}
    receive() external payable {if(msg.sender!=address(manager))revert Unauthorized();}
    function quote(bool buying,uint256 amount) external nonReentrant returns(uint256 output){
        if(amount==0||amount>uint256(type(int256).max))revert InvalidAmount();active=true;quoting=true;
        try manager.unlock(abi.encode(buying,amount,address(this),uint256(0))) {revert InvalidAmount();}
        catch(bytes memory reason){
            active=false;quoting=false;
            if(reason.length==68&&bytes4(reason)==QuoteResult.selector){assembly("memory-safe"){output:=mload(add(reason,36))}}else{assembly("memory-safe"){revert(add(reason,32),mload(reason))}}
        }
    }
    function buy(uint256 minOut,uint256 deadline) external payable nonReentrant returns(uint256 output){
        if(block.timestamp>deadline)revert Expired();if(msg.value==0)revert InvalidAmount();
        active=true;output=abi.decode(manager.unlock(abi.encode(true,msg.value,msg.sender,minOut)),(uint256));active=false;
    }
    function sell(uint256 amount,uint256 minOut,uint256 deadline) external nonReentrant returns(uint256 output){
        if(block.timestamp>deadline)revert Expired();if(amount==0)revert InvalidAmount();
        require(token.transferFrom(msg.sender,address(this),amount));active=true;
        output=abi.decode(manager.unlock(abi.encode(false,amount,msg.sender,minOut)),(uint256));active=false;
    }
    function unlockCallback(bytes calldata data) external returns(bytes memory){
        if(msg.sender!=address(manager)||!active)revert Unauthorized();
        (bool buying,uint256 amount,address recipient,uint256 minOut)=abi.decode(data,(bool,uint256,address,uint256));
        if(amount>uint256(type(int256).max))revert InvalidAmount();
        PoolKey memory p=hook.key();
        BalanceDelta d=manager.swap(p,SwapParams(buying,-int256(amount),buying?TickMath.MIN_SQRT_PRICE+1:TickMath.MAX_SQRT_PRICE-1),"");
        uint256 used=uint256(-int256(buying?d.amount0():d.amount1()));uint256 output=uint256(int256(buying?d.amount1():d.amount0()));
        if(quoting)revert QuoteResult(output,used);
        if(output<minOut||output==0||used>amount)revert Slippage();
        if(buying){manager.settle{value:used}();manager.take(Currency.wrap(address(token)),recipient,output);if(amount>used){(bool ok,)=recipient.call{value:amount-used}("");require(ok);}}
        else {manager.sync(Currency.wrap(address(token)));require(token.transfer(address(manager),used));manager.settle();manager.take(Currency.wrap(address(0)),recipient,output);if(amount>used)require(token.transfer(recipient,amount-used));}
        return abi.encode(output);
    }
}
