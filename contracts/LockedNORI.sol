// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/presets/ERC20PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "./NORI.sol";
import {ScheduleUtils, Schedule, Cliff} from "./ScheduleUtils.sol";

/**
 * @title {ERC20Wrapper} extension implementing scheduled {NORI} token vesting + lockup.
 * @author Nori Inc.
 *
 * @notice Based on the mechanics of a wrapped ERC20/ERC777 token this contact layers in scheduled withdrawl
 * to implement *vesting* (a revocable grant) *lockup* (an irrevocable timelock on utility).
 *
 * _Vesting_ is applied in scenarios where the tokens may need to be recaptured by Nori.
 * This could either be due to an employee leaving the company before being fully vested or
 * because one of our suppliers incurs a carbon loss so their restricted (unvested in the terminology of this contract)
 * tokens need to be recaptured to mitigate the loss and make the original buyer whole by using them
 * to purchases new NRTs on their behalf.
 *
 * _Lockup_ refers to tokens that are guaranteed to be available to the grantee but are subject to a time delay
 * before they are usable / transferrable out of this smart contract.
 * This is a standard mechanism used to avoid sudden floods of liquidity in the NORI token that
 * could severely depress the price.
 *
 *
 * A _cliff_ refers to a period prior to which no tokens are vested or unlocked.
 * Cliffs are defined by a date and an amount which must is <= the overall grant amount.
 *
 * This contract supports a maximum of two distinct cliffs per grant.
 * The effect of fewer cliffs can be achieve by setting one of both cliff times
 * to the start time or end time, and/or by setting the cliff amount to zero.
 *
 * Tokens are released linearly from the latest cliff date to the end date of
 * the grant based on the block.timestamp of each block.
 *
 * Assumptions / Constraints:
 *  * A single grant per address is supported
 *  * Unlock is always at the same time or lagging vesting.
 *  * Transfer of LockedNORI under lockup is forbidden.
 *  * In absence of a grant LockedNORI functions identically to a standard wrapped token.
 */
contract LockedNORI is
  ERC777Upgradeable,
  ERC20PresetMinterPauserUpgradeable,
  IERC777RecipientUpgradeable
{
  using ScheduleUtils for Schedule;

  struct TokenGrant {
    Schedule vestingSchedule;
    Schedule lockupSchedule;
    uint256 grantAmount;
    uint256 claimedAmount;
    uint256 originalAmount;
    bool exists;
  }

  struct TokenGrantDetail {
    uint256 grantAmount;
    address recipient;
    uint256 startTime;
    uint256 vestEndTime;
    uint256 unlockEndTime;
    uint256 cliff1Time;
    uint256 cliff2Time;
    uint256 vestCliff1Amount;
    uint256 vestCliff2Amount;
    uint256 unlockCliff1Amount;
    uint256 unlockCliff2Amount;
    uint256 claimedAmount;
    uint256 originalAmount;
  }

  /**
   * @dev Grant creation parameters as passed in the `userData` parameter of {NORI}.`send`
   */
  struct CreateTokenGrantParams {
    address recipient;
    uint256 startTime;
    uint256 vestEndTime;
    uint256 unlockEndTime;
    uint256 cliff1Time;
    uint256 cliff2Time;
    uint256 vestCliff1Amount;
    uint256 vestCliff2Amount;
    uint256 unlockCliff1Amount;
    uint256 unlockCliff2Amount;
  }

  struct DepositForParams {
    address recipient;
    uint256 startTime;
  }

  /**
   * @dev Role conferring creation and revocation of token grants.
   */
  bytes32 public constant TOKEN_GRANTER_ROLE = keccak256("TOKEN_GRANTER_ROLE");

  mapping(address => TokenGrant) private _grants;

  ERC777Upgradeable private _underlying;

  IERC1820RegistryUpgradeable private _erc1820;

  /**
   * @dev Emit on successful creation of a new grant.
   */
  event TokenGrantCreated(
    address indexed recipient,
    uint256 amount,
    uint256 startTime,
    uint256 vestEndTime,
    uint256 unlockEndTime
  );

  /**
   * @dev Emit on when the vesting portion of an active grant is terminated.
   */
  event UnvestedTokensRevoked(uint256 atTime, address from, uint256 quantity);

  /**
   * @dev Emit on withdwal of fully unlocked tokens.
   */
  event TokensClaimed(address account, uint256 quantity);

  /**
   * @dev {ERC777} tokensReceived hook.
   */
  function tokensReceived(
    address,
    address,
    address,
    uint256 amount,
    bytes calldata userData,
    bytes calldata operatorData
  ) external override {
    require(
      msg.sender == address(_underlying),
      "lNORI: This contract can only receive NORI"
    ); // todo verify this can only be invoked by the nori contract
    // todo restrict such that only admin can invoke this function
    _depositFor(amount, userData, operatorData);
  }

  /**
   * @dev Burn (claim) `amount` of wrapped tokens and withdraw the corresponding {NORI} tokens.
   */
  function withdrawTo(address account, uint256 amount)
    external
    virtual
    returns (bool)
  {
    TokenGrant storage grant = _grants[account];
    ERC777Upgradeable._burn(_msgSender(), amount, "", "");
    _underlying.send(account, amount, "");
    grant.claimedAmount += amount;
    emit TokensClaimed(account, amount);
    return true;
  }

  /**
   * @dev createGrant: Sets up a vesting + lockup schedule for recipient.
   */
  function createGrant(
    uint256 amount,
    address recipient,
    uint256 startTime,
    uint256 vestEndTime,
    uint256 unlockEndTime,
    uint256 cliff1Time,
    uint256 cliff2Time,
    uint256 vestCliff1Amount,
    uint256 vestCliff2Amount,
    uint256 unlockCliff1Amount,
    uint256 unlockCliff2Amount
  ) external whenNotPaused onlyRole(TOKEN_GRANTER_ROLE) {
    bytes memory userData = abi.encode(
      recipient,
      startTime,
      vestEndTime,
      unlockEndTime,
      cliff1Time,
      cliff2Time,
      vestCliff1Amount,
      vestCliff2Amount,
      unlockCliff1Amount,
      unlockCliff2Amount
    );
    _createGrant(amount, userData);
  }

  /**
   * @dev revokeUnvestedTokens: Truncates a vesting grant.
   *
   * Transfers any unvested tokens in `from`'s grant to `to`
   * and reduces the total grant size.
   *
   * No change is made to balances that have vested but not yet been claimed
   * whether locked or not.
   */
  function revokeUnvestedTokens(
    uint256 atTime,
    address from,
    address to
  ) external onlyRole(TOKEN_GRANTER_ROLE) whenNotPaused {
    _revokeUnvestedTokens(atTime, from, to);
  }

  function initialize(IERC777Upgradeable noriAddress) public initializer {
    address[] memory operators = new address[](1);
    operators[0] = _msgSender();
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __ERC20Burnable_init_unchained();
    __Pausable_init_unchained();
    __ERC20Pausable_init_unchained();
    __ERC20PresetMinterPauser_init_unchained("Locked NORI", "lNORI");
    __ERC777_init_unchained("Locked NORI", "lNORI", operators);
    grantRole(TOKEN_GRANTER_ROLE, _msgSender());
    _underlying = ERC777Upgradeable(address(noriAddress));
    _erc1820 = IERC1820RegistryUpgradeable(
      0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24
    ); // todo
    _erc1820.setInterfaceImplementer(
      address(this),
      keccak256("ERC777TokensRecipient"),
      address(this)
    );
  }

  /**
   * @dev Wraps minting of wrapper token and grant setup.
   * @param amount uint256 Quantity of `_underlying` to deposit
   * @param userData CreateTokenGrantParams or DepositForParams
   * @param operatorData bytes extra information provided by the operator (if any)
   *
   * If `startTime` is zero no grant is set up.
   * Satisfies situations where funding of the grant happens over time.
   */
  function _depositFor(
    uint256 amount,
    bytes calldata userData,
    bytes calldata operatorData
  ) internal returns (bool) {
    // require(
    //   hasRole(TOKEN_GRANTER_ROLE, tx.origin), // todo figure out how to make this safe
    //   "lNORI: requires TOKEN_GRANTER_ROLE"
    // );
    DepositForParams memory params = abi.decode(userData, (DepositForParams)); // todo error handling
    // If a startTime parameter is non-zero then set up a schedule
    if (params.startTime > 0) {
      _createGrant(amount, userData);
    }
    ERC777Upgradeable._mint(params.recipient, amount, userData, operatorData);
    return true;
  }

  /**
   * @dev _createGrant: Sets up a vesting + lockup schedule for recipient (implementation).
   *
   * This will be invoked via the `tokensReceived` callback for cases
   * where we have the tokens in hand at the time we set up the grant.
   *
   * It is also callable externally (see `grantTo`) to handle cases
   * where tokens are incrementally deposited after the grant is established.
   */
  function _createGrant(uint256 amount, bytes memory userData) internal {
    CreateTokenGrantParams memory params = abi.decode(
      userData,
      (CreateTokenGrantParams)
    );
    require(
      address(params.recipient) != address(0),
      "Recipient cannot be zero address"
    );
    TokenGrant storage grant = _grants[params.recipient];
    grant.grantAmount = amount;
    grant.originalAmount = amount;
    grant.exists = true;
    if (params.vestEndTime > params.startTime) {
      require(
        params.vestCliff1Amount >= params.unlockCliff1Amount ||
          params.vestCliff2Amount >= params.unlockCliff2Amount,
        "lNORI: Unlock cliff amounts cannot exceed vest cliff amounts"
      );
      grant.vestingSchedule.totalAmount = amount;
      grant.vestingSchedule.startTime = params.startTime;
      grant.vestingSchedule.endTime = params.vestEndTime;
      grant.vestingSchedule.addCliff(
        params.cliff1Time,
        params.vestCliff1Amount
      );
      grant.vestingSchedule.addCliff(
        params.cliff2Time,
        params.vestCliff2Amount
      );
    }
    grant.lockupSchedule.totalAmount = amount;
    grant.lockupSchedule.startTime = params.startTime;
    grant.lockupSchedule.endTime = params.unlockEndTime;
    grant.lockupSchedule.addCliff(params.cliff1Time, params.unlockCliff1Amount);
    grant.lockupSchedule.addCliff(params.cliff2Time, params.unlockCliff2Amount);

    emit TokenGrantCreated(
      params.recipient,
      amount,
      params.startTime,
      params.vestEndTime,
      params.unlockEndTime
    );
  }

  /**
   * @dev _revokeUnvestedTokens: Truncates a vesting grant. (implementation)
   */
  function _revokeUnvestedTokens(
    uint256 atTime,
    address from,
    address to
  ) internal {
    TokenGrant storage grant = _grants[from];
    require(grant.exists, "lNori: no grant exists");
    uint256 vestedBalance = _vestedBalanceOf(atTime, from);
    require(vestedBalance < grant.grantAmount, "lNORI: tokens already vested");
    uint256 quantityRevoked = grant.grantAmount - vestedBalance;
    grant.grantAmount = vestedBalance;
    grant.vestingSchedule.totalAmount = vestedBalance;
    grant.vestingSchedule.endTime = atTime;
    _underlying.send(to, quantityRevoked, "");
    ERC777Upgradeable._burn(from, quantityRevoked, "", "");
    emit UnvestedTokensRevoked(atTime, from, quantityRevoked);
  }

  /**
   * @dev quantityRevokedFrom: Number of unvested tokens that were revoked if any.
   */
  function quantityRevokedFrom(address account)
    external
    view
    returns (uint256)
  {
    TokenGrant storage grant = _grants[account];
    return grant.originalAmount - grant.grantAmount;
  }

  /**
   * @dev vestedBalanceOf: Vested balance less any claimed amount at current block timestamp.
   */
  function vestedBalanceOf(address account) external view returns (uint256) {
    return _vestedBalanceOf(block.timestamp, account);
  }

  /**
   * @dev _vestedBalanceOf: Vested balance less any claimed amount at `atTime` (implementation)
   */
  function _vestedBalanceOf(uint256 atTime, address account)
    internal
    view
    returns (uint256)
  {
    TokenGrant storage grant = _grants[account];
    uint256 balance = this.balanceOf(account);
    if (grant.exists) {
      if (grant.vestingSchedule.startTime > 0) {
        balance =
          grant.vestingSchedule.availableAmount(atTime) -
          grant.claimedAmount;
      } else {
        balance = grant.grantAmount - grant.claimedAmount;
      }
    }
    return balance;
  }

  /**
   * @dev unlockedBalanceOf: Unlocked balance less any claimed amount at current block timestamp.
   */
  function unlockedBalanceOf(address account) public view returns (uint256) {
    return _unlockedBalanceOf(block.timestamp, account);
  }

  /**
   * @dev _unlockedBalanceOf: Unlocked balance less any claimed amount. (implementation)
   */
  function _unlockedBalanceOf(uint256 atTime, address account)
    internal
    view
    returns (uint256)
  {
    TokenGrant storage grant = _grants[account];
    uint256 balance = this.balanceOf(account);
    if (grant.exists) {
      // @dev If any tokens have been revoked then the schedule (which doesn't get updated) may
      // return more than the total grant amount.
      //
      // This is done to preserve the behavior of the unlock schedule despite a reduction in the total
      // quantity of tokens vesting.  i.o.w The rate of unlocking does not change after calling
      // `revokeUnvestedTokens`
      balance =
        MathUpgradeable.min(
          MathUpgradeable.min(
            grant.vestingSchedule.availableAmount(atTime),
            grant.lockupSchedule.availableAmount(atTime)
          ),
          grant.grantAmount
        ) -
        grant.claimedAmount;
    }
    return balance;
  }

  /**
   * @dev balanceOf: Total quantity of `_underlying` deposited for `account`.
   */
  function balanceOf(address account)
    public
    view
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (uint256)
  {
    return ERC777Upgradeable.balanceOf(account);
  }

  /**
   * @dev getGrant: Returns all governing settings for a grant.
   */
  function getGrant(address account)
    external
    view
    returns (TokenGrantDetail memory)
  {
    TokenGrant storage grant = _grants[account];
    return
      TokenGrantDetail(
        grant.grantAmount,
        account,
        grant.lockupSchedule.startTime,
        grant.vestingSchedule.endTime,
        grant.lockupSchedule.endTime,
        grant.lockupSchedule.cliffs[0].time,
        grant.lockupSchedule.cliffs[1].time,
        grant.vestingSchedule.cliffs[0].amount,
        grant.vestingSchedule.cliffs[1].amount,
        grant.lockupSchedule.cliffs[0].amount,
        grant.lockupSchedule.cliffs[1].amount,
        grant.claimedAmount,
        grant.originalAmount
      );
  }

  /**
   * @dev Hook that is called before send, transfer, and burn. Used used to disable transferring locked nori.
   *
   * @custom:see Rules of hooks: https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks
   */
  function _beforeTokenTransfer(
    address,
    address from,
    address to,
    uint256 amount
  ) internal virtual override whenNotPaused {
    bool isNotMinting = from != address(0);
    bool hasGrant = _grants[from].exists;
    if (isNotMinting && hasGrant) {
      bool senderIsNotAdmin = !hasRole(DEFAULT_ADMIN_ROLE, _msgSender());
      if (senderIsNotAdmin) {
        uint256 availableBalance = unlockedBalanceOf(from);
        require(amount <= availableBalance, "lNORI: insufficient balance");
      }
    }
    super._beforeTokenTransfer(from, to, amount);
  }

  /**
   * @dev Hook that is called before granting/revoking roles via
   * `grantRole`, `revokeRole`, `renounceRole`
   *
   * This overrides the behavior of `_grantRole`, `_setupRole`,
   * `_revokeRole`, and `_renounceRole` with pausable behavior.
   * When the contract is paused, these functions will not be callable.
   *
   * @custom:see Rules of hooks: https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks
   */
  function _beforeRoleChange(bytes32, address) internal virtual whenNotPaused {} // solhint-disable-line no-empty-blocks

  /**
   * @dev See {ERC20-_approve}.
   *
   * Note that accounts cannot have allowance issued by their operators.
   */
  function _approve(
    address holder,
    address spender,
    uint256 value
  )
    internal
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    whenNotPaused
  {
    ERC777Upgradeable._approve(holder, spender, value);
  }

  /**
   * @dev See {IERC20-allowance}.
   *
   * Note that operator and allowance concepts are orthogonal: operators may
   * not have allowance, and accounts with allowance may not be operators
   * themselves.
   */
  function allowance(address holder, address spender)
    public
    view
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (uint256)
  {
    return ERC777Upgradeable.allowance(holder, spender);
  }

  /**
   * @dev See {IERC20-approve}.
   *
   * NOTE: If `value` is the maximum `uint256`, the allowance is not updated on
   * `transferFrom`. This is semantically equivalent to an infinite approval.
   *
   * Note that accounts cannot have allowance issued by their operators.
   */
  function approve(address spender, uint256 value)
    public
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (bool)
  {
    return ERC777Upgradeable.approve(spender, value);
  }

  /**
   * @dev See {ERC20-decimals}.
   *
   * Always returns 18, as per the
   * [ERC777 EIP](https://eips.ethereum.org/EIPS/eip-777#backward-compatibility).
   */
  function decimals()
    public
    pure
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (uint8)
  {
    return ERC777Upgradeable.decimals();
  }

  /**
   * @dev See {IERC777-name}.
   */
  function name()
    public
    view
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (string memory)
  {
    return ERC777Upgradeable.name();
  }

  /**
   * @dev See {IERC777-symbol}.
   */
  function symbol()
    public
    view
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (string memory)
  {
    return ERC777Upgradeable.symbol();
  }

  /**
   * @dev See {IERC777-totalSupply}.
   */
  function totalSupply()
    public
    view
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (uint256)
  {
    return ERC777Upgradeable.totalSupply();
  }

  /**
   * @dev See {IERC20-transfer}.
   *
   * Unlike `send`, `recipient` is _not_ required to implement the {IERC777Recipient}
   * interface if it is a contract.
   *
   * Also emits a {Sent} event.
   */
  function transfer(address recipient, uint256 amount)
    public
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (bool)
  {
    return ERC777Upgradeable.transfer(recipient, amount);
  }

  /**
   * @dev See {IERC20-transferFrom}.
   *
   * NOTE: Does not update the allowance if the current allowance
   * is the maximum `uint256`.
   *
   * Note that operator and allowance concepts are orthogonal: operators cannot
   * call `transferFrom` (unless they have allowance), and accounts with
   * allowance cannot call `operatorSend` (unless they are operators).
   *
   * Emits {Sent}, {IERC20-Transfer} and {IERC20-Approval} events.
   */
  function transferFrom(
    address holder,
    address recipient,
    uint256 amount
  )
    public
    virtual
    override(ERC20Upgradeable, ERC777Upgradeable)
    returns (bool)
  {
    return ERC777Upgradeable.transferFrom(holder, recipient, amount);
  }

  /**
   * @dev Atomically decreases the allowance granted to `spender` by the caller.
   *
   * This is an alternative to {approve} that can be used as a mitigation for
   * problems described in {IERC20-approve}.
   *
   * Emits an {Approval} event indicating the updated allowance.
   *
   * Requirements:
   *
   * - `spender` cannot be the zero address.
   * - `spender` must have allowance for the caller of at least
   * `subtractedValue`.
   */
  function decreaseAllowance(address spender, uint256 subtractedValue)
    public
    virtual
    override
    whenNotPaused
    returns (bool)
  {
    return decreaseAllowance(spender, subtractedValue);
  }

  /**
   * @dev See {IERC777-authorizeOperator}.
   */
  function authorizeOperator(address operator)
    public
    virtual
    override
    whenNotPaused
  {
    return ERC777Upgradeable.authorizeOperator(operator);
  }

  /**
   * @dev Grants `role` to `account` if the `_beforeRoleGranted`
   * hook is satisfied
   */
  function _grantRole(bytes32 role, address account) internal virtual override {
    _beforeRoleChange(role, account);
    super._grantRole(role, account);
  }

  /**
   * @dev Revokes `role` from `account` if the `_beforeRoleGranted`
   * hook is satisfied
   */
  function _revokeRole(bytes32 role, address account)
    internal
    virtual
    override
  {
    _beforeRoleChange(role, account);
    super.revokeRole(role, account);
  }

  /**
   * @dev See {IERC777-burn}.
   *
   * Also emits a {IERC20-Transfer} event for ERC20 compatibility.
   */
  function burn(uint256, bytes memory) public virtual override {
    revert();
  }

  /**
   * @dev See {IERC777-burn}.
   *
   * Also emits a {IERC20-Transfer} event for ERC20 compatibility.
   */
  function burn(uint256) public virtual override {
    revert();
  }

  /**
   * @dev Destroys `amount` tokens from `account`, deducting from the caller's
   * allowance.
   *
   * See {ERC20-_burn} and {ERC20-allowance}.
   *
   * Requirements:
   *
   * - the caller must have allowance for ``accounts``'s tokens of at least
   * `amount`.
   */
  function burnFrom(address account, uint256 amount) public override {
    uint256 currentAllowance = allowance(account, _msgSender());
    require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
    unchecked {
      _approve(account, _msgSender(), currentAllowance - amount);
    }
    _burn(account, amount);
  }
}
