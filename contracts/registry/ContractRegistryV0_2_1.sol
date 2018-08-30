pragma solidity ^0.4.24;
import "./ContractRegistryBase.sol";


/**
  @title ContractRegistryV0_2_1: Keeps track of the latest version of all contracts
  @dev This contract is not currently used to keep track of the MultiAdmin, MultiSigWallet
       or the contract registry itself
*/
contract ContractRegistryV0_2_1 is ContractRegistryBase {

  constructor() public ContractRegistryBase() {}

  /**
    @notice The contract initializer
    @dev Always use this function to set the contract state after constructing since when using
         an upgradeable proxy mechanism, state set inside the constructor will not persist to the
         proxy.
    @param _owner The owner of the contract
  */
  function initialize(address _owner) public {
    super.initialize(_owner);
    //setInterfaceImplementation("IContractRegistry", this);
  }


}
