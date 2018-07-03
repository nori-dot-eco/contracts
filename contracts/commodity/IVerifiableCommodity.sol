pragma solidity ^0.4.24;

interface IVerifiableCommodity {
  function verify(
    uint256 commodityId, 
    bytes verifierData, 
    uint64 category
  ) public;
}