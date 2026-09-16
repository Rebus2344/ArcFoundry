                               
pragma solidity 0.8.30;
                                                                                                 
                                                                                   
library FactoryLayout {
    function blueprint(uint256 id,bytes32 key) internal pure returns(uint16){
        require(id>0,"Invalid blueprint ID");
        uint256 series=(id-1)/16384;if(series>0)key=keccak256(abi.encodePacked(key,series));
        id=(id-1)%16384+1;
        uint8 left=uint8((id-1)>>7);uint8 right=uint8((id-1)&127);
        for(uint8 round;round<6;round++){uint8 next=left^(uint8(uint256(keccak256(abi.encodePacked(key,round,right))))&127);left=right;right=next;}
        return(uint16(left)<<7)|uint16(right);
    }
}
