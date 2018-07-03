pragma solidity ^0.4.24; 

interface ICommodityRecipient {
  function commodityReceived(
    address operator,
    address from,
    address to,
    uint tokenId,
    bytes userData,
    bytes operatorData
  ) public;
}