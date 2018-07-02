pragma solidity ^0.4.23;
import "./ContractRegistryBase.sol";


/// @title RegistrysRegistryV0_1_0 
/// @dev keeps track of the latest version of the registry
///  this registry keeps track of all upgraded registries and their versions
///  you can use it to see the full history of registry implementation addresses,
///  but should not be used for anything else (including to get the current registry addr)
contract RegistrysRegistryV0_1_0 is ContractRegistryBase {

  constructor() public ContractRegistryBase() {}

}
