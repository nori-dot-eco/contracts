pragma solidity ^0.4.24;
import "../EIP777/UnstructuredTokenBase.sol";


/// @dev NoriV0 is a EIP777 token that uses unstructured storage for upgradeability
contract NoriV0 is UnstructuredTokenBase {

  constructor() UnstructuredTokenBase() public { 
    /*Delegate constructor*/ 
  }
}