// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "./ERC777PresetPausablePermissioned.sol";
import "./BridgedPolygonNORI.sol";
import {ScheduleUtils, Schedule, Cliff} from "./ScheduleUtils.sol";

/**
 * @title A wrapped BridgedPolygonNORI token contract for vesting and lockup
 * @author Nori Inc.
 * @notice Based on the mechanics of a wrapped ERC-777 token, this contract layers schedules over the withdrawal
 * functionality to implement _vesting_ (a revocable grant)
 * and _lockup_ (an irrevocable timelock on utility).
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
 * - [IERC777RecipientUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#IERC777Recipient)
 * - [IERC777Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#IERC777)
 * - [IERC20Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20)
 * - [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
 * - [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)
 *
 * ##### Uses
 *
 * - [ScheduleUtils](./ScheduleUtils.md) for Schedule
 * - [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)
 *
 */
contract LockedNORI is
  IERC777RecipientUpgradeable,
  ERC777PresetPausablePermissioned
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
   * ERC-1820 registry
   * @dev Registering that LockedNORI implements the ERC777TokensRecipient interface with the registry is a
   * requiremnt to be able to receive ERC-777 BridgedPolygonNORI tokens. Once registered, sending BridgedPolygonNORI
   * tokens to this contract will trigger tokensReceived as part of the lifecycle of the BridgedPolygonNORI transaction
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
   * @dev Registering that LockedNORI implements the ERC777TokensRecipient interface with the registry is a
   * requiremnt to be able to receive ERC-777 BridgedPolygonNORI tokens. Once registered, sending BridgedPolygonNORI
   * tokens to this contract will trigger tokensReceived as part of the lifecycle of the BridgedPolygonNORI transaction
   */
  IERC1820RegistryUpgradeable private _erc1820;

  /**
   * @notice Emitted on successful creation of a new grant.
   */
  event TokenGrantCreated(
    address indexed recipient,
    uint256 amount,
    uint256 startTime,
    uint256 vestEndTime,
    uint256 unlockEndTime
  );

  /**
   * @dev Emitted on when the vesting portion of an active grant is terminated.
   */
  event UnvestedTokensRevoked(uint256 atTime, address from, uint256 quantity);

  /**
   * @dev Emitted on withdwal of fully unlocked tokens.
   */
  event TokensClaimed(address account, uint256 quantity);

  /**
   * @notice This function is triggered when BridgedPolygonNORI is sent to this contract
   * @dev Sending BridgedPolygonNORI to this contract triggers the tokensReceived hook defined by the ERC-777 standard
   * because this contract is a registered ERC777 tokens recipient.
   *
   * [See here for more](
   * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-777.md#erc777tokensrecipient-and-the-tokensreceived-hook)
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
      msg.sender == address(_bridgedPolygonNori),
      "lNORI: not BridgedPolygonNORI"
    ); // todo verify this can only be invoked by the nori contract
    // todo restrict such that only admin can invoke this function
    _depositFor(amount, userData, operatorData);
  }

  /**
   * @notice Unwrap BridgedPolygonNORI tokens and makes them available for use in the BridgedPolygonNORI contract
   * @dev This function burns `amount` of wrapped tokens and withdraws them to the corresponding {BridgedPolygonNORI}
   * tokens.
   *
   * ##### Requirements:
   * - Can only be used when the contract is not paused.
   */
  function withdrawTo(address account, uint256 amount) external returns (bool) {
    TokenGrant storage grant = _grants[account];
    super._burn(_msgSender(), amount, "", "");
    _bridgedPolygonNori.send(
      // solhint-disable-previous-line check-send-result, because this isn't a solidity send
      account,
      amount,
      ""
    );
    grant.claimedAmount += amount;
    emit TokensClaimed(account, amount);
    return true;
  }

  /**
   * @notice Sets up a vesting + lockup schedule for recipient.
   * @dev This function can be used as an alternative way to set up a grant that doesn't require
   * wrapping BridgedPolygonNORI first.
   *
   * ##### Requirements:
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `TOKEN_GRANTER_ROLE` role
   *
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
    address from,
    address to,
    uint256 atTime
  ) external whenNotPaused onlyRole(TOKEN_GRANTER_ROLE) {
    _revokeUnvestedTokens(from, to, atTime, 0);
  }

  /**
   * @dev revokeUnvestedTokenAmount: Truncates a vesting grant.
   *
   * Transfers any unvested tokens in `from`'s grant to `to`
   * and reduces the total grant size.
   *
   * No change is made to balances that have vested but not yet been claimed
   * whether locked or not.
   */
  function revokeUnvestedTokenAmount(
    address from,
    address to,
    uint256 atTime,
    uint256 amount
  ) external whenNotPaused onlyRole(TOKEN_GRANTER_ROLE) {
    _revokeUnvestedTokens(from, to, atTime, amount);
  }

  /**
   * @dev Number of unvested tokens that were revoked if any.
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
   * @dev Vested balance less any claimed amount at current block timestamp.
   */
  function vestedBalanceOf(address account) external view returns (uint256) {
    return _vestedBalanceOf(account, block.timestamp);
  }

  /**
   * @notice Returns all governing settings for a grant.
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

  // todo document expected initialzation state
  function initialize(IERC777Upgradeable bridgedPolygonNoriAddress)
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
    __ERC777_init_unchained("Locked BridgedPolygonNORI", "lNORI", operators);
    _bridgedPolygonNori = BridgedPolygonNORI(
      address(bridgedPolygonNoriAddress)
    );
    _ERC1820_REGISTRY.setInterfaceImplementer(
      address(this),
      ERC777_TOKENS_RECIPIENT_HASH,
      address(this)
    );
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender()); // todo why doesnt grantRole work
    _setupRole(TOKEN_GRANTER_ROLE, _msgSender()); // todo why doesnt grantRole work
    _setupRole(PAUSER_ROLE, _msgSender()); // todo why doesnt grantRole work
  }

  /**
   * @notice Overridden standard ERC777.burn that will always revert
   * @dev This function is not currently supported from external callers so we override it so that we can revert.
   */
  function burn(uint256, bytes memory) public pure override {
    revert("lNORI: burning not supported");
  }

  /**
   * @notice Overridden standard ERC777.operatorBurn that will always revert
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
   * @dev Unlocked balance less any claimed amount at current block timestamp.
   */
  function unlockedBalanceOf(address account) public view returns (uint256) {
    return _unlockedBalanceOf(account, block.timestamp);
  }

  /**
   * @dev Wraps minting of wrapper token and grant setup.
   * @param amount uint256 Quantity of `_bridgedPolygonNori` to deposit
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
    super._mint(params.recipient, amount, userData, operatorData);
    return true;
  }

  /**
   * @dev Sets up a vesting + lockup schedule for recipient (implementation).
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
    require(!_grants[params.recipient].exists, "lNORI: Grant already exists");
    TokenGrant storage grant = _grants[params.recipient];
    grant.grantAmount = amount;
    grant.originalAmount = amount;
    grant.exists = true;
    if (params.vestEndTime > params.startTime) {
      require(
        params.vestCliff1Amount >= params.unlockCliff1Amount ||
          params.vestCliff2Amount >= params.unlockCliff2Amount,
        "lNORI: unlock cliff < vest cliff"
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
   * @dev Truncates a vesting grant
   */
  function _revokeUnvestedTokens(
    address from,
    address to,
    uint256 atTime,
    uint256 amount
  ) internal {
    TokenGrant storage grant = _grants[from];
    require(grant.exists, "lNORI: no grant exists");
    uint256 vestedBalance = _vestedBalanceOf(from, atTime);
    require(vestedBalance < grant.grantAmount, "lNORI: tokens already vested");
    uint256 revocableQuantity = grant.grantAmount - vestedBalance;
    uint256 quantityRevoked;
    if (amount > 0) {
      require(amount <= revocableQuantity, "lNORI: too few unvested tokens");
      quantityRevoked = amount;
    } else {
      quantityRevoked = revocableQuantity;
    }
    grant.grantAmount = vestedBalance;
    grant.vestingSchedule.totalAmount = vestedBalance;
    grant.vestingSchedule.endTime = atTime;
    _bridgedPolygonNori.send(
      // solhint-disable-previous-line check-send-result, because this isn't a solidity send
      to,
      quantityRevoked,
      ""
    );
    super._burn(from, quantityRevoked, "", "");
    emit UnvestedTokensRevoked(atTime, from, quantityRevoked);
  }

  /**
   * @notice Hook that is called before send, transfer, mint, and burn. Used used to disable transferring locked nori.
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
    if (isBurning && operatorIsNotSender && operatorIsGrantAdmin) {
      require(balanceOf(from) >= amount, "lNORI: insufficient balance");
    } else if (!isMinting) {
      require(ownerHasSufficientUnlockedBalance, "lNORI: insufficient balance");
    }
    return super._beforeTokenTransfer(operator, from, to, amount);
  }

  /**
   * @dev Vested balance less any claimed amount at `atTime` (implementation)
   */
  function _vestedBalanceOf(address account, uint256 atTime)
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
   * @notice Unlocked balance less any claimed amount
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
    if (grant.exists) {
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
}
