pragma solidity ^0.4.24;

import "./UnstructuredUpgradeableTokenV1.sol";


/**
* @title UnstructuredUpgradeableTokenV2
* @dev Version 2 of a token to show upgradeability using unstructured storage.
*/
contract UnstructuredUpgradeableTokenV2 is UnstructuredUpgradeableTokenV1 {
  
  event NewStateAdded(string newStateVariable);

  function addNewState() public {
    super.addNewState();
    emit NewStateAdded("newStateVariable");
  }
  function getNewState() public view returns(string) {
    return newStateVariable;
  }
  function funcThatV2ShouldDeprecate() public pure returns(string) {
    return "V1 func of same name has been deprecated";
  }

 
}