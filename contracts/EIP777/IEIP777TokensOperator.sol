pragma solidity ^0.4.24;

interface IEIP777TokensOperator {
  function madeOperatorForTokens(
    address operator,
    address from,
    address to,
    uint256 amount,
    bytes userData,
    bytes operatorData
  ) public;
}
