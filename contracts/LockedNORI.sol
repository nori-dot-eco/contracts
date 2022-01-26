// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/presets/ERC20PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";
import "./NORI.sol";
import "./ScheduleUtils.sol";

contract LockedNORI is ERC777Upgradeable, ERC20PresetMinterPauserUpgradeable, ERC20WrapperUpgradeable {
  using ScheduleUtils for ScheduleUtils.Schedule;

  event TokenGrantCreated(
    address indexed recipient,
    uint256 amount,
    uint256 startTime,
    uint256 vestEndTime,
    uint256 unlockEndTime
  );

  struct TokenGrant {
    ScheduleUtils.Schedule vestingSchedule;
    ScheduleUtils.Schedule lockupSchedule;
    uint256 grantAmount;
    uint256 claimedAmount;
    bool exists;
  }

  bytes32 public constant TOKEN_GRANTER_ROLE = keccak256("TOKEN_GRANTER_ROLE");

  mapping(address => TokenGrant) grants;

  function initialize(IERC777Upgradeable noriAddress) public initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __ERC20Burnable_init_unchained();
    __Pausable_init_unchained();
    __ERC20Pausable_init_unchained();
    __ERC20PresetMinterPauser_init_unchained("Locked NORI", "lNORI");
    __ERC20Wrapper_init_unchained(IERC20Upgradeable(address(noriAddress)));
    __ERC777_init_unchained("Locked NORI", "lNORI", new address[](0));
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
  }

  /**
   * @dev grantTo: Sets up an unlock schedule for recipient.
   * Tokens must be wrapped in the name of the recipient separately using `depositFor`.
   * This allows us to start the unlock schedule running for a recipient who may
   * not yet have vested into all of their granted tokens.
   */
  function grantTo(
    address recipient,
    uint256 amount,
    uint256 startTime,
    uint256 vestEndTime,
    uint256 unlockEndTime,
    uint256 cliff1Time,
    uint256 cliff2Time,
    uint256 vestCliff1Amount,
    uint256 vestCliff2Amount,
    uint256 unlockCliff1Amount,
    uint256 unlockCliff2Amount
  ) external onlyRole(TOKEN_GRANTER_ROLE) whenNotPaused {
    require(
      address(recipient) != address(0),
      "Recipient cannot be zero address"
    );
    require(super.balanceOf(recipient) == 0, "Recipient has remaining tokens");

    depositFor(recipient, amount);

    TokenGrant storage grant = grants[recipient];
    grant.grantAmount = amount;
    grant.exists = true;
    grant.vestingSchedule.totalAmount = amount;
    grant.vestingSchedule.startTime = startTime;
    grant.vestingSchedule.endTime = vestEndTime;
    // grant.vestingSchedule.addCliff(cliff1Time, vestCliff1Amount);
    // grant.vestingSchedule.addCliff(cliff2Time, vestCliff2Amount);

    grant.lockupSchedule.totalAmount = amount;
    grant.lockupSchedule.startTime = startTime;
    grant.lockupSchedule.endTime = vestEndTime;
    // grant.lockupSchedule.addCliff(cliff1Time, unlockCliff1Amount);
    // grant.lockupSchedule.addCliff(cliff2Time, unlockCliff2Amount);

    emit TokenGrantCreated(
      recipient,
      amount,
      startTime,
      vestEndTime,
      unlockEndTime
    );
  }

  function depositedBalanceOf(address account) public view returns (uint256) {
    return super.balanceOf(account);
  }

  function totalGrantAmount(address account) public view returns (uint256) {
    TokenGrant storage grant = grants[account];
    return grant.grantAmount;
  }

  function vestedBalanceOf(address account) public view returns (uint256) {
    TokenGrant storage grant = grants[account];
    if (grant.exists) {
      // Past the end date user can claim any remaining wrapped tokens
      return
        grant.vestingSchedule.availableAmount(block.timestamp) -
        grant.claimedAmount;
    }
    return depositedBalanceOf(account);
  }

  function unlockedBalanceOf(address account) public view returns (uint256) {
    TokenGrant storage grant = grants[account];
    if (grant.exists) {
      // Past the end date user can claim any remaining wrapped tokens
      // TODO can't be larger than vested amount
      return
        grant.lockupSchedule.availableAmount(block.timestamp) -
        grant.claimedAmount;
    }
    return depositedBalanceOf(account);
  }

  function balanceOf(address account) public view override(ERC20Upgradeable, ERC777Upgradeable) returns (uint256) {
    return unlockedBalanceOf(account);
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override(ERC20PresetMinterPauserUpgradeable, ERC20Upgradeable) {
    if (to == address(0)) {
      uint256 availableBalance = balanceOf(from);
      uint256 wrappedBalance = super.balanceOf(from);
      console.log(
        "amount: %d  available: %d  wrapped: %d",
        amount,
        availableBalance,
        wrappedBalance
      );
      require(amount <= availableBalance, "Withdrawl amount unavailable");
    }
    super._beforeTokenTransfer(from, to, amount);
  }

  function _afterTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal override {
    if (to == address(0)) {
      TokenGrant storage grant = grants[from];
      grant.claimedAmount += amount;
    }
    super._afterTokenTransfer(from, to, amount);
  }

  function _approve(
    address holder,
    address spender,
    uint256 value
  ) internal virtual override(ERC20Upgradeable, ERC777Upgradeable) {
    ERC777Upgradeable._approve(holder, spender, value);
  }

  function allowance(address holder, address spender) public view virtual override(ERC20Upgradeable, ERC777Upgradeable) returns (uint256) {
    return ERC777Upgradeable.allowance(holder, spender);
  }

  function approve(address spender, uint256 value) public virtual override(ERC20Upgradeable, ERC777Upgradeable) returns (bool) {
    return ERC777Upgradeable.approve(spender, value);
  }

  function decimals() public pure virtual override(ERC20Upgradeable, ERC777Upgradeable) returns (uint8) {
    return ERC777Upgradeable.decimals();
  }

  function name() public view virtual override(ERC20Upgradeable, ERC777Upgradeable) returns (string memory) {
    return ERC777Upgradeable.name();
  }

  function symbol() public view virtual override(ERC20Upgradeable, ERC777Upgradeable) returns (string memory){
    return ERC777Upgradeable.symbol();
  }

  function totalSupply() public view virtual override(ERC20Upgradeable, ERC777Upgradeable) returns (uint256) {
    return ERC777Upgradeable.totalSupply();
  }

  function transfer(address recipient, uint256 amount) public virtual override(ERC20Upgradeable, ERC777Upgradeable) returns (bool) {
    return ERC777Upgradeable.transfer(recipient, amount);
  }

  function transferFrom(
    address holder,
    address recipient,
    uint256 amount
  ) public virtual override(ERC20Upgradeable, ERC777Upgradeable) returns (bool) {
    return ERC777Upgradeable.transferFrom(holder, recipient, amount);
  }
}