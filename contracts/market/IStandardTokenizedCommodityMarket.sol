pragma solidity ^0.4.24;

interface IFifoTokenizedCommodityMarket {
  function getEarliestSale() public view returns (uint, uint);
}