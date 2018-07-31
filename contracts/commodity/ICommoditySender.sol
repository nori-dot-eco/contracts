pragma solidity ^0.4.18; // solhint-disable-line compiler-fixed

interface ICommoditySender {
  function commodityToSend(
    address operator,
    address from,
    address to,
    uint256 id,
    bytes userData,
    bytes operatorData
  ) public;
}
