                               
pragma solidity 0.8.30;
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {AdminAccess} from "./AdminAccess.sol";

import {ChainAnchor} from "./ChainAnchor.sol";
import {FoundryRules} from "./FoundryRules.sol";
import {FactoryLayout} from "./FactoryLayout.sol";
import {FoundryToken} from "./FoundryToken.sol";
interface IFoundryArt {function tokenURI(uint256,bytes32,bool,uint32,uint16) external view returns(string memory);}
interface IFoundryMarket {function onMint(uint256) external payable;function collection() external view returns(address);function poolReady() external view returns(bool);}

                                                                                       
                                                                                     
contract ArcFoundry is ERC721Enumerable, AdminAccess {
    uint256 public constant ROYALTY_BPS=1000;
    uint256 public constant EPOCH0=8;
    uint256 public constant PRICE_EPOCH0=0.17295126 ether;
    uint256 public constant BURN_BASE=1000 ether;
    uint256 public constant BURN_REWARD_MODEL=2;
    uint256 public constant BURN_DELAY=600;
    uint256 public constant ANCHOR_WINDOW=250;
    uint256 public constant TARGET_INTERVAL=10;
    uint256 public constant RETARGET_WINDOW=8;
    uint256 public constant FAILSAFE_IDLE=300;
    uint256 public constant BURST_SHIFT_CAP=16;
    uint256 private constant SCALE=1e27;
    uint256 public immutable FLOOR_BITS;
    uint256 public miningStart;
    uint256 public immutable deployedAt;
    bytes32 public immutable GENESIS_HASH;
    address public immutable renderer;
    FoundryToken public immutable hashToken;
    address payable public immutable hook;
    uint256 public totalMinted;
    uint256 public burnedCount;
    uint256 public totalScrapMinted;
    uint256 public baseTarget;
    uint256 public lastMintBlock;
    uint256 public lastMintTime;
    uint256 public burstCount;
    uint256 public windowStartTime;
    uint256 public windowStartCount;
    uint256 public liveEligible;
    uint256 public accPerFoundry;
    uint256 public totalRentFunded;
    uint256 public totalRentPaid;
    uint256 public totalHookFunded;
    mapping(uint256=>bytes32) public workOf;
    mapping(uint256=>bytes32) public seeds;
    mapping(uint256=>uint256) public mintedAt;
    mapping(uint256=>uint256) public burnedInEpoch;
    mapping(uint256=>uint256) public joinAcc;
    mapping(uint256=>uint256) public claimedAcc;
    mapping(address=>uint256) public lastMintOf;
    mapping(address=>uint256) public personalBurst;
    error MiningNotStarted();error MarketNotReady();error WrongPrice();error BadProof();error InvalidAnchor();
    error OneMintPerBlock();error NotTokenOwner();error BurnTooEarly();error NextMintRequired();error NothingToClaim();error PaymentFailed();error InvalidConfiguration();
    event Mined(uint256 indexed tokenId,address indexed miner,bytes32 work,bytes32 seed,uint256 epoch,uint256 price);
    event RentClaimed(uint256 indexed tokenId,address indexed owner,uint256 amount);
    event Burned(uint256 indexed tokenId,address indexed owner,uint256 scrap,uint256 rent);
    event Retarget(uint256 target,uint256 elapsed);
    event MetadataUpdate(uint256 tokenId);

    constructor(address administrator,address renderer_,address token_,address payable hook_,uint8 initialBits,uint8 floorBits,uint256 start) ERC721("ArcFoundry","AFCT") AdminAccess(administrator) {
        if(renderer_.code.length==0||token_.code.length==0||hook_.code.length==0||(start==0&&block.chainid!=31337)||floorBits<8||initialBits<floorBits||initialBits>48)revert InvalidConfiguration();
        renderer=renderer_;hashToken=FoundryToken(token_);hook=hook_;FLOOR_BITS=floorBits;baseTarget=type(uint256).max>>initialBits;
        miningStart=start;deployedAt=block.timestamp;
        GENESIS_HASH=keccak256(abi.encode("ARCFOUNDRY_V1",block.chainid,address(this),ChainAnchor.previousBlockHash(block.chainid)));
    }
    event MiningStartChanged(uint256 previous,uint256 next);
    function setMiningStart(uint256 next) external onlyOwner {
        if(totalMinted!=0||block.timestamp>=miningStart||next<=block.timestamp)revert InvalidConfiguration();
        emit MiningStartChanged(miningStart,next);miningStart=next;
    }
    function epochOf(uint256 id) public pure returns(uint256){return FoundryRules.epochOf(id);}
    function epochSize(uint256 k) public pure returns(uint256){return FoundryRules.size(k);}
    function createdBefore(uint256 k) public pure returns(uint256){return FoundryRules.beforeEpoch(k);}
    function epochStart(uint256 k) public pure returns(uint256){return createdBefore(k)+1;}
    function currentEpoch() public view returns(uint256){return epochOf(totalMinted);}
    function priceOf(uint256 id) public pure returns(uint256){return FoundryRules.price(id);}
    function mintPrice() public view returns(uint256){return priceOf(totalMinted+1);}
    function wallMultiplier(uint256 id) public pure returns(uint256){return FoundryRules.wall(id);}
    function epochFloorAt(uint256 id) public view returns(uint256){return FoundryRules.floor(id,FLOOR_BITS);}
    function targetAt(uint256 id,uint256 base,uint256 bits,uint256 idle,uint256 burst) public pure returns(uint256){return FoundryRules.target(id,base,bits,idle,burst);}
    function currentBurst() public view returns(uint256){return _cooled(burstCount,lastMintTime);}
    function burstOfMiner(address miner) public view returns(uint256){return _cooled(personalBurst[miner],lastMintOf[miner]);}
    function _cooled(uint256 count,uint256 at) private view returns(uint256){uint256 steps=(block.timestamp-at)/10;return steps>=count?0:count-steps;}
    function currentTarget() public view returns(uint256){uint256 idle=lastMintTime==0?0:(block.timestamp-lastMintTime)/FAILSAFE_IDLE;return targetAt(totalMinted+1,baseTarget,FLOOR_BITS,idle,currentBurst());}
    function targetFor(address miner) public view returns(uint256){return Math.max(1,currentTarget()>>Math.min(burstOfMiner(miner),16));}
    function prevWork() public view returns(bytes32){return totalMinted==0?GENESIS_HASH:workOf[totalMinted];}
    function currentAnchor() public view returns(uint256 anchorBlock,bytes32 anchor){anchorBlock=ChainAnchor.number()-1;anchor=ChainAnchor.hash(anchorBlock);}
    function workHash(address miner,uint256 nonce,bytes32 prev,bytes32 anchor) public pure returns(bytes32){return keccak256(abi.encodePacked(miner,nonce,prev,anchor));}
    function mine(uint256 nonce,uint256 anchorBlock) external payable nonReentrant returns(uint256 id){
        if(block.timestamp<miningStart)revert MiningNotStarted();
        if(hashToken.collection()!=address(this)||IFoundryMarket(hook).collection()!=address(this)||!IFoundryMarket(hook).poolReady())revert MarketNotReady();
        id=totalMinted+1;uint256 price=priceOf(id);if(msg.value!=price)revert WrongPrice();
        uint256 l2=ChainAnchor.number();if(l2==lastMintBlock)revert OneMintPerBlock();
        if(anchorBlock>=l2||l2-anchorBlock>ANCHOR_WINDOW)revert InvalidAnchor();
        bytes32 anchor=ChainAnchor.hash(anchorBlock);if(anchor==bytes32(0))revert InvalidAnchor();
        bytes32 work=workHash(msg.sender,nonce,prevWork(),anchor);if(uint256(work)>=targetFor(msg.sender))revert BadProof();
        uint256 epoch=epochOf(id);uint256 hookAmount;
        if(epoch>0&&id==epochStart(epoch)){
            joinAcc[epoch-1]=accPerFoundry;
            liveEligible+=epochSize(epoch-1)-burnedInEpoch[epoch-1];
        }
        if(liveEligible==0){hookAmount=price;}else{
            uint256 prior=createdBefore(epoch);uint256 dead=prior-liveEligible;
            hookAmount=prior*0.01503924 ether+dead*0.03509156 ether*3000/10000;
            uint256 rent=price-hookAmount;
            accPerFoundry+=Math.mulDiv(rent,SCALE,liveEligible);totalRentFunded+=rent;
        }
        totalMinted=id;workOf[id]=work;mintedAt[id]=block.timestamp;
        bytes32 seed=keccak256(abi.encodePacked("ARCFOUNDRY_ART_V1",work));seeds[id]=seed;
        burstCount=currentBurst()+1;personalBurst[msg.sender]=burstOfMiner(msg.sender)+1;
        lastMintOf[msg.sender]=block.timestamp;lastMintTime=block.timestamp;lastMintBlock=l2;
        _retarget();totalHookFunded+=hookAmount;
        _safeMint(msg.sender,id);
        IFoundryMarket(hook).onMint{value:hookAmount}(id);
        emit Mined(id,msg.sender,work,seed,epoch,price);
    }
    function _retarget() private {
        if(windowStartTime==0){windowStartTime=block.timestamp;windowStartCount=totalMinted;return;}
        if(totalMinted-windowStartCount<RETARGET_WINDOW)return;
        uint256 elapsed=block.timestamp-windowStartTime;uint256 planned=RETARGET_WINDOW*TARGET_INTERVAL;
        elapsed=Math.max(planned/4,Math.min(planned*2,elapsed));
        baseTarget=Math.max(1,Math.min(Math.mulDiv(baseTarget,elapsed,planned),epochFloorAt(totalMinted+1)));
        windowStartTime=block.timestamp;windowStartCount=totalMinted;emit Retarget(baseTarget,elapsed);
    }
    function claimable(uint256 id) public view returns(uint256){
        if(_ownerOf(id)==address(0)||epochOf(id)>=currentEpoch())return 0;
        return (accPerFoundry-Math.max(joinAcc[epochOf(id)],claimedAcc[id]))/SCALE;
    }
    function claim(uint256 id) external nonReentrant returns(uint256 amount){
        if(ownerOf(id)!=msg.sender)revert NotTokenOwner();amount=_claim(id,msg.sender);if(amount==0)revert NothingToClaim();_pay(msg.sender,amount);
    }
    function claimMany(uint256[] calldata ids) external nonReentrant returns(uint256 amount){
        require(ids.length>0&&ids.length<=50,"Batch size 1-50");
        for(uint256 i;i<ids.length;i++){if(ownerOf(ids[i])!=msg.sender)revert NotTokenOwner();amount+=_claim(ids[i],msg.sender);}
        if(amount==0)revert NothingToClaim();_pay(msg.sender,amount);
    }
    function _claim(uint256 id,address recipient) private returns(uint256 amount){amount=claimable(id);if(amount>0){claimedAcc[id]=accPerFoundry;totalRentPaid+=amount;emit RentClaimed(id,recipient,amount);}}
    function burnRewardAt(uint256 id,uint256 minted) public pure returns(uint256){return FoundryRules.burnReward(id,minted);}
    function burnReward(uint256 id) public view returns(uint256){return _ownerOf(id)==address(0)?0:burnRewardAt(id,totalMinted);}
    function canBurn(uint256 id) public view returns(bool successor,bool delay,uint256 unlock){if(_ownerOf(id)==address(0))return(false,false,0);unlock=mintedAt[id]+BURN_DELAY;return(totalMinted>id,block.timestamp>=unlock,unlock);}
    error RewardBelowMinimum();
    function burn(uint256 id,uint256 minimum) external nonReentrant returns(uint256 reward){
        uint256 rent;(reward,rent)=_burnFoundry(id);if(reward<minimum)revert RewardBelowMinimum();
        if(reward>0)hashToken.mint(msg.sender,reward);if(rent>0)_pay(msg.sender,rent);
    }
    function burnMany(uint256[] calldata ids,uint256 minimum) external nonReentrant returns(uint256 reward){
        require(ids.length>0&&ids.length<=50,"Batch size 1-50");uint256 rent;
        for(uint256 i;i<ids.length;i++){(uint256 r,uint256 due)=_burnFoundry(ids[i]);reward+=r;rent+=due;}
        if(reward<minimum)revert RewardBelowMinimum();
        if(reward>0)hashToken.mint(msg.sender,reward);if(rent>0)_pay(msg.sender,rent);
    }
    function _burnFoundry(uint256 id) private returns(uint256 reward,uint256 rent){
        if(ownerOf(id)!=msg.sender)revert NotTokenOwner();if(totalMinted<=id)revert NextMintRequired();if(block.timestamp<mintedAt[id]+BURN_DELAY)revert BurnTooEarly();
        rent=_claim(id,msg.sender);reward=burnRewardAt(id,totalMinted);
        if(epochOf(id)<currentEpoch())liveEligible--;else burnedInEpoch[epochOf(id)]++;
        burnedCount++;totalScrapMinted+=reward;_burn(id);emit Burned(id,msg.sender,reward,rent);
    }
    function _pay(address to,uint256 value) private {(bool ok,)=to.call{value:value}("");if(!ok)revert PaymentFailed();}
                                                                                                        
    function royaltyInfo(uint256,uint256 price) external view returns(address,uint256){return(owner(),Math.mulDiv(price,ROYALTY_BPS,10000));}
    receive() external payable {}                                                               
    function contractURI() external pure returns(string memory){return string.concat("data:application/json;base64,",Base64.encode(bytes('{"name":"ArcFoundry","description":"Unique procedural factory NFTs on Arc. Continuous proof-of-work issuance. Rarity is cosmetic. Rent reserves are protected."}')));}
    function rarityForRoll(uint256 roll) public pure returns(uint8){require(roll<10000,"Invalid roll");return roll<6000?0:roll<8500?1:roll<9500?2:roll<9900?3:4;}
    function rarityOf(uint256 id) public view returns(uint8){_requireOwned(id);return rarityForRoll(uint256(seeds[id])%10000);}
    function blueprintFor(uint256 id,bytes32 key) public pure returns(uint16){return FactoryLayout.blueprint(id,key);}
    function blueprintOf(uint256 id) public view returns(uint16){require(id>0,"Invalid NFT ID");return FactoryLayout.blueprint(id,GENESIS_HASH);}
    function tokenURI(uint256 id) public view override returns(string memory){_requireOwned(id);return IFoundryArt(renderer).tokenURI(id,seeds[id],false,uint32(epochOf(id)),blueprintOf(id));}
    function supportsInterface(bytes4 id) public view override returns(bool){return id==0x49064906||id==0x2a55205a||id==0x7f5828d0||super.supportsInterface(id);}
}
