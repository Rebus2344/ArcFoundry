                               
pragma solidity 0.8.30;
library ChainAnchor {
    function number() internal view returns(uint256){return block.number;}
    function hash(uint256 n) internal view returns(bytes32){return blockhash(n);}
    function previousBlockHash(uint256) internal view returns(bytes32){return blockhash(block.number-1);}
}
