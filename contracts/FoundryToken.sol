                               
pragma solidity 0.8.30;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AdminAccess} from "./AdminAccess.sol";
interface ITradingGate {function tradingOpen() external view returns(bool);function manager() external view returns(address);}
interface ICollectionBinding {function hashToken() external view returns(address);function hook() external view returns(address);}
contract FoundryToken is ERC20, AdminAccess {
    uint256 public constant GENESIS_SUPPLY=2_500_000 ether;
    address public collection;
    address public liquidityHook;
    error Unauthorized();error AlreadyConfigured();error InvalidBinding();
    constructor(address administrator) ERC20("ArcFoundry Scrap","SCRAP") AdminAccess(administrator) {}
                                                                                               
    function configure(address collection_) external {
        if(msg.sender!=owner())revert Unauthorized();
        if(collection!=address(0))revert AlreadyConfigured();
        if(collection_.code.length==0||ICollectionBinding(collection_).hashToken()!=address(this))revert InvalidBinding();
        address h=ICollectionBinding(collection_).hook();if(h.code.length==0)revert InvalidBinding();
        collection=collection_;liquidityHook=h;_mint(h,GENESIS_SUPPLY);
    }
    function mint(address recipient,uint256 amount) external {if(msg.sender!=collection)revert Unauthorized();_mint(recipient,amount);}
    error TransfersClosed();
    function _update(address from,address to,uint256 value) internal override {
        if(from!=address(0)&&to!=address(0)&&!ITradingGate(liquidityHook).tradingOpen()){
            address manager=ITradingGate(liquidityHook).manager();
            if(!((from==liquidityHook&&to==manager&&msg.sender==liquidityHook)||(from==manager&&to==liquidityHook&&msg.sender==manager)))revert TransfersClosed();
        }
        super._update(from,to,value);
    }
    function burn(uint256 amount) external {_burn(msg.sender,amount);}
}
