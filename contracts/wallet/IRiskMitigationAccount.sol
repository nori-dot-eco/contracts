pragma solidity ^0.4.24;


interface IRiskMitigationAccount {
  function getRestrictedBalance(address _addressToCheck) public view returns(uint256);
  function toggleTokenReceipt(bool _toggle) public;
}