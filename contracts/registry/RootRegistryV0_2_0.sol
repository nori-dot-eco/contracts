pragma solidity ^0.4.24;
import "./ContractRegistryBase.sol";

// Note, this contract contains updates since 0_2_0 migration that need to be migrated at some point (jaycen-reason-strings)
/// @title RootRegistryV0_2_0
/// @dev keeps track of the latest version of the registry
///  this registry keeps track of all upgraded registries and their versions
///  you can use it to see the full history of registry implementation addresses,
///  but should not be used for anything else (including to get the current registry addr)
contract RootRegistryV0_2_0 is ContractRegistryBase {

  constructor() public ContractRegistryBase() {}

}
