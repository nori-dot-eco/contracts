pragma solidity ^0.4.24;


/**
* @title UnstructuredUpgradeableTokenV0_4_0
* @dev Version 3 of a token to show upgradeability using unstructured storage.
* What happens when you create a contract without inheritance, and without calling
* the initialize function properly, is that you can end up with variables/state
* which are misaligned with the proxy delegating its call. This contract shows an
* example of Upgrading a contract, losing access (kind of) to state, but the operator
* can just upgrade to a diff version that properly inherits/inits, and they will regain access
* to the state.
*/
contract UnstructuredUpgradeableTokenV0_4_0  {

  uint256 public mTotalSupply;
  mapping(address => uint256) private mBalances;

  constructor(
    string, // _name,
    string, // _symbol,
    uint256, // _granularity,
    address[] // _defaultOperators
  ) public {  }

  function theOnlyFunction() public pure returns(string) {
    //rather, the only one that will return anything that is not just garbage
    // likely pointing to the wrong storage loc
    return "the only function";
  }
  function checkStateNotPreserved() public view returns(uint256) {
    return mTotalSupply;
  }
  function balanceOf(address _tokenHolder) public view returns (uint256) {
    return mBalances[_tokenHolder];
  }

}