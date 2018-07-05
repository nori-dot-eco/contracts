pragma solidity ^0.4.24;
pragma experimental ABIEncoderV2; //solium-disable-line no-experimental
import "./IEIP820Implementer.sol";


contract EIP820Registry {
  bytes4 constant INVALIDID = 0xffffffff;
  bytes4 constant EIP165ID = 0x01ffc9a7;
  bytes32 constant EIP820_ACCEPT_MAGIC = keccak256("EIP820_ACCEPT_MAGIC");

  event InterfaceImplementerSet(address indexed addr, bytes32 indexed interfaceHash, address indexed implementer);
  event ManagerChanged(address indexed addr, address indexed newManager);

  modifier canManage(address addr) {
    require(getManager(addr) == msg.sender);
    _;
  }

  mapping (address => mapping(bytes32 => address)) interfaces;
  mapping (address => address) managers;
  mapping (address => mapping(bytes4 => bool)) eip165Cache;


  /// @notice Query the hash of an interface given a name
  /// @param interfaceName Name of the interfce
  function interfaceHash(string interfaceName) public pure returns(bytes32) {
    return keccak256(interfaceName);
  }

  /// @notice GetManager
  function getManager(address addr) public view returns(address) {
    // By default the manager of an address is the same address
    if (managers[addr] == 0) {
      return addr;
    } else {
      return managers[addr];
    }
  }

  /// @notice Sets an external `manager` that will be able to call `setInterfaceImplementer()`
  ///  on behalf of the address.
  /// @param addr Address that you are defining the manager for.
  /// @param newManager The address of the manager for the `addr` that will replace
  ///  the old one.  Set to 0x0 if you want to remove the manager.
  function setManager(address addr, address newManager) public canManage(addr) {
    managers[addr] = newManager == addr ? 0 : newManager;
    emit ManagerChanged(addr, newManager);
  }

  /// @notice Query if an address implements an interface and thru which contract
  /// @param addr Address that is being queried for the implementation of an interface
  /// @param iHash SHA3 of the name of the interface as a string
  ///  Example `web3.utils.sha3('EIP777Token`')`
  /// @return The address of the contract that implements a specific interface
  ///  or 0x0 if `addr` does not implement this interface
  function getInterfaceImplementer(address addr, bytes32 iHash) view public returns (address) {
    if (isEIP165Interface(iHash)) {
      bytes4 i165Hash = bytes4(iHash);
      return eip165InterfaceSupported(addr, i165Hash) ? addr : 0;
    }
    return interfaces[addr][iHash];
  }

  /// @notice Sets the contract that will handle a specific interface; only
  ///  the address itself or a `manager` defined for that address can set it
  /// @param addr Address that you want to define the interface for
  /// @param iHash SHA3 of the name of the interface as a string
  ///  For example `web3.utils.sha3('Ieip777')` for the Ieip777
  function setInterfaceImplementer(address addr, bytes32 iHash, address implementer) public canManage(addr) {
    require(!isEIP165Interface(iHash));
    if ((implementer != 0) && (implementer!=msg.sender)) {
      require(IEIP820Implementer(implementer).canImplementInterfaceForAddress(addr, iHash) == EIP820_ACCEPT_MAGIC);
    }
    interfaces[addr][iHash] = implementer;
    emit InterfaceImplementerSet(addr, iHash, implementer);
  }


/// EIP165 Specific

  function isEIP165Interface(bytes32 iHash) internal pure returns (bool) {
    return iHash & 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF == 0;
  }

  function eip165InterfaceSupported(address _contract, bytes4 _interfaceId) view public returns (bool) {
    if (!eip165Cache[_contract][_interfaceId]) {
      eip165UpdateCache(_contract, _interfaceId);
    }
    return interfaces[_contract][_interfaceId] != 0;
  }

  function eip165UpdateCache(address _contract, bytes4 _interfaceId) public {
    interfaces[_contract][_interfaceId] = eip165InterfaceSupported_NoCache(_contract, _interfaceId) ? _contract : 0;
    eip165Cache[_contract][_interfaceId] = true;
  }

  function eip165InterfaceSupported_NoCache(address _contract, bytes4 _interfaceId) public view returns (bool) {
    uint256 success;
    uint256 result;

    (success, result) = noThrowCall(_contract, EIP165ID);
    if ((success==0)||(result==0)) {
      return false;
    }

    (success, result) = noThrowCall(_contract, INVALIDID);
    if ((success==0)||(result!=0)) {
      return false;
    }

    (success, result) = noThrowCall(_contract, _interfaceId);
    if ((success==1)&&(result==1)) {
      return true;
    }
    return false;
  }

  function noThrowCall(address _contract, bytes4 _interfaceId) view internal returns (uint256 success, uint256 result) {
    bytes4 eip165ID = EIP165ID;

    assembly { // solium-disable-line security/no-inline-assembly
        let x := mload(0x40)         // Find empty storage location using "free memory pointer"
        mstore(x, eip165ID)        // Place signature at begining of empty storage
        mstore(add(x, 0x04), _interfaceId) // Place first argument directly next to signature

        success := staticcall(
                  30000,     // 30k gas
                  _contract,   // To addr
                  x,       // Inputs are stored at location x
                  0x08,      // Inputs are 8 bytes long
                  x,       // Store output over input (saves space)
                  0x20)      // Outputs are 32 bytes long

        result := mload(x)         // Load the result
    }
  }
}
