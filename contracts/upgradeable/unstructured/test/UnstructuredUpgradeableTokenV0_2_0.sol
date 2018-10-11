pragma solidity ^0.4.24;

import "./UnstructuredUpgradeableTokenV0_1_0.sol";


/**
* @title UnstructuredUpgradeableTokenV0_2_0
* @dev Version 0 of a token to show upgradeability using unstructured storage.
*/
contract UnstructuredUpgradeableTokenV0_2_0 is UnstructuredUpgradeableTokenV0_1_0 {

  string public newStateVariable;

  constructor(
    string _name,
    string _symbol,
    uint256 _granularity,
    address[] _defaultOperators
  ) public UnstructuredUpgradeableTokenV0_1_0(_name, _symbol, _granularity, _defaultOperators) { owner = msg.sender; }

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