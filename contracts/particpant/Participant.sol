pragma solidity ^0.4.18;
import "../EIP820/DEPRECATEDEIP820Implementer.sol";
import "../EIP820/IEIP820Implementer.sol";
import "./IParticipant.sol";
import "./IParticipantRegistry.sol";


contract Participant is DEPRECATEDEIP820Implementer, IEIP820Implementer, IParticipant {
    IParticipantRegistry public participantRegistry;

    function Participant (address _participantRegistry, address _eip820RegistryAddr) DEPRECATEDEIP820Implementer(_eip820RegistryAddr) public { 
        setParticipantRegistry (_participantRegistry);
        setInterfaceImplementation("IParticipant", this);
    }

    function canImplementInterfaceForAddress(address addr, bytes32 interfaceHash) public view returns(bytes32) {
        return EIP820_ACCEPT_MAGIC;
    }

    function setParticipantRegistry (address _participantRegistry) public {
        participantRegistry = IParticipantRegistry(_participantRegistry);
    }

    function getParticipantRegistry() public returns(address) {
        return participantRegistry;
    }

    function _isAllowed(address _ifaceImpAddr, string ifaceLabel) internal returns (bool) {
        return participantRegistry.isAllowed(_ifaceImpAddr, ifaceLabel);
    }

    function _forward(address destination, uint value, bytes data) internal {
        require(_executeCall(destination, value, data));
    }
    
    function _executeCall(address to, uint256 value, bytes data) private returns (bool success) {
        assembly {
            success := call(gas, to, value, add(data, 0x20), mload(data), 0, 0)
        }
    }

    function _toggleParticipantType(string _participantType, address _participantTypeAddr, bool _toggle) internal {
        participantRegistry.toggleParticipantType(_participantType, _participantTypeAddr, _toggle);
    }

}