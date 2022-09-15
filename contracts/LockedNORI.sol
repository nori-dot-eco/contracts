// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "./BridgedPolygonNORI.sol";
import "./deprecated/ERC777PresetPausablePermissioned.sol";
import {LockedNORILib, Schedule, Cliff} from "./LockedNORILib.sol";

/**
 * @title A wrapped BridgedPolygonNORI token contract for vesting and lockup.
 *
 * @author Nori Inc.
 *
 * @notice Based on the mechanics of a wrapped ERC-20 token, this contract layers schedules over the withdrawal
 * functionality to implement _vesting_ (a revocable grant) and _lockup_ (an irrevocable timelock on utility).
 *
 * ##### Behaviors and features
 *
 * ###### Grants
 *
 * - _Grants_ define lockup periods and vesting schedules for tokens
 * - A single grant per address is supported
 *
 * ###### Vesting
 *
 * - _Vesting_ is applied in scenarios where the tokens may need to be recaptured by Nori. This could either be due to
 * an employee leaving the company before being fully vested or because one of our suppliers incurs a carbon loss so
 * their restricted (unvested in the terminology of this contract). tokens need to be recaptured to mitigate the loss
 * and make the original buyer whole by using them to purchases new NRTs on their behalf.
 * - Tokens are released linearly from the latest cliff date to the end date of the grant based on the block.timestamp
 * of each block
 *
 * ###### Lockup
 *
 * - _Lockup_ refers to tokens that are guaranteed to be available to the grantee but are subject to a time delay before
 * they are usable / transferrable out of this smart contract. This is a standard mechanism used to avoid sudden floods
 * of liquidity in the BridgedPolygonNORI token that could severely depress the price.
 * - Unlock is always at the same time or lagging vesting
 * - Transfer of LockedNORI under lockup is forbidden
 *
 * ###### Cliffs
 *
 * - A _cliff_ refers to a period prior to which no tokens are vested or unlocked. Cliffs are defined by a date and an
 * amount which must be <= the overall grant amount.
 * - This contract supports a maximum of two distinct cliffs per grant. The effect of fewer cliffs can be achieve by
 * setting one of both cliff times to the start time or end time, and/or by setting the cliff amount to zero.
 *
 * ###### Additional behaviors and features
 *
 * - [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
 * - [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 *   - all functions that mutate state are pausable
 * - [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
 *    - TOKEN_GRANTER_ROLE
 *      - Can create token grants without sending BridgedPolygonNORI to the contract `createGrant`
 *    - PAUSER_ROLE
 *      - Can pause and unpause the contract
 *    - DEFAULT_ADMIN_ROLE
 *      - This is the only role that can add/revoke other accounts to any of the roles
 * - [Can receive BridgedPolygonNORI ERC-777 tokens](https://eips.ethereum.org/EIPS/eip-777#hooks)
 *   - BridgedPolygonNORI is wrapped and grants are created upon receipt
 * - [Limited ERC-777 functionality](https://eips.ethereum.org/EIPS/eip-777)
 *   - burn and operatorBurn will revert as only the internal variants are expected to be used
 *   - mint is not callable as only the internal variants are expected to be used when wrapping BridgedPolygonNORI
 * - [Limited ERC-20 functionality](https://docs.openzeppelin.com/contracts/4.x/erc20)
 *   - mint is not callable as only the internal variants are expected to be used when wrapping BridgedPolygonNORI
 *   - burn functions are not externally callable
 * - [Extended Wrapped ERC-20 functionality](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Wrapper)
 *   - In absence of a grant LockedNORI functions identically to a standard wrapped token
 *   - when a grant is defined, LockedNORI follows the restrictions noted above
 *
 * ##### Inherits
 *
 * - [ERC777Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#ERC777)
 * - [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 * - [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
 * - [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
 * - [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)
 *
 * ##### Implements
 *
 * - [IERC777Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#IERC777)
 * - [IERC20Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20)
 * - [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
 * - [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)
 *
 * ##### Uses
 *
 * - [LockedNORILib](./LockedNORILib.md) for Schedule
 * - [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)
 *
 */
contract LockedNORI is ERC777PresetPausablePermissioned {
  using LockedNORILib for Schedule;

  struct TokenGrant {
    Schedule vestingSchedule;
    Schedule lockupSchedule;
    uint256 grantAmount;
    uint256 claimedAmount;
    uint256 originalAmount;
    bool exists;
    uint256 lastRevocationTime;
    uint256 lastQuantityRevoked;
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
    uint256 lastRevocationTime;
    uint256 lastQuantityRevoked;
    bool exists;
  }

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
   * @notice Role conferring creation and revocation of token grants.
   */
  bytes32 public constant TOKEN_GRANTER_ROLE = keccak256("TOKEN_GRANTER_ROLE");

  /**
   * @notice Used to register the ERC777TokensRecipient recipient interface in the
   * ERC-1820 registry.  No longer used, retained to maintain storage layout.
   */
  bytes32 public constant ERC777_TOKENS_RECIPIENT_HASH =
    keccak256("ERC777TokensRecipient");

  /**
   * @notice A mapping from grantee to grant
   */
  mapping(address => TokenGrant) private _grants;

  /**
   * @notice The BridgedPolygonNORI contract that this contract wraps tokens for
   */
  BridgedPolygonNORI private _bridgedPolygonNori;

  /**
   * @notice The [ERC-1820](https://eips.ethereum.org/EIPS/eip-1820) pseudo-introspection registry
   * contract
   */
  IERC1820RegistryUpgradeable private _erc1820;

  /**
   * @notice Emitted on successful batch creation of new grants.
   */
  event TokenGrantCreatedBatch(uint256 totalAmount);

  /**
   * @notice Emitted on successful creation of a new grant.
   */
  event TokenGrantCreated(
    address indexed recipient,
    uint256 indexed amount,
    uint256 indexed startTime,
    uint256 vestEndTime,
    uint256 unlockEndTime
  );

  /**
   * @notice Emitted on when the vesting portion of an active grant is terminated.
   */
  event UnvestedTokensRevoked(
    uint256 indexed atTime,
    address indexed from,
    uint256 indexed quantity
  );

  /**
   * @notice Emitted on withdwal of fully unlocked tokens.
   */
  event TokensClaimed(
    address indexed from,
    address indexed to,
    uint256 quantity
  );

  /**
   * @notice Emitted when the underlying token contract address is updated due to migration.
   */
  event UnderlyingTokenAddressUpdated(address from, address to);

  /**
   * @dev Ensure implementation contract is minimally initialized. See more [here](
   * https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializing_the_implementation_contract).
   */
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Mints wrapper token to *recipient* if a grant exists.
   *
   * @dev If `startTime` is zero no grant is set up. Satisfies situations where funding of the grant happens over time.
   *
   * @param amount uint256 Quantity of `_bridgedPolygonNori` to deposit
   */
  function depositFor(address recipient, uint256 amount)
    external
    whenNotPaused
    returns (bool)
  {
    require(_grants[recipient].exists, "lNORI: Cannot deposit without a grant");
    if (_bridgedPolygonNori.transferFrom(_msgSender(), address(this), amount)) {
      super._mint(recipient, amount, "", "");
      return true;
    }
    revert("lNORI: transferFrom underlying asset failed");
  }

  /**
   * @notice Claim unlocked tokens and withdraw them to *to* address.
   *
   * @dev This function burns `amount` of `LockedNORI` and transfers `amount`
   * of `BridgedPolygonNORI` from the `LockedNORI` contract's balance to
   * `_msgSender()`'s balance.
   *
   * Enforcement of the availability of wrapped and unlocked tokens
   * for the `_burn` call happens in `_beforeTokenTransfer`
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   */
  function withdrawTo(address recipient, uint256 amount)
    external
    whenNotPaused
    returns (bool)
  {
    TokenGrant storage grant = _grants[_msgSender()];
    super._burn(_msgSender(), amount, "", "");
    grant.claimedAmount += amount;
    if (_bridgedPolygonNori.transfer(recipient, amount)) {
      emit TokensClaimed(_msgSender(), recipient, amount);
      return true;
    }
    revert("lNORI: Transfer to underlying asset failed");
  }

  /**
   * @notice Batch version of `createGrant` with permit support.
   */
  function batchCreateGrants(
    uint256[] calldata amounts,
    bytes[] calldata grantParams,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external whenNotPaused onlyRole(TOKEN_GRANTER_ROLE) {
    require(
      amounts.length == grantParams.length,
      "lNORI: Requires one amount per grant detail"
    );
    uint256 totalAmount = 0;
    for (uint8 i = 0; i < amounts.length; i++) {
      totalAmount = totalAmount + amounts[i];
      address recipient = _createGrant(amounts[i], grantParams[i]);
      super._mint(recipient, amounts[i], "", "");
    }
    emit TokenGrantCreatedBatch(totalAmount);
    _bridgedPolygonNori.permit(
      _msgSender(),
      address(this),
      totalAmount,
      deadline,
      v,
      r,
      s
    );
    _bridgedPolygonNori.transferFrom(_msgSender(), address(this), totalAmount);
  }

  /**
   * @notice Sets up a vesting + lockup schedule for recipient.
   *
   * @dev This function can be used as an alternative way to set up a grant that doesn't require
   * wrapping BridgedPolygonNORI first.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `TOKEN_GRANTER_ROLE` role
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
   * @notice Truncates a batch of vesting grants of amounts in a single go
   *
   * @dev Transfers any unvested tokens in `fromAccounts`'s grant to `to` and reduces the total grant size. No change
   * is made to balances that have vested but not yet been claimed whether locked or not.
   *
   * The behavior of this function can be used in two specific ways:
   * - To revoke all remaining revokable tokens in a batch (regardless of time), set amount to 0 in the `amounts` array.
   * - To revoke tokens at the current block timestamp, set atTimes to 0 in the `amounts` array.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `TOKEN_GRANTER_ROLE` role
   * - The requirements of _beforeTokenTransfer apply to this function
   * - fromAccounts.length == toAccounts.length == atTimes.length == amounts.length
   */
  function batchRevokeUnvestedTokenAmounts(
    address[] calldata fromAccounts,
    address[] calldata toAccounts,
    uint256[] calldata atTimes,
    uint256[] calldata amounts
  ) external whenNotPaused onlyRole(TOKEN_GRANTER_ROLE) {
    require(
      fromAccounts.length == toAccounts.length,
      "lNORI: fromAccounts and toAccounts length mismatch"
    );
    require(
      toAccounts.length == atTimes.length,
      "lNORI: toAccounts and atTimes length mismatch"
    );
    require(
      atTimes.length == amounts.length,
      "lNORI: atTimes and amounts length mismatch"
    );
    for (uint256 i = 0; i < fromAccounts.length; i++) {
      _revokeUnvestedTokens(
        fromAccounts[i],
        toAccounts[i],
        atTimes[i],
        amounts[i]
      );
    }
  }

  /**
   * @notice Number of unvested tokens that were revoked if any.
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
   * @notice Vested balance less any claimed amount at current block timestamp.
   */
  function vestedBalanceOf(address account) external view returns (uint256) {
    return _vestedBalanceOf(account, block.timestamp); // solhint-disable-line not-rely-on-time, this is time-dependent
  }

  /**
   * @notice Returns all governing settings for multiple grants
   *
   * @dev If a grant does not exist for an account, the resulting grant will be zeroed out in the return value
   */
  function batchGetGrant(address[] calldata accounts)
    public
    view
    returns (TokenGrantDetail[] memory)
  {
    TokenGrantDetail[] memory grantDetails = new TokenGrantDetail[](
      accounts.length
    );
    for (uint256 i = 0; i < accounts.length; i++) {
      grantDetails[i] = getGrant(accounts[i]);
    }
    return grantDetails;
  }

  /**
   * @notice Returns all governing settings for a grant.
   */
  function getGrant(address account)
    public
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
        grant.originalAmount,
        grant.lastRevocationTime,
        grant.lastQuantityRevoked,
        grant.exists
      );
  }

  function initialize(BridgedPolygonNORI bridgedPolygonNoriAddress)
    public
    initializer
  {
    address[] memory operators = new address[](1);
    operators[0] = _msgSender();
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC777PresetPausablePermissioned_init_unchained();
    __ERC777_init_unchained("Locked NORI", "lNORI", operators);
    _bridgedPolygonNori = bridgedPolygonNoriAddress;
    _grantRole(TOKEN_GRANTER_ROLE, _msgSender());
  }

  /**
   * @notice Admin function to update the underlying token contract address.
   *
   * @dev Used in case of major migrations only.
   */
  function updateUnderlying(BridgedPolygonNORI newUnderlying)
    external
    whenNotPaused
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    address old = address(_bridgedPolygonNori);
    require(
      old != address(newUnderlying),
      "lNORI: updating underlying address to existing address"
    );
    _bridgedPolygonNori = newUnderlying;
    emit UnderlyingTokenAddressUpdated(old, address(newUnderlying));
  }

  /**
   * @notice Overridden standard ERC777.burn that will always revert
   *
   * @dev This function is not currently supported from external callers so we override it so that we can revert.
   */
  function burn(uint256, bytes memory) public pure override {
    revert("lNORI: burning not supported");
  }

  /**
   * @notice Overridden standard ERC777.operatorBurn that will always revert
   *
   * @dev This function is not currently supported from external callers so we override it so that we can revert.
   */
  function operatorBurn(
    address,
    uint256,
    bytes memory,
    bytes memory
  ) public pure override {
    revert("lNORI: burning not supported");
  }

  /**
   * @notice Unlocked balance less any claimed amount at current block timestamp.
   */
  function unlockedBalanceOf(address account) public view returns (uint256) {
    return _unlockedBalanceOf(account, block.timestamp);
  }

  /**
   * @notice Sets up a vesting + lockup schedule for recipient (implementation).
   *
   * @dev All grants must include a lockup schedule and can optionally *also*
   * include a vesting schedule.  Tokens are withdrawble once they are
   * vested *and* unlocked.
   *
   * It is also callable externally (see `grantTo`) to handle cases
   * where tokens are incrementally deposited after the grant is established.
   */
  function _createGrant(uint256 amount, bytes memory userData)
    internal
    returns (address recipient)
  {
    CreateTokenGrantParams memory params = abi.decode(
      userData,
      (CreateTokenGrantParams)
    );
    require(
      address(params.recipient) != address(0),
      "lNORI: Recipient cannot be zero address"
    );
    require(
      !hasRole(TOKEN_GRANTER_ROLE, params.recipient),
      "lNORI: Recipient cannot be grant admin"
    );
    require(
      params.startTime < params.unlockEndTime,
      "lNORI: unlockEndTime cannot be before startTime"
    );
    require(
      block.timestamp < params.unlockEndTime,
      "lNORI: unlockEndTime cannot be in the past"
    );
    require(!_grants[params.recipient].exists, "lNORI: Grant already exists");
    TokenGrant storage grant = _grants[params.recipient];
    grant.grantAmount = amount;
    grant.originalAmount = amount;
    grant.exists = true;
    if (params.vestEndTime > params.startTime) {
      require(
        params.vestCliff1Amount >= params.unlockCliff1Amount ||
          params.vestCliff2Amount >= params.unlockCliff2Amount,
        "lNORI: unlock cliff > vest cliff"
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
    return params.recipient;
  }

  /**
   * @notice Truncates a vesting grant.
   * This is an *admin* operation callable only by addresses having TOKEN_GRANTER_ROLE
   * (enforced in `batchRevokeUnvestedTokenAmounts`)
   *
   * @dev The implementation never updates underlying schedules (vesting or unlock)
   * but only the grant amount.  This avoids changing the behavior of the grant
   * before the point of revocation.  Anytime a vesting or unlock schedule is in
   * play the corresponding balance functions need to take care to never return
   * more than the grant amount less the claimed amount.
   *
   * Unlike in the `claim` function, here we burn `LockedNORI` from the grant holder but
   * send that `BridgedPolygonNORI` back to Nori's treasury or an address of Nori's
   * choosing (the *to* address).  The *claimedAmount* is not changed because this is
   * not a claim operation.
   */
  function _revokeUnvestedTokens(
    address from,
    address to,
    uint256 atTime,
    uint256 amount
  ) internal {
    require(
      (atTime == 0 && amount > 0) || (atTime > 0 && amount == 0),
      "lNORI: Must specify a revocation time or an amount not both"
    );
    TokenGrant storage grant = _grants[from];
    require(grant.exists, "lNORI: no grant exists");
    require(
      _hasVestingSchedule(from),
      "lNORI: no vesting schedule for this grant"
    );
    uint256 revocationTime = atTime == 0 && amount > 0
      ? block.timestamp
      : atTime; // atTime of zero indicates a revocation by amount
    require(
      revocationTime >= block.timestamp,
      "lNORI: Revocation cannot be in the past"
    );
    uint256 vestedBalance = grant.vestingSchedule.availableAmount(
      revocationTime
    );
    require(vestedBalance < grant.grantAmount, "lNORI: tokens already vested");
    uint256 revocableQuantity = grant.grantAmount - vestedBalance;
    uint256 quantityRevoked;
    // amount of zero indicates revocation by time.  Amount becomes all remaining tokens
    // at *atTime*
    if (amount > 0) {
      require(amount <= revocableQuantity, "lNORI: too few unvested tokens");
      quantityRevoked = amount;
    } else {
      quantityRevoked = revocableQuantity;
    }
    grant.grantAmount = grant.grantAmount - quantityRevoked;
    grant.lastRevocationTime = revocationTime;
    grant.lastQuantityRevoked = quantityRevoked;
    super._burn(from, quantityRevoked, "", "");
    if (!_bridgedPolygonNori.transfer(to, quantityRevoked)) {
      revert("lNORI: transfer of underlying asset failed.");
    }
    emit UnvestedTokensRevoked(revocationTime, from, quantityRevoked);
  }

  /**
   * @notice Hook that is called before send, transfer, mint, and burn. Used to disable transferring locked nori.
   *
   * @dev Follows the rules of hooks defined [here](
   *  https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * ##### Requirements:
   *
   * - the contract must not be paused
   * - the recipient cannot be the zero address (e.g., no burning of tokens is allowed)
   * - One of the following must be true:
   *    - the operation is minting (which should ONLY occur when BridgedPolygonNORI is being wrapped via `_depositFor`)
   *    - the operation is a burn and _all_ of the following must be true:
   *      - the operator has TOKEN_GRANTER_ROLE
   *      - the operator is not operating on their own balance
   *      - the transfer amount is <= the sender's unlocked balance
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256 amount
  ) internal override {
    bool isMinting = from == address(0);
    bool isBurning = to == address(0);
    bool operatorIsGrantAdmin = hasRole(TOKEN_GRANTER_ROLE, operator);
    bool operatorIsNotSender = operator != from;
    bool ownerHasSufficientUnlockedBalance = amount <= unlockedBalanceOf(from);
    bool ownerHasSufficientWrappedToken = amount <= balanceOf(from);
    if (isBurning && operatorIsNotSender && operatorIsGrantAdmin) {
      // Revocation
      require(balanceOf(from) >= amount, "lNORI: insufficient balance");
    } else if (!isMinting) {
      // Withdrawal
      require(
        ownerHasSufficientUnlockedBalance && ownerHasSufficientWrappedToken,
        "lNORI: insufficient balance"
      );
    }
    return super._beforeTokenTransfer(operator, from, to, amount);
  }

  /**
   * @notice Vested balance less any claimed amount at `atTime` (implementation)
   *
   * @dev Returns true if the there is a grant for *account* with a vesting schedule.
   */
  function _hasVestingSchedule(address account) private view returns (bool) {
    TokenGrant storage grant = _grants[account];
    return grant.exists && grant.vestingSchedule.startTime > 0;
  }

  /**
   * @notice Vested balance less any claimed amount at `atTime` (implementation)
   *
   * @dev If any tokens have been revoked then the schedule (which doesn't get updated) may return more than the total
   * grant amount. This is done to preserve the behavior of the vesting schedule despite a reduction in the total
   * quantity of tokens vesting.  i.o.w The rate of vesting does not change after calling `revokeUnvestedTokens`
   */
  function _vestedBalanceOf(address account, uint256 atTime)
    internal
    view
    returns (uint256)
  {
    TokenGrant storage grant = _grants[account];
    uint256 balance = this.balanceOf(account);
    if (grant.exists) {
      if (_hasVestingSchedule(account)) {
        balance =
          MathUpgradeable.min(
            grant.vestingSchedule.availableAmount(atTime),
            grant.grantAmount
          ) -
          grant.claimedAmount;
      } else {
        balance = grant.grantAmount - grant.claimedAmount;
      }
    }
    return balance;
  }

  /**
   * @notice Unlocked balance less any claimed amount
   *
   * @dev If any tokens have been revoked then the schedule (which doesn't get updated) may return more than the total
   * grant amount. This is done to preserve the behavior of the unlock schedule despite a reduction in the total
   * quantity of tokens vesting.  i.o.w The rate of unlocking does not change after calling `revokeUnvestedTokens`
   */
  function _unlockedBalanceOf(address account, uint256 atTime)
    internal
    view
    returns (uint256)
  {
    TokenGrant storage grant = _grants[account];
    uint256 balance = this.balanceOf(account);
    uint256 vestedBalance = _hasVestingSchedule(account)
      ? grant.vestingSchedule.availableAmount(atTime)
      : grant.grantAmount;
    if (grant.exists) {
      balance =
        MathUpgradeable.min(
          MathUpgradeable.min(
            vestedBalance,
            grant.lockupSchedule.availableAmount(atTime)
          ),
          grant.grantAmount
        ) -
        grant.claimedAmount;
    }
    return balance;
  }

  function _beforeOperatorChange(address, uint256) internal pure override {
    revert("lNORI: operator actions disabled");
  }

  function send(
    address,
    uint256,
    bytes memory
  ) public pure override {
    revert("lNORI: send disabled");
  }

  function operatorSend(
    address,
    address,
    uint256,
    bytes memory,
    bytes memory
  ) public pure override {
    revert("lNORI: operatorSend disabled");
  }

  function transfer(address, uint256) public pure override returns (bool) {
    revert("lNORI: transfer disabled");
  }

  function transferFrom(
    address,
    address,
    uint256
  ) public pure override returns (bool) {
    revert("lNORI: transferFrom disabled");
  }

  function _beforeRoleChange(bytes32 role, address account)
    internal
    virtual
    override
  {
    super._beforeRoleChange(role, account);
    if (role == TOKEN_GRANTER_ROLE) {
      require(
        !_grants[account].exists,
        "lNORI: Cannot assign role to a grant holder address"
      );
    }
  }
}
