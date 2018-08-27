pragma solidity ^0.4.24;

interface IParticipant {
    function setParticipantRegistry (address participantRegistry) public;
    function getParticipantRegistry() public view returns(address);
}