pragma solidity ^0.4.24;
import "./VersionRegistry.sol";
import "../EIP820/EIP820Registry.sol";
import "../EIP820/IEIP820Registry.sol";
import "../ownership/UnstructuredOwnable.sol";
import "./IVersionRegistry.sol";


/// @title ContractRegistryBase
/// @dev defines the base registry function sets for future versions to inherit from
contract ContractRegistryBase is UnstructuredOwnable, VersionRegistry, EIP820Registry, IVersionRegistry { 
  //todo does UnstructuredOwnable inheritance position matter? --^

  event Initialized(address owner);
  
  bool internal _initialized;
  address proxyAddr;
  /**
   * @dev Throws if called by any account other than the owner unless it has never been initialized.
   */
   //todo is this safe? 
  modifier onlyOwnerOrUnitialized() {
    if(_initialized == true) {
      require(msg.sender == owner());
    }
    else {
      initialize(msg.sender);
    }
    _;
  }

  //todo onlyowner?
  function initialize(address owner) public {
    require(_initialized != true);
    //todo register interfaces using eip820
    setOwner(owner);
    _initialized = true;
    emit Initialized(owner);
  }


  //todo BEFORE LAUNCH: onlyOwner! <-- needs to be the addr of the proxy as thats the one who sends the tx
  function setVersion(
    string contractName, 
    address proxyAddress, 
    string versionName, 
    address newImplementation
  ) public  {
    _setVersion(
      contractName, 
      proxyAddress, 
      versionName, 
      newImplementation
    );
  }

}
