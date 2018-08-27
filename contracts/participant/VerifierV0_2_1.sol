pragma solidity ^0.4.24;

import "./IParticipant.sol";
import "./IVerifier.sol";
import "./ParticipantV0_2_1.sol";


contract VerifierV0_2_1 is ParticipantV0_2_1, IVerifier {
  mapping (address => bool) public verifiers;
  mapping(bytes32 =>  mapping(address => bool)) public allowedInterfaces;


  constructor() ParticipantV0_2_1() public { }

  function initialize(address _eip820RegistryAddr, address _participantRegistry, address _owner) public {
    super.initialize(_eip820RegistryAddr, _participantRegistry, _owner);
    setInterfaceImplementation("IVerifier", this);
    participantRegistry.toggleParticipantType("Verifier", this, true);
  }

  function canImplementInterfaceForAddress(address, bytes32) public view returns(bytes32) {
    return ERC820_ACCEPT_MAGIC;
  }

  function isAllowed(address _ifaceImpAddr, string ifaceLabel) public returns (bool) {
    // verifier participant is enabled
    require(
      _isAllowed(this, "Verifier"),
      "The verifier is not currently allowed to be used"
    );
    // sender is defined in verifiers
    require(verifiers[msg.sender] == true, "You are not a white-listed verifier");
    // that the permission for the requested interface is enabled
    require(
      allowedInterfaces[keccak256(abi.encodePacked(ifaceLabel))][_ifaceImpAddr],
      "The specified interface is not currently allowed"
    );
    return true;
  }

  /// @dev dynamic function (name + params) forwarder
  /// @dev example: forward(CRC, 0, 'Minting Data Here', ISomeInterface)
  function forward(
    address destination,
    uint value,
    bytes data,
    string ifaceLabel
  ) public whenNotPaused {
    address _ifaceImpAddr = interfaceAddr(destination, ifaceLabel);
    if (_ifaceImpAddr != 0) {
      require(isAllowed(_ifaceImpAddr, ifaceLabel) == true, "The specified interface is not currently allowed");
      _forward(destination, value, data);
    } else {
      revert("Forwarding failed");
    }
    //jaycen todo all events
    //Forwarded(destination, value, data);
  }

  function toggleVerifier(address _verifier, bool _toggle) public onlyOwner {
    verifiers[_verifier] = _toggle;
  }

  function toggleParticipantType(bool _toggle) public onlyOwner {
    _toggleParticipantType("Verifier", this, _toggle);
  }

  function toggleInterface(string _ifaceLabel, address _ifaceImpAddr, bool _toggle) public onlyOwner {
    address ifaceImpAddr = interfaceAddr(_ifaceImpAddr, _ifaceLabel);
    if (ifaceImpAddr != 0) {
      allowedInterfaces[keccak256(abi.encodePacked(_ifaceLabel))][ifaceImpAddr] = _toggle;
    } else {
      revert("You cannot toggle a 0 address interface");
    }
  }
}
