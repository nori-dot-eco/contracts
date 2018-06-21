pragma solidity ^0.4.23;
import "../EIP777/DEPREACATEDBasic777.sol";


// to be deprecated
contract TonToken is DEPREACATEDBasic777 {

  constructor(
    string _name,
    string _symbol,
    uint256 _granularity,
    uint256 _totalSupply,
    address _eip820RegistryAddr
  ) public DEPREACATEDBasic777(
    _name,
    _symbol, 
    _granularity, 
    _totalSupply, 
    _eip820RegistryAddr
  ) {
    //Delegate constructor
  }
}