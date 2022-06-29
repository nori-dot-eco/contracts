// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";

import "hardhat/console.sol"; // todo rm

/**
 * @title ERC1155PresetPausableNonTransferrable
 */
abstract contract ERC1155PresetPausableNonTransferrable is
  ERC1155SupplyUpgradeable,
  ERC1155PresetMinterPauserUpgradeable
{
  error ForbiddenTransferAfterMinting();

  /**
   * @notice Role conferring operator permissions
   *
   * @dev This role is assigned to operators which can transfer certificates from an address to another by bypassing
   * the `_beforeTokenTransfer` hook.
   */
  bytes32 public constant CERTIFICATE_OPERATOR_ROLE =
    keccak256("CERTIFICATE_OPERATOR_ROLE");

  // slither-disable-next-line naming-convention, solhint-disable-next-line func-name-mixedcase
  function __ERC1155PresetPausableNonTransferrable_init_unchained()
    internal
    onlyInitializing
  {
    _grantRole(CERTIFICATE_OPERATOR_ROLE, _msgSender());
  }

  // slither-disable-next-line naming-convention, solhint-disable-next-line func-name-mixedcase
  function __ERC1155PresetPausableNonTransferrable_init(string memory uri_)
    internal
    onlyInitializing
  {
    // todo verify all inherited initializers are called
    __ERC1155_init_unchained(uri_);
    __Pausable_init_unchained();
    __ERC1155PresetMinterPauser_init_unchained(uri_);
    __ERC1155PresetPausableNonTransferrable_init_unchained();
  }

  /**
   * @notice A hook that is called before all transfers and is used to disallow non-minting and non-burning transfers
   * as well as transfers invoked by addresses which do not have the `CERTIFICATE_OPERATOR_ROLE` role.
   *
   * @dev Follows the rules of hooks defined [here](
   *  https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks).
   *
   * ##### Requirements:
   *
   * - The rules of `ERC1155PausableUpgradeable._beforeTokenTransfer` are enforced (which include pausability rules)
   * - The rules of `ERC1155SupplyUpgradeable._beforeTokenTransfer` are enforced (which include minting/burning rules)
   * - The operation reverts with `ForbiddenTransferAfterMinting` if none of the following are met:
   *  - The operation is minting.
   *  - The operation is burning.
   *  - The operation is transferring and the operator has the `CERTIFICATE_OPERATOR_ROLE` role.
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
  {
    bool isNotMinting = !(from == address(0));
    bool isNotBurning = !(to == address(0));
    bool missingOperatorRole = !hasRole(CERTIFICATE_OPERATOR_ROLE, operator);
    if (isNotMinting && isNotBurning && missingOperatorRole) {
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
