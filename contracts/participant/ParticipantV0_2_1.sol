pragma solidity ^0.4.24;
import "../contrib/EIP/eip820/contracts/ERC820Implementer.sol";
import "../contrib/EIP/eip820/contracts/ERC820ImplementerInterface.sol";
import "./IParticipant.sol";
import "./IParticipantRegistry.sol";
import "../ownership/UnstructuredOwnable.sol";
import "../registry/IContractRegistry.sol";

contract ParticipantV0_2_1 is UnstructuredOwnable, ERC820Implementer, ERC820ImplementerInterface, IParticipant {
  IParticipantRegistry public participantRegistry;
  bool internal _initialized;
  IContractRegistry public contractRegistry;

  constructor () public { }

  function initialize(address _contractRegistryAddr, address _participantRegistry, address _owner) public {
    require(_initialized != true, "You can only initialize this contract once");
    setOwner(_owner);
    contractRegistry = IContractRegistry(_contractRegistryAddr); //todo: get this from ENS or ERC820 somehow
    erc820Registry = ERC820Registry(0xa691627805d5FAE718381ED95E04d00E20a1fea6);
    setParticipantRegistry (_participantRegistry); //todo get this from the contract registry or erc820
    setInterfaceImplementation("IParticipant", this);
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
    require(_executeCall(destination, value, data), "'executeCall' failed");
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