pragma solidity ^0.4.24;
import "../commodity/SplittableCommodity.sol";
import "../commodity/VerifiableCommodity.sol";

contract CRCV0_3_0 is SplittableCommodity, VerifiableCommodity {

  constructor() public BasicCommodity () { }

}
