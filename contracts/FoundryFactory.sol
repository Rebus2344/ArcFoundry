                               
pragma solidity 0.8.30;
import {AdminAccess} from "./AdminAccess.sol";
                                                                                       
contract FoundryFactory is AdminAccess {
    constructor(address administrator) AdminAccess(administrator) {}
    event Deployed(address indexed deployed,bytes32 salt,bytes32 initCodeHash);
    function deploy(bytes32 salt,bytes memory creationCode) external onlyOwner returns(address deployed){
        assembly("memory-safe"){deployed:=create2(0,add(creationCode,32),mload(creationCode),salt)}
        require(deployed!=address(0),"CREATE2 failed");emit Deployed(deployed,salt,keccak256(creationCode));
    }
}
