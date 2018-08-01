pragma solidity ^0.4.24;
import "../commodity/SplittableCommodity.sol";
import "../commodity/VerifiableCommodity.sol";

// This version REPLACES (rather than upgrades) 0_1_0. It changes core
// functionality in balance and allowance retirevals
contract CRCV0_2_1 is SplittableCommodity, VerifiableCommodity {

  constructor() public BasicCommodity () { }

}
