pragma solidity ^0.4.24;
import "./PausableToken.sol";


/// @dev NoriV0_1_2 is a EIP777 token that uses unstructured storage for upgradeability
contract NoriV0_1_2 is PausableToken {

  constructor() PausableToken() public {
    /*Delegate constructor*/
  }
}