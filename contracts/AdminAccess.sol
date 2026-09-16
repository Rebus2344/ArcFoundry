                               
pragma solidity 0.8.30;
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
                                                                                                  
abstract contract AdminAccess is ReentrancyGuard {
    address private immutable administrator;
    error UnauthorizedOwner();error InvalidRecipient();
    constructor(address account){if(account==address(0))revert InvalidRecipient();administrator=account;}
    modifier onlyOwner(){if(msg.sender!=administrator)revert UnauthorizedOwner();_;}
    function owner() public view returns(address){return administrator;}
}
