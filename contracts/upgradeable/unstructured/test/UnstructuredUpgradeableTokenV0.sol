pragma solidity ^0.4.24;

import "../../../EIP777/UnstructuredTokenBase.sol";


/**
* @title UnstructuredUpgradeableTokenV0
* @dev Version 0 of a token to show upgradeability using unstructured storage.
*/
contract UnstructuredUpgradeableTokenV0 is UnstructuredTokenBase {
  constructor() public UnstructuredTokenBase() { }
}