pragma solidity ^0.4.24;
import "../commodity/SplittableCommodity.sol";
import "../commodity/VerifiableCommodity.sol";


//todo jaycen lookinto how we can flatten some of this inheritance
contract CRCV0_1_0 is SplittableCommodity, VerifiableCommodity {

  constructor() public BasicCommodity () { }

}
