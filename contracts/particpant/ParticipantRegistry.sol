pragma solidity ^0.4.18;
import "../EIP820/EIP820Implementer.sol";
import "../EIP820/IEIP820Implementer.sol";
import "./IParticipantRegistry.sol";

// DEPRECATED : leaving name unchange until upgrades are finished
contract ParticipantRegistry is EIP820Implementer, IEIP820Implementer, IParticipantRegistry {
    // particpant type at address to enabled
    mapping (bytes32 => mapping(address => bool)) public participantTypes;
    // todo jaycen add per function permission

    function ParticipantRegistry (address _eip820RegistryAddr) public { 
        setIntrospectionRegistry(_eip820RegistryAddr);
        setInterfaceImplementation("IParticipantRegistry", this);
    }

    function canImplementInterfaceForAddress(address addr, bytes32 interfaceHash) public view returns(bytes32) {
        return EIP820_ACCEPT_MAGIC;
    }

    function isAllowed(address _ifaceImpAddr, string ifaceLabel) public returns (bool) {
        return (participantTypes[keccak256(ifaceLabel)][_ifaceImpAddr] == true);
    }

    function toggleParticipantType(string _participantType, address _impAddress, bool _toggle) public {
        participantTypes[keccak256(_participantType)][_impAddress] = _toggle;
    }
}