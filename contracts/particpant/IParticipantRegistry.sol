pragma solidity ^0.4.18;

interface IParticipantRegistry {
    function isAllowed(address _ifaceImpAddr, string ifaceLabel) public returns (bool);
    function toggleParticipantType(string _participantType, address _impAddress, bool _toggle) public;
}