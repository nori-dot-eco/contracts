// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "./ERC20Preset.sol";

/**
 * @title The NORI token (wrapped as bpNORI) on Polygon.
 *
 * @author Nori Inc.
 *
 * @notice The NORI (bpNORI) token on Polygon is a wrapped version of the NORI token on Ethereum.
 *
 * @dev This token is a layer-2 (L2) equivalent of the respective layer-1 (L1) NORI contract with extended
 * functionality to enable deposits and withdrawals between L1 and L2.
 *
 * ##### Behaviors and features:
 *
 * ###### Deposits
 *
 * A user can bridge their L1 Ethereum NORI in return for layer-2 bpNORI by depositing NORI on the L1
 * bridge. The user will receive an equivalent amount of bpNORI on L2. Deposits on L1 do not change the toal supply of
 * NORI and instead escrow their tokens to the bridge address.
 *
 * ###### Withdrawals
 *
 * A user can withdraw their L2 bpNORI in return for L1 NORI by burning their bpNORI on L2 and submitting a withdrawal.
 * A withdraw decreases the L2 supply of bpNORI in a value equivalent to the amount withdrawn. The user will receive
 * NORI on L1 in a value equivalent to the amount withdrawn.
 *
 * ##### Inherits:
 *
 * - [ERC20Preset](../docs/ERC20Preset.md)
 */
contract BridgedPolygonNORI is ERC20Preset {
  /**
   * @notice A role conferring the ability to mint/deposit bpNORI on Polygon.
   */
  bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

  /**
   * @notice Locks the contract, preventing any future re-initialization.
   * @dev See more [here](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable-_disableInitializers--).
   */
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Deposit NORI on the root chain (Ethereum) to the child chain (Polygon) as bpNORI.
   * @dev A deposit of NORI on the root chain (Ethereum) will trigger this function and mint bpNORI on the child chain
   * (Polygon). This function can only be called by the ChildChainManager. See [here](
   * https://docs.polygon.technology/docs/develop/ethereum-polygon/pos/mapping-assets/) for more.
   * @param user The address of the user which deposited on the root chain (Ethereum) and which is receiving the bpNORI.
   * @param depositData The ABI encoded deposit amount.
   */
  function deposit(address user, bytes calldata depositData)
    external
    onlyRole(DEPOSITOR_ROLE)
  {
    uint256 amount = abi.decode(depositData, (uint256));
    _mint(user, amount);
  }

  /**
   * @notice Withdraw bpNORI tokens from the child chain (Polygon) to the root chain (Ethereum) as NORI.
   * @dev Burns user's tokens on polygon. This transaction will be verified when exiting on root chain. See [here](
   * https://docs.polygon.technology/docs/develop/ethereum-polygon/pos/mapping-assets/) for more.
   * @param amount The amount of tokens to withdraw from polygon as NORI on layer one.
   */
  function withdraw(uint256 amount) external {
    _burn(_msgSender(), amount);
  }

  /**
   * @notice Initialize the BridgedPolygonNORI contract.
   * @param childChainManagerProxy the address of the child chain manager proxy which can mint/deposit bpNORI on L2.
   */
  function initialize(address childChainManagerProxy) external initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __EIP712_init_unchained("NORI", "1");
    __ERC20_init_unchained("NORI", "NORI");
    __ERC20Permit_init_unchained("NORI");
    __ERC20Burnable_init_unchained();
    __ERC20Preset_init_unchained();
    __Multicall_init_unchained();
    _grantRole(DEPOSITOR_ROLE, childChainManagerProxy);
  }
}
