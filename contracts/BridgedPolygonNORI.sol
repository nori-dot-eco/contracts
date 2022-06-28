// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "./NORI.sol";

// todo check new erc 20 initializers are called
contract BridgedPolygonNORI is NORI {
  bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

  /**
   * @notice Called when token is deposited on root chain.
   * @dev Should be callable only by ChildChainManager. See [here](
   * https://docs.polygon.technology/docs/develop/ethereum-polygon/pos/mapping-assets/) for more
   * @param user The user address for whom deposit is being done.
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
   * @notice Called when user wants to withdraw tokens back to root chain.
   * @dev Burns user's tokens on polygon. This transaction will be verified when exiting on root chain. See [here](
   * https://docs.polygon.technology/docs/develop/ethereum-polygon/pos/mapping-assets/) for more
   * @param amount The amount of tokens to withdraw from polygon as NORI on layer one.
   */
  function withdraw(uint256 amount) external {
    _burn(_msgSender(), amount);
  }

  /**
   * @notice Initializes the BridgedPolygonNORI contract.
   */
  function initialize(address childChainManagerProxy) public initializer {
    __BridgedPolygonNORI_init(childChainManagerProxy);
  }

  /**
   * @notice Overrides the NORI initializer so that it reverts and is never initialized with a call to the mint
   * function.
   */
  function initialize() public override initializer {
    revert("BridgedPolygonNORI: disallowed");
  }

  /**
   * @notice Initializer variant that embeds the linearized calls to all parent initializers.
   * @dev Follows the multiple inheritance initializer rules defined [here](
   * https://docs.openzeppelin.com/contracts/3.x/upgradeable#multiple-inheritance). As a consequence,
   * calling two of these init functions can potentially initialize the same contract twice.
   */
  function __BridgedPolygonNORI_init(
    // solhint-disable-previous-line func-name-mixedcase
    address childChainManagerProxy
  ) internal onlyInitializing {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC20PresetPausablePermissioned_init_unchained();
    __ERC20_init_unchained("NORI", "NORI");
    __ERC20Permit_init_unchained("NORI");
    __NORI_init_unchained();
    __BridgedPolygonNORI_init_unchained(childChainManagerProxy);
  }

  /**
   * @notice Initializer variant that does **not** embed linearized calls to any parent initializers.
   * @dev Follows the multiple inheritance initializer rules defined [here](
   * https://docs.openzeppelin.com/contracts/3.x/upgradeable#multiple-inheritance). As a consequence,
   * calling two of these init functions can potentially initialize the same contract twice.
   */
  function __BridgedPolygonNORI_init_unchained(
    // solhint-disable-previous-line func-name-mixedcase
    address childChainManagerProxy
  ) internal onlyInitializing {
    _grantRole(DEPOSITOR_ROLE, childChainManagerProxy);
  }
}
