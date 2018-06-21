pragma solidity ^0.4.24;

import "./UnstructuredUpgradeableTokenV0.sol";


/**
* @title UnstructuredUpgradeableTokenV1
* @dev Version 0 of a token to show upgradeability using unstructured storage.
*/
contract UnstructuredUpgradeableTokenV1 is UnstructuredUpgradeableTokenV0 {

  string public newStateVariable;

  function addNewState() public {
    newStateVariable = "new state";
  }
  function getNewState() public view returns(string) {
    return newStateVariable;
  }
  function funcThatV2ShouldDeprecate() public pure returns(string) {
    return "I will not be callable in V2";
  }
}