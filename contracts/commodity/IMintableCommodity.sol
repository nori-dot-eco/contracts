pragma solidity ^0.4.24;

interface IMintableCommodity {
  function mint(
    address _to, 
    bytes _operatorData, 
    uint256 _value, 
    bytes _misc
  ) public returns(uint64);
}
    
