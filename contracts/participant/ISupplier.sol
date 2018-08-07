pragma solidity ^0.4.24;

interface ISupplier {
    function isAllowed(address _ifaceImpAddr, string ifaceLabel) public returns (bool);
    function forward(
      address destination,
      uint value,
      bytes data,
      string ifaceLabel
    ) public;
    function toggleSupplier(address _supplier, bool _toggle) public;
    function toggleParticipantType(bool _toggle) public;
    function toggleInterface(string _ifaceLabel, address _ifaceImpAddr, bool _toggle) public;
}