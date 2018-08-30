pragma solidity ^0.4.24;
import "./ContractRegistryBase.sol";


/**
  @title ContractRegistryV0_3_0: Keeps track of the latest version of all contracts
  @dev This contract is not currently used to keep track of the MultiAdmin, MultiSigWallet
       or the contract registry itself
*/
contract ContractRegistryV0_3_0 is ContractRegistryBase {

  constructor() public ContractRegistryBase() {}

}
