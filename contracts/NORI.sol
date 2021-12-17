pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

// todo restrict all functions (when not paused)
// todo restrict burning

contract NORI is ERC777Upgradeable, AccessControlEnumerableUpgradeable, PausableUpgradeable {

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  function initialize() public initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __ERC777_init_unchained("Nori", "NORI", new address[](0));
    __Pausable_init_unchained();
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(MINTER_ROLE, _msgSender());
    _setupRole(PAUSER_ROLE, _msgSender());
  }

  /**
   * @dev Creates `amount` new tokens for `account`.
   *
   * Requirements:
   *
   * - the caller must have the `MINTER_ROLE`.
   */
  function mint(
    address account,
    uint256 amount,
    bytes memory userData,
    bytes memory operatorData
  ) public {
    require(hasRole(MINTER_ROLE, _msgSender()), "NORI: must have minter role to mint");
    _mint(
      account,
      amount,
      userData,
      operatorData
    );
  }

  /**
    * @dev Pauses all token transfers.
    *
    * Requirements:
    *
    * - the caller must have the `PAUSER_ROLE`.
    */
  function pause() public {
    require(hasRole(PAUSER_ROLE, _msgSender()), "NORI: must have pauser role to pause");
    _pause();
  }

  /**
    * @dev Unpauses all token transfers.
    *
    * Requirements:
    *
    * - the caller must have the `PAUSER_ROLE`.
    */
  function unpause() public {
    require(hasRole(PAUSER_ROLE, _msgSender()), "NORI: must have pauser role to unpause");
    _unpause();
  }

  /**
    * Requirements:
    *
    * - the contract must not be paused.
    */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256 amount
  ) internal override {
    super._beforeTokenTransfer(
      operator,
      from,
      to,
      amount
    );
    require(!paused(), "ERC20Pausable: token transfer while paused");
  }
}
