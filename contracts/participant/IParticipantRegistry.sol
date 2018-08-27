pragma solidity ^0.4.24;

interface IParticipantRegistry {
    function isAllowed(address _ifaceImpAddr, string ifaceLabel) public view returns (bool);
    function toggleParticipantType(string _participantType, address _impAddress, bool _toggle) public;
}