pragma solidity ^0.4.24;
import "../EIP820/EIP820Implementer.sol";
import "../EIP820/IEIP820Implementer.sol";
import "./IParticipantRegistry.sol";
import "../ownership/UnstructuredOwnable.sol";

contract ParticipantRegistryV0_1_2 is UnstructuredOwnable, EIP820Implementer, IEIP820Implementer, IParticipantRegistry {
  // participant type at address to enabled
  mapping (bytes32 => mapping(address => bool)) public participantTypes;
  // todo jaycen add per function permission

  bool internal _initialized;

  constructor () public { }

  function initialize(address _eip820RegistryAddr, address owner) public {
    require(_initialized != true, "You can only initialize this contract once");
    setOwner(owner);
    setIntrospectionRegistry(_eip820RegistryAddr);
    setInterfaceImplementation("IParticipantRegistry", this);
    _initialized = true;
  }

  /**
    @dev returns the current initalization status
  */
  function initialized() public view returns(bool) {
    return _initialized;
  }

  function canImplementInterfaceForAddress(address, bytes32) public view returns(bytes32) {
    return EIP820_ACCEPT_MAGIC;
  }

  function isAllowed(address _ifaceImpAddr, string ifaceLabel) public returns (bool) {
    return (participantTypes[keccak256(abi.encodePacked(ifaceLabel))][_ifaceImpAddr] == true);
  }

  function toggleParticipantType(string _participantType, address _impAddress, bool _toggle) public {
    participantTypes[keccak256(abi.encodePacked(_participantType))][_impAddress] = _toggle;
  }
}