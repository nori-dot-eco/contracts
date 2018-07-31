pragma solidity ^0.4.18;

interface ICommodityRecipient {
  function commodityReceived(
    address operator,
    address from,
    address to,
    uint256 tokenId,
    bytes userData,
    bytes operatorData
  ) public;
}
