pragma solidity ^0.4.18; // solhint-disable-line compiler-fixed

interface IEIP777TokensSender {
  function tokensToSend(
    address operator,
    address from,
    address to,
    uint amount,
    bytes userData,
    bytes operatorData
  ) public;
}
