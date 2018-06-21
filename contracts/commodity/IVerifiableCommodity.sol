pragma solidity ^0.4.18; // solhint-disable-line compiler-fixed

interface IVerifiableCommodity {
    function verify(uint256 commodityId, bytes verifierData, uint64 category) public;
}