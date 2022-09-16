// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "./ERC20Preset.sol";

contract BridgedPolygonNORI is ERC20Preset {
  bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
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
