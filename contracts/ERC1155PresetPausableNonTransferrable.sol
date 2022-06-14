// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";

import "hardhat/console.sol"; // todo

// todo non-transferable/approveable
// todo disable other mint functions
// todo whenNotPasused
// todo can we upgrade lockedNORI with new comments? (would love to see consistency in behaviors/requirements using alpha-numerical lists)
// todo consider not inheriting pausable 1155 contract so we can use custom errors
// todo document that all things in requirements list must evaluate to true for a function
// todo setApprovalForAll should only work when called on accounts with CERTIFICATE_OPERATOR_ROLE

/**
 * @title Certificate
 */
contract ERC1155PresetPausableNonTransferrable is
  ERC1155SupplyUpgradeable,
  ERC1155PresetMinterPauserUpgradeable
{
  error ForbiddenTransferAfterMinting();

  /**
   * @notice Role conferring operator permissions
   * @dev This role is assigned to operators which can transfer certificates from an address to another by bypassing
   * the `_beforeTokenTransfer` hook.
   */
  bytes32 public constant CERTIFICATE_OPERATOR_ROLE =
    keccak256("CERTIFICATE_OPERATOR_ROLE");

  // solhint-disable-next-line func-name-mixedcase
  function __ERC1155PresetPausableNonTransferrable_init_unchained()
    internal
    onlyInitializing
  {
    _setupRole(CERTIFICATE_OPERATOR_ROLE, _msgSender());
  }

  // solhint-disable-next-line func-name-mixedcase
  function __ERC1155PresetPausableNonTransferrable_init(string memory uri)
    internal
    onlyInitializing
  {
    // todo verify all inherited initializers are called
    super.initialize(uri);
    __ERC1155PresetPausableNonTransferrable_init_unchained();
  }

  // todo consider not inheriting pausable base contract and reverting with custom error for consistency
  /**
   * @notice A hook that is called before all transfers and is used to disallow non-minting, non-burning, and transfers
   * invoked by addresses which do not have the `CERTIFICATE_OPERATOR_ROLE` role.
   *
   * @dev Follows the rules of hooks defined [here](
   *  https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks).
   *
   * ##### Requirements:
   *
   * - The contract must not be paused for the inner-logic to be invoked.
   * - If the contract is paused, the operation reverts with the string `"Pausable: paused"`.
   * - The operation reverts with `ForbiddenTransferAfterMinting` if none of the following are not met:
   *  - The operation is minting.
   *  - The operation is burning.
   *  - The operation is transferring and the operator has the `CERTIFICATE_OPERATOR_ROLE` role.
   *
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  )
    internal
    virtual
    override(ERC1155PresetMinterPauserUpgradeable, ERC1155SupplyUpgradeable)
    whenNotPaused
  {
    bool isMinting = from == address(0);
    bool isBurning = to == address(0);
    console.log("has role", hasRole(CERTIFICATE_OPERATOR_ROLE, operator));
    console.log("has role eval", !hasRole(CERTIFICATE_OPERATOR_ROLE, operator));
    if (
      !isMinting && !isBurning && !hasRole(CERTIFICATE_OPERATOR_ROLE, operator)
    ) {
      revert ForbiddenTransferAfterMinting();
    }
    return super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, ERC1155PresetMinterPauserUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
