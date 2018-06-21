pragma solidity ^0.4.18; // solhint-disable-line compiler-fixed

interface IMintableCommodity {
    function mint(address _to, bytes _operatorData, uint256 _value, bytes _misc) public returns(uint64);
}
    
