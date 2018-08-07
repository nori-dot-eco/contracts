pragma solidity ^0.4.24;

interface IVerifier {
    function isAllowed(address _ifaceImpAddr, string ifaceLabel) public returns (bool);
    function forward(
      address destination,
      uint value,
      bytes data,
      string ifaceLabel
    ) public;
    function toggleVerifier(address _verifier, bool _toggle) public;
    function toggleInterface(string _ifaceLabel, address _ifaceImpAddr, bool _toggle) public;
    function toggleParticipantType(bool _toggle) public;
}