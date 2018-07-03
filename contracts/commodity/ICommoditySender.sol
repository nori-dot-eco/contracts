pragma solidity ^0.4.24;

interface ICommoditySender {
  function commodityToSend(
    address operator,
    address from,
    address to,
    uint id,
    bytes userData,
    bytes operatorData
  ) public;
}