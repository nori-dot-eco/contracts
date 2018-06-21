pragma solidity ^0.4.18;

interface IParticipant {
    function setParticipantRegistry (address participantRegistry) public;
    function getParticipantRegistry() public returns(address);
}