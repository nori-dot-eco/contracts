pragma solidity ^0.4.24;
import "../contrib/EIP/eip820/contracts/ERC820Implementer.sol";
import "../contrib/EIP/eip820/contracts/ERC820ImplementerInterface.sol";
import "./IParticipantRegistry.sol";
import "../lifecycle/Pausable.sol";
import "../registry/IContractRegistry.sol";

contract ParticipantRegistryV0_2_0 is Pausable, ERC820Implementer, ERC820ImplementerInterface, IParticipantRegistry {
  // participant type at address to enabled
  mapping (bytes32 => mapping(address => bool)) public participantTypes;
  // todo jaycen add per function permission

  bool internal _initialized;
  IContractRegistry public contractRegistry;

  constructor () public { }

  function initialize(address _contractRegistryAddr, address _owner) public {
    //todo emit initialize info
    require(_initialized != true, "You can only initialize this contract once");
    owner = _owner;
    contractRegistry = IContractRegistry(_contractRegistryAddr); //todo: get this from ENS or ERC820 somehow
    erc820Registry = ERC820Registry(0xa691627805d5FAE718381ED95E04d00E20a1fea6);
    setInterfaceImplementation("IParticipantRegistry", this);
    _initialized = true;
  }

  /**
    @notice Sets the contract registry address
  */
  function setContractRegistry(address _contractRegistryAddr) public onlyOwner {
    contractRegistry = IContractRegistry(_contractRegistryAddr);
  }

  /**
    @dev returns the current initialization status
  */
  function initialized() public view returns(bool) {
    return _initialized;
  }

  function canImplementInterfaceForAddress(address, bytes32) public view returns(bytes32) {
    return ERC820_ACCEPT_MAGIC;
  }

  function isAllowed(address _ifaceImpAddr, string ifaceLabel) public view returns (bool) {
    return (participantTypes[keccak256(abi.encodePacked(ifaceLabel))][_ifaceImpAddr] == true);
  }

  // todo only allow owner OR participant contracts to call this
  // (tricky since the participant.forward func exists. might
  // need to change how we call this and only call it directly
  // against this contract, so we can use onlyOwner)
  function toggleParticipantType(string _participantType, address _impAddress, bool _toggle) public {
    participantTypes[keccak256(abi.encodePacked(_participantType))][_impAddress] = _toggle;
  }
}