pragma solidity ^0.4.18;

interface ICommodityOperator {
  function madeOperatorForCommodity(
    address operator,
    address from,
    address to,
    uint tokenId,
    uint256 value,
    bytes userData,
    bytes operatorData
  ) public;
  
  function revokedOperatorForCommodity(
    address operator,
    address from,
    address to,
    uint tokenId,
    uint256 value,
    bytes userData,
    bytes operatorData
  ) public;
}
