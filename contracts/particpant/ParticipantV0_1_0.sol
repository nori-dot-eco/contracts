pragma solidity ^0.4.24;
import "../EIP820/EIP820Implementer.sol";
import "../EIP820/IEIP820Implementer.sol";
import "./IParticipant.sol";
import "./IParticipantRegistry.sol";
import "../ownership/UnstructuredOwnable.sol";


contract ParticipantV0_1_0 is UnstructuredOwnable, EIP820Implementer, IEIP820Implementer, IParticipant {
  IParticipantRegistry public participantRegistry;
  bool internal _initialized;
  
  constructor () public { }

  function initialize(address _eip820RegistryAddr, address _participantRegistry, address _owner) public {
    require(_initialized != true);
    setOwner(_owner);
    setIntrospectionRegistry(_eip820RegistryAddr);
    setParticipantRegistry (_participantRegistry);
    setInterfaceImplementation("IParticipant", this);
    _initialized = true;
  }
  
  function canImplementInterfaceForAddress(address, bytes32) public view returns(bytes32) {
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
    assembly { // solium-disable-line security/no-inline-assembly
      success := call(gas, to, value, add(data, 0x20), mload(data), 0, 0)
    }
  }
  
  function _toggleParticipantType(string _participantType, address _participantTypeAddr, bool _toggle) internal {
    participantRegistry.toggleParticipantType(_participantType, _participantTypeAddr, _toggle);
  }

}