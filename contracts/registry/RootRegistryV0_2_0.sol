pragma solidity ^0.4.24;
import "./ContractRegistryBase.sol";

/**
  @title RootRegistryV0_2_0: Keeps track of the latest version of the contract registry
  @dev Used to keep track of the MultiAdmin, MultiSigWallet, and Contract Registry. This
       is the address that ENS resolves to. Note, this contract contains updates since 0_2_0 migration that need to
       be migrated at some point (branch jaycen-reason-strings)
*/
contract RootRegistryV0_2_0 is ContractRegistryBase {

  constructor() public ContractRegistryBase() { }

}
