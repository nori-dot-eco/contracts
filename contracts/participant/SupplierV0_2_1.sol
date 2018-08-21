pragma solidity ^0.4.24;

// import "../EIP820/EIP820Implementer.sol";
// import "../EIP820/IEIP820Implementer.sol";
import "./IParticipant.sol";
import "./ISupplier.sol";
import "./ParticipantV0_2_1.sol";


contract SupplierV0_2_1 is ParticipantV0_2_1, ISupplier {
  mapping (address => bool) public suppliers;
  mapping(bytes32 =>  mapping(address => bool)) public allowedInterfaces;


  constructor() ParticipantV0_2_1() public { }

  function initialize(address _eip820RegistryAddr, address _participantRegistry, address _owner) public {
    super.initialize(_eip820RegistryAddr, _participantRegistry, _owner);
    toggleParticipantType(true);
    setInterfaceImplementation("ISupplier", this);
  }


  function canImplementInterfaceForAddress(address, bytes32) public view returns(bytes32) {
    return ERC820_ACCEPT_MAGIC;
  }

  function isAllowed(address _ifaceImpAddr, string ifaceLabel) public returns (bool) {
    // supplier participant is enabled
    require(
      _isAllowed(this, "Supplier"),
      "The supplier identity is not currently allowed to be used"
    );
    // sender is defined in suppliers
    require(
      suppliers[msg.sender] == true,
      "You must be a white-listed supplier to use this identity"
    );
    // that the permission for the requested interface is enabled
    require(
      allowedInterfaces[keccak256(abi.encodePacked(ifaceLabel))][_ifaceImpAddr],
      "The specified interface is not currently allowed to be used"
    );
    return true;
  }

  /// @dev dynamic function (name + params) forwarder
  /// @dev example: forward(CRC, 0, 'Minting Data Here', ISomeInterface)
  function forward(
    address destination,
    uint value,
    bytes data,
    string ifaceLabel //todo this isnt safe, you can pass any string you want here to bypasss permissions-- look into alt
  ) public {
    address _ifaceImpAddr = interfaceAddr(destination, ifaceLabel);
    if (_ifaceImpAddr != 0) {
      require(
        isAllowed(_ifaceImpAddr, ifaceLabel) == true,
        "The specified interface is not currently allowed to be used"
      );
      _forward(destination, value, data);
    } else {
      revert("Transaction forwarding unsuccessful. Interface not supported.");
    }
    //jaycen todo all events
    //Forwarded(destination, value, data);
  }
  //todo onlyOwner
  function toggleSupplier(address _supplier, bool _toggle) public {
    suppliers[_supplier] = _toggle;
  }
  //todo onlyOwner
  function toggleParticipantType(bool _toggle) public {
    _toggleParticipantType("Supplier", this, _toggle);
  }
  //todo onlyOwner
  function toggleInterface(string _ifaceLabel, address _ifaceImpAddr, bool _toggle) public {
    address ifaceImpAddr = interfaceAddr(_ifaceImpAddr, _ifaceLabel);
    if (ifaceImpAddr != 0) {
      allowedInterfaces[keccak256(abi.encodePacked(_ifaceLabel))][ifaceImpAddr] = _toggle;
    } else {
      revert("You cannot toggle an interface for the 0 addres");
    }
  }
}