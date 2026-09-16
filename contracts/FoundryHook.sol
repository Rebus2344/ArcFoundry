                               
pragma solidity 0.8.30;
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId,PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {SwapParams,ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {BalanceDelta,BalanceDeltaLibrary} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta,toBeforeSwapDelta} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {FoundryToken} from "./FoundryToken.sol";
import {AdminAccess} from "./AdminAccess.sol";
interface IFoundryCollection {function miningStart() external view returns(uint256);function totalMinted() external view returns(uint256);function mintPrice() external view returns(uint256);function hook() external view returns(address);function hashToken() external view returns(address);}
interface IWrappedETH {function balanceOf(address) external view returns(uint256);function withdraw(uint256) external;}

                                                                                           
contract FoundryHook is AdminAccess {
    using PoolIdLibrary for PoolKey;using StateLibrary for IPoolManager;using BalanceDeltaLibrary for BalanceDelta;
    uint160 public constant expectedFlags=0x2acc;
    uint256 public constant TRADING_OPENS_AT=504;
    uint256 public constant feeBps=500;
    uint256 public constant devBps=3000;
    uint256 public constant PARTNER_BPS=2500;
    uint256 public constant capPerBlock=62.6635 ether;
    uint256 public constant shiftBps=100;
    uint256 private constant Q96=1<<96;
    IPoolManager public immutable manager;
    FoundryToken public immutable token;
    address public immutable WETH;
    address payable public immutable projectPartner;
    IFoundryCollection public collection;
    PoolKey private pool;
    bool public poolReady;
    uint256 public tradingSince;
    uint256 public queue;
    uint256 public feesDue;
    uint256 public feesPaid;
    uint256 public seedReturned;
    bool public reserveWithdrawalUsed;
    uint256 public reserveWithdrawn;
    uint256 public devDue;
    uint256 public devPaid;
    uint256 public partnerDue;
    uint256 public partnerPaid;
    uint256 public totalFunded;
    uint256 public totalFees;
    uint256 public buybackSpent;
    uint256 public buybackBurned;
    uint256 public blockStartAt;
    uint160 public blockStartSqrt;
    uint256 public spentInBlock;
    uint128 public lockedLiquidity;
    uint256 public initialUSDC;
    uint256 public initialSCRAP;
    uint8 private operation;
    error Unauthorized();error InvalidPool();error TradingClosed();error AlreadyInitialized();error InvalidAmount();error PaymentFailed();
    event Funded(address indexed from,uint256 amount,uint256 buyback,uint256 project);
    event PoolSeeded(uint256 usdc,uint256 scrap,uint128 liquidity);
    event TradingOpened(uint256 at);
    event BoughtAndBurned(uint256 spent,uint256 burned);
    event ProjectPaid(uint256 amount);
    event PartnerPaid(address indexed recipient,uint256 amount);
    constructor(address administrator,address manager_,address token_,address weth_,address payable projectPartner_) AdminAccess(administrator) {
        if(uint160(address(this))&0x3fff!=expectedFlags||manager_.code.length==0||token_.code.length==0)revert InvalidPool();
        if(projectPartner_==address(0)||projectPartner_==address(this))revert InvalidRecipient();
        manager=IPoolManager(manager_);token=FoundryToken(token_);WETH=weth_;projectPartner=projectPartner_;
        pool=PoolKey(Currency.wrap(address(0)),Currency.wrap(token_),0,60,IHooks(address(this)));
    }
    modifier onlyManager(){if(msg.sender!=address(manager))revert Unauthorized();_;}
    modifier onlyTeam(){if(msg.sender!=owner())revert Unauthorized();_;}
    receive() external payable {if(msg.sender!=address(manager)&&msg.sender!=WETH){queue+=msg.value;}}
    function key() external view returns(PoolKey memory){return pool;}
    function configure(address c) external onlyTeam {
        if(address(collection)!=address(0))revert AlreadyInitialized();
        if(c.code.length==0||IFoundryCollection(c).hook()!=address(this)||IFoundryCollection(c).hashToken()!=address(token))revert InvalidPool();collection=IFoundryCollection(c);
    }
    function onMint(uint256 id) external payable nonReentrant {
        if(msg.sender!=address(collection))revert Unauthorized();_fund(msg.sender,msg.value,true);
                                                                                         
        if((id>=TRADING_OPENS_AT||tradingSince>0)&&gasleft()>120000){
            try this.processMintBuyback{gas:Math.min(900000,gasleft()-60000)}() {} catch {emit BuybackDeferred(id);}
        }else if(id>=TRADING_OPENS_AT){emit BuybackDeferred(id);}
    }
    function _fund(address from,uint256 amount,bool mintPayment) private {
        uint256 project=mintPayment?amount*devBps/10000:amount;
        uint256 partner=mintPayment?project*PARTNER_BPS/10000:0;
        devDue+=project-partner;partnerDue+=partner;queue+=amount-project;totalFunded+=amount;
        emit Funded(from,amount,amount-project,project);
    }
    function tradingOpen() public view returns(bool){return poolReady&&lockedLiquidity>0&&tradingSince>0;}
    function currentFee() public pure returns(uint256){return feeBps;}
    event BuybackDeferred(uint256 indexed mintId);
    function processMintBuyback() external {if(msg.sender!=address(this))revert Unauthorized();if(tradingSince==0)_openTrading();else{operation=2;manager.unlock("");operation=0;}}
                                                                                                    
    function seedPool() external payable onlyOwner nonReentrant {
        if(initialUSDC>0)revert AlreadyInitialized();
        if(address(collection)==address(0)||token.collection()!=address(collection)||token.liquidityHook()!=address(this)||msg.value!=25 ether)revert InvalidPool();
        uint256 tokens=token.GENESIS_SUPPLY();if(token.balanceOf(address(this))<tokens)revert InvalidAmount();
        uint160 sqrtPriceX96=uint160(Math.sqrt(Math.mulDiv(tokens,1<<192,msg.value)));
        uint160 lower=TickMath.getSqrtPriceAtTick(-887220);uint160 upper=TickMath.getSqrtPriceAtTick(887220);
        uint256 a=Math.mulDiv(msg.value,Math.mulDiv(sqrtPriceX96,upper,Q96),upper-sqrtPriceX96);
        uint256 b=Math.mulDiv(tokens,Q96,sqrtPriceX96-lower);
        uint256 liquidity=Math.min(a,b);if(liquidity==0||liquidity>type(uint128).max)revert InvalidAmount();
        manager.initialize(pool,sqrtPriceX96);lockedLiquidity=uint128(liquidity);
        operation=1;manager.unlock(abi.encode(liquidity));operation=0;poolReady=true;
                                                                                                   
        queue+=msg.value-initialUSDC;
        emit PoolSeeded(initialUSDC,initialSCRAP,lockedLiquidity);
    }
    function _openTrading() private {
        if(tradingSince!=0)revert AlreadyInitialized();
        if(address(collection)==address(0)||collection.totalMinted()<TRADING_OPENS_AT)revert TradingClosed();
        if(!poolReady||lockedLiquidity==0)revert InvalidPool();
        operation=4;manager.unlock("");operation=0;
        tradingSince=block.timestamp;emit TradingOpened(block.timestamp);
    }
                                                                                              
    function retryLaunch() external nonReentrant {_openTrading();}
    function unlockCallback(bytes calldata data) external onlyManager returns(bytes memory){
        if(operation==1){
            (BalanceDelta delta,)=manager.modifyLiquidity(pool,ModifyLiquidityParams(-887220,887220,int256(abi.decode(data,(uint256))),bytes32(0)),"");
            if(delta.amount0()>0||delta.amount1()>0)revert InvalidAmount();
            initialUSDC=uint256(-int256(delta.amount0()));initialSCRAP=uint256(-int256(delta.amount1()));
            manager.settle{value:initialUSDC}();manager.sync(Currency.wrap(address(token)));token.transfer(address(manager),initialSCRAP);manager.settle();
        }else if(operation==3){
            (uint128 liquidity,uint256 amount)=abi.decode(data,(uint128,uint256));
            (BalanceDelta delta,)=manager.modifyLiquidity(pool,ModifyLiquidityParams(-887220,887220,-int256(uint256(liquidity)),bytes32(0)),"");
            if(delta.amount0()<0||delta.amount1()<0||uint256(int256(delta.amount0()))<amount)revert InvalidAmount();
            uint256 excess=uint256(int256(delta.amount0()))-amount;uint256 scraps=uint256(int256(delta.amount1()));
                                                                                                   
                                                                                                  
            if(excess>0||scraps>0)manager.donate(pool,excess,scraps,"");
            manager.take(Currency.wrap(address(0)),owner(),amount);
        }else if(operation==2){_buyback();
        }else if(operation==4){uint256 budget=queue;if(budget>0){uint256 spent=_purchase(budget,TickMath.getSqrtPriceAtTick(-887220)+1);if(spent!=budget)revert InvalidAmount();}}
        else revert Unauthorized();return "";
    }
    function beforeInitialize(address,PoolKey calldata,uint160) external pure returns(bytes4){revert InvalidPool();}
    function beforeAddLiquidity(address,PoolKey calldata,ModifyLiquidityParams calldata,bytes calldata) external pure returns(bytes4){revert Unauthorized();}
    function beforeRemoveLiquidity(address,PoolKey calldata,ModifyLiquidityParams calldata,bytes calldata) external pure returns(bytes4){revert Unauthorized();}
    function _check(PoolKey calldata p) private view {if(PoolId.unwrap(PoolIdLibrary.toId(p))!=PoolId.unwrap(pool.toId()))revert InvalidPool();if(!tradingOpen())revert TradingClosed();}
    function beforeSwap(address,PoolKey calldata p,SwapParams calldata params,bytes calldata) external onlyManager returns(bytes4,BeforeSwapDelta,uint24){
        _check(p);int128 fee;
                                                                                            
        if(params.zeroForOne==(params.amountSpecified<0)){
            uint256 amount=uint256(params.amountSpecified<0?-params.amountSpecified:params.amountSpecified);
            uint256 rate=currentFee();uint256 levy=params.amountSpecified<0?Math.mulDiv(amount,rate,10000):Math.mulDiv(amount,rate,10000-rate,Math.Rounding.Ceil);
            fee=_takeFee(levy);
        }
        return(IHooks.beforeSwap.selector,toBeforeSwapDelta(fee,0),0);
    }
    function afterSwap(address,PoolKey calldata p,SwapParams calldata params,BalanceDelta delta,bytes calldata) external onlyManager returns(bytes4,int128){
        _check(p);int128 fee;
        if(params.zeroForOne!=(params.amountSpecified<0)){
            int256 amount=delta.amount0();uint256 absolute=uint256(amount<0?-amount:amount);uint256 rate=currentFee();
            fee=_takeFee(amount<0?Math.mulDiv(absolute,rate,10000-rate,Math.Rounding.Ceil):Math.mulDiv(absolute,rate,10000));
        }
        return(IHooks.afterSwap.selector,fee);
    }
    function _takeFee(uint256 fee) private returns(int128){if(fee>uint256(uint128(type(int128).max)))revert InvalidAmount();if(fee>0){manager.take(Currency.wrap(address(0)),address(this),fee);totalFees+=fee;feesDue+=fee;}return int128(uint128(fee));}
    function buyback() external nonReentrant {if(!tradingOpen())revert TradingClosed();operation=2;manager.unlock("");operation=0;}
    function spotSqrtPrice() public view returns(uint160 sqrtPrice){if(!poolReady)return 0;(sqrtPrice,,,)=manager.getSlot0(pool.toId());}
    function epochPriceCeilingSqrt() public view returns(uint160){if(address(collection)==address(0))return 0;return uint160(Math.sqrt(Math.mulDiv(1000 ether,1<<192,collection.mintPrice())));}
    function _buyback() private {
        if(!tradingOpen()||queue==0)return;
        uint160 current=spotSqrtPrice();if(blockStartAt!=block.number){blockStartAt=block.number;blockStartSqrt=current;spentInBlock=0;}
        if(spentInBlock>=capPerBlock)return;
                                                                                          
        uint256 limit=Math.mulDiv(blockStartSqrt,1e18,1004987562112089027,Math.Rounding.Ceil);
        limit=Math.max(limit,Math.max(uint256(epochPriceCeilingSqrt()),uint256(TickMath.MIN_SQRT_PRICE)+1));
        if(current<=limit)return;
        uint256 budget=Math.min(queue,capPerBlock-spentInBlock);
        uint256 spent=_purchase(budget,uint160(limit));spentInBlock+=spent;
    }
    function _purchase(uint256 budget,uint160 limit) private returns(uint256 spent){
        if(budget>uint256(type(int256).max))revert InvalidAmount();
        BalanceDelta delta=manager.swap(pool,SwapParams(true,-int256(budget),limit),"");
        if(delta.amount0()>0||delta.amount1()<0)revert InvalidAmount();
        spent=uint256(-int256(delta.amount0()));uint256 received=uint256(int256(delta.amount1()));
        if(spent==0)return 0;
        queue-=spent;buybackSpent+=spent;buybackBurned+=received;
        manager.settle{value:spent}();manager.take(Currency.wrap(address(token)),address(this),received);token.burn(received);emit BoughtAndBurned(spent,received);
    }
    function withdrawProject() external onlyOwner nonReentrant {uint256 amount=devDue;if(amount==0)revert InvalidAmount();devDue=0;devPaid+=amount;(bool ok,)=payable(owner()).call{value:amount}("");if(!ok)revert PaymentFailed();emit ProjectPaid(amount);}
    function withdrawPartner() external nonReentrant {
        if(msg.sender!=owner()&&msg.sender!=projectPartner)revert Unauthorized();
        uint256 amount=partnerDue;if(amount==0)revert InvalidAmount();partnerDue=0;partnerPaid+=amount;
        (bool ok,)=projectPartner.call{value:amount}("");if(!ok)revert PaymentFailed();emit PartnerPaid(projectPartner,amount);
    }
    event FeesPaid(uint256 amount);
    event SeedReturned(uint256 amount);
    event UnlaunchedReserveWithdrawn(uint256 amount);
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount=feesDue;if(amount==0)revert InvalidAmount();feesDue=0;feesPaid+=amount;
        (bool ok,)=payable(owner()).call{value:amount}("");if(!ok)revert PaymentFailed();emit FeesPaid(amount);
    }
    function reserveWithdrawalAvailable() public view returns(bool){
        return address(collection)!=address(0)&&!reserveWithdrawalUsed&&collection.totalMinted()<TRADING_OPENS_AT&&block.timestamp>=collection.miningStart()+7 days;
    }
    function withdrawUnlaunchedReserve() external onlyOwner nonReentrant {
        if(!reserveWithdrawalAvailable()||queue==0)revert InvalidAmount();
        reserveWithdrawalUsed=true;uint256 amount=queue;queue=0;reserveWithdrawn=amount;
        (bool ok,)=payable(owner()).call{value:amount}("");if(!ok)revert PaymentFailed();emit UnlaunchedReserveWithdrawn(amount);
    }
                                                                                              
    function returnSeed(uint256 amount) external onlyOwner nonReentrant {
        if(!poolReady||amount==0||amount>25 ether-seedReturned)revert InvalidAmount();
        uint160 current=spotSqrtPrice();uint160 upper=TickMath.getSqrtPriceAtTick(887220);
        if(current>=upper)revert InvalidAmount();
        uint256 nativeReserve=Math.mulDiv(Math.mulDiv(uint256(lockedLiquidity),Q96,current),upper-current,upper);
        if(nativeReserve<=amount)revert InvalidAmount();
        uint256 portion=Math.mulDiv(amount,uint256(lockedLiquidity),nativeReserve,Math.Rounding.Ceil);
        if(portion==0||portion>=lockedLiquidity)revert InvalidAmount();
        seedReturned+=amount;lockedLiquidity-=uint128(portion);
        operation=3;manager.unlock(abi.encode(uint128(portion),amount));operation=0;emit SeedReturned(amount);
    }
}
