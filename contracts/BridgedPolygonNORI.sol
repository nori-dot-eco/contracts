// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./NORI.sol";

contract BridgedPolygonNORI is NORI {
  bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

  /**
   * @notice called when token is deposited on root chain
   * @dev Should be callable only by ChildChainManager
   * Should handle deposit by minting the required amount for user
   * Make sure minting is done only by this function
   * @param user user address for whom deposit is being done
   * @param depositData abi encoded amount
   */
  function deposit(address user, bytes calldata depositData)
    external
    onlyRole(DEPOSITOR_ROLE)
  {
    uint256 amount = abi.decode(depositData, (uint256));
    _mint(user, amount, depositData, "");
  }

  /**
   * @notice called when user wants to withdraw tokens back to root chain
   * @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
   * @param amount amount of tokens to withdraw
   */
  function withdraw(uint256 amount) external {
    _burn(_msgSender(), amount, "", "");
  }

  /**
   * @notice initializes the BridgedPolygonNORI contract
   */
  function initialize(address childChainManagerProxy) public initializer {
    __BridgedPolygonNORI_init(childChainManagerProxy);
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
    __ERC777PresetPausablePermissioned_init_unchained();
    __ERC777_init_unchained("NORI", "NORI", new address[](0));
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
    _setupRole(DEPOSITOR_ROLE, childChainManagerProxy); // todo try grantRole
  }
}
