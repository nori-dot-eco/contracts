pragma solidity ^0.4.24;
import "./PausableToken.sol";


/// @title NoriV0_2_0 is a EIP777 token that uses unstructured storage for upgradeability
contract NoriV0_2_0 is PausableToken {

  constructor() PausableToken() public {
    /*Delegate constructor*/
  }
}