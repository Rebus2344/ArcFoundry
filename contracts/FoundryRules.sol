                               
pragma solidity 0.8.30;
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

                                                                                 
library FoundryRules {
    function epochOf(uint256 id) internal pure returns(uint256) {
        if(id==0)return 0;
                                                
        return Math.log2((id-1)/8+1);
    }
    function size(uint256 epoch) internal pure returns(uint256) {require(epoch<253,"Epoch overflow");return uint256(8)<<epoch;}
    function beforeEpoch(uint256 epoch) internal pure returns(uint256) {return size(epoch)-8;}
    function price(uint256 id) internal pure returns(uint256) {uint256 e=epochOf(id);return e==0?0.17295126 ether:beforeEpoch(e)*0.0501308 ether;}
    function burnReward(uint256 id,uint256 minted) internal pure returns(uint256) {
        if(id==0||id>minted)return 0;
        uint256 current=epochOf(minted);uint256 delta=current-epochOf(id);
        if(delta==0)return 1000 ether;
        if(delta>70)return 0;
        uint256 top=uint256(1000 ether)>>(delta-1);
        uint256 span=size(current)-1;uint256 progress=minted-(beforeEpoch(current)+1);
                                                                                         
        return Math.mulDiv(top,2*span-progress,2*span);
    }
    function wall(uint256 id) internal pure returns(uint256) {
        if(id<=16376)return 1;
        uint256 x=id-16376;if(x>type(uint128).max)return type(uint256).max;
        return Math.max(1,x*x/200);
    }
    function floor(uint256 id,uint256 bits) internal pure returns(uint256) {uint256 shift=bits+epochOf(id);return shift>=256?1:type(uint256).max>>shift;}
    function target(uint256 id,uint256 base,uint256 bits,uint256 idle,uint256 burst) internal pure returns(uint256) {
        uint256 f=floor(id,bits);uint256 t=Math.min(base,f);
        if(idle>0){uint256 shift=Math.min(idle,20);t=t>(type(uint256).max>>shift)?type(uint256).max:t<<shift;t=Math.min(t,f>type(uint256).max/2?type(uint256).max:f*2);}
        return Math.max(1,(t/wall(id))>>Math.min(burst,16));
    }
}
