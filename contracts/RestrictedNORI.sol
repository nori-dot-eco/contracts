// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "./BridgedPolygonNORI.sol";
import "./Removal.sol";
import "./FIFOMarket.sol";
import {RemovalUtils} from "./RemovalUtils.sol";

import "hardhat/console.sol"; // todo

/*
TODO LIST:
- large market test is blowing block gas limit on minting/listing... what to do about this?
  (maybe split the minting/listing into a few different transactions so that the rest of the large market test
  can proceed as intended)

- check out your remaining test cases
 */

/**
 * @title A wrapped BridgedPolygonNORI token contract for restricting the release of tokens for use as insurance collateral.
 *
 * @author Nori Inc.
 *
 * @notice Based on the mechanics of a wrapped ERC-777 token, this contract layers schedules over the withdrawal
 * functionality to implement _restriction_, a time-based release of tokens that, until released, can be reclaimed
 * by Nori to enforce the permanence guarantee of carbon removals.
 *
 * ##### Behaviors and features
 *
 * ###### Schedules
 *
 * - _Schedules_ define the release timeline for restricted tokens.
 * - A specific schedule is associated with one ERC1155 token id and can have multiple token holders.
 *
 * ###### Restricting
 *
 * - _Restricting_ is the process of gradually releasing tokens that may need to be recaptured by Nori in the event
 * that the sequestered carbon for which the tokens were exchanged is found to violate its permanence guarantee.
 * In this case, tokens need to be recaptured to mitigate the loss and make the original buyer whole by using them to
 * purchase new NRTs on their behalf.
 * - Tokens are released linearly from the schedule's start time until its end time. As NRTs are sold, proceeds may
 * be routed to a restriction schedule at any point in the schedule's timeline, thus increasing the total balance of
 * the schedule as well as the released amount at the current timestamp (assuming it's after the schedule start time).
 *
 * ###### Transferring
 * - A given schedule is a logical overlay to a specific 1155 token. This token can have any number of token holders,
 * and transferability via `safeTransferFrom` and `safeBatchTransferFrom` is enabled.
 * Ownership percentages only become relevant and are enforced during withdrawal and revocation.
 *
 * ###### Withdrawal
 * _Withdrawal_ is the process of a token holder claiming the tokens that have been released by the restriction
 * schedule. When tokens are withdrawn, the 1155 schedule token is burned, and the BridgedPolygonNORI being held
 * by this contract is sent to the address specified by the token holder performing the withdrawal.
 * Tokens are released by a schedule based on the linear release of the schedule's totalSupply, but a token holder
 * can only withdraw released tokens in proportion to their percentage ownership of the schedule tokens.
 *
 * ###### Revocation
 * _Revocation_ is the process of tokens being recaptured by Nori to enforce carbon permanence guarantees.
 * Only unreleased tokens can ever be revoked. When tokens are revoked from a schedule, the current number of released
 * tokens does not decrease, even as the schedule's total supply decreases through revocation (a floor is enforced).
 * When these tokens are revoked, the 1155 schedule token is burned, and the BridgedPolygonNORI held by this contract
 * is sent to the address specified by Nori. If a schedule has multiple token holders, tokens are burned from each
 * holder in proportion to their total percentage ownership of the schedule.
 *
 *
 * ###### Additional behaviors and features
 *
 * - [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
 * - [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 *   - all functions that mutate state are pausable
 * - [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
 *    - SCHEDULE_CREATOR_ROLE
 *      - Can create restriction schedules without sending BridgedPolygonNORI to the contract
 *      - The Removal contract has this role and sets up relevant schedules as removal tokens are listed for sale
 *    - PAUSER_ROLE
 *      - Can pause and unpause the contract
 *    - DEFAULT_ADMIN_ROLE
 *      - This is the only role that can add/revoke other accounts to any of the roles
 * - [Can receive BridgedPolygonNORI ERC-777 tokens](https://eips.ethereum.org/EIPS/eip-777#hooks)
 *   - BridgedPolygonNORI is wrapped and schedules are created (if necessary) upon receipt
 * - [Limited ERC-1155 functionality](https://eips.ethereum.org/EIPS/eip-1155)
 *   - mint and mintBatch will revert as only the internal variants are expected to be used
 *   - burn and burnBatch will revert as only the internal variants are expected to be used
 *   - setApprovalForAll and isApprovedForAll will revert as operator actions are disabled
 *
 * ##### Inherits
 *
 * - [ERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155)
 * - [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 * - [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
 * - [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
 * - [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)
 *
 * ##### Implements
 *
 * - [IERC777RecipientUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc777#IERC777Recipient)
 * - [IERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155)
 * - [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
 * - [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)
 *
 * ##### Uses
 *
 * - [RemovalUtils](./RemovalUtils.md) for uint256
 * - [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet)
 * - [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)
 *
 */
contract RestrictedNORI is
  IERC777RecipientUpgradeable,
  ERC1155PresetMinterPauserUpgradeable,
  ERC1155SupplyUpgradeable
{
  using RemovalUtils for uint256;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

  // Based on average year duration of 365.2425 days, which accounts for leap years
  uint256 constant SECONDS_IN_TEN_YEARS = 315_569_520;

  error BurningNotSupported();
  error MintingNotSupported();
  error OperatorActionsNotSupported();
  error TokenSenderNotBPNORI();
  error RecipientCannotBeZeroAddress();
  error RecipientCannotHaveRole(address recipient, string role);
  error RestrictionDurationNotSet(uint256 projectId);
  error NonexistentSchedule(uint256 scheduleId);
  error ScheduleExists(uint256 scheduleTokenId);
  error RoleCannotTransfer(address account, string role);
  error RoleUnassignableToScheduleHolder(address account, string role);
  error MissingRole(address account, string role);
  error ArrayLengthMismatch(string array1Name, string array2Name);
  error InsufficientUnreleasedTokens(uint256 scheduleId);
  error InsufficientBalance(address account, uint256 scheduleId);
  error InsufficientClaimableBalance(address account, uint256 scheduleId);
  error InvalidBpNoriSender(address account);
  error InvalidScheduleStartTime(uint256 projectId);

  /** The internal governing parameters and data for a schedule */
  struct Schedule {
    uint256 startTime;
    uint256 endTime;
    uint256 totalClaimedAmount;
    bool exists;
    uint256 totalQuantityRevoked;
    uint256 releasedAmountFloor;
    EnumerableSetUpgradeable.AddressSet tokenHolders;
    mapping(address => uint256) claimedAmountsByAddress;
    mapping(address => uint256) quantitiesRevokedByAddress;
  }

  /** View information for the current state of one schedule */
  struct ScheduleSummary {
    uint256 scheduleTokenId;
    uint256 startTime;
    uint256 endTime;
    uint256 totalSupply;
    uint256 totalClaimableAmount;
    uint256 totalClaimedAmount;
    uint256 totalQuantityRevoked;
    address[] tokenHolders;
    bool exists;
  }

  /** View information for one account's ownership of a schedule */
  struct ScheduleDetailForAddress {
    address tokenHolder;
    uint256 scheduleTokenId;
    uint256 startTime;
    uint256 endTime;
    uint256 balance;
    uint256 claimableAmount;
    uint256 claimedAmount;
    uint256 quantityRevoked;
    bool exists;
  }

  struct RestrictionDuration {
    uint256 duration;
    bool wasSet;
  }

  /**
   * @notice Role conferring creation of schedules.
   *
   * @dev the Removal contract is granted this role during this contract's deployment.
   */
  bytes32 public constant SCHEDULE_CREATOR_ROLE =
    keccak256("SCHEDULE_CREATOR_ROLE");

  /**
   * @notice Role conferring revocation of restricted tokens.
   *
   * @dev only Nori admin address should have this role.
   */
  bytes32 public constant TOKEN_REVOKER_ROLE = keccak256("TOKEN_REVOKER_ROLE");

  /**
   * @notice Used to register the ERC777TokensRecipient recipient interface in the
   * ERC-1820 registry
   *
   * @dev Registering that RestrictedNORI implements the ERC777TokensRecipient interface with the registry is a
   * requirement to be able to receive ERC-777 BridgedPolygonNORI tokens. Once registered, sending BridgedPolygonNORI
   * tokens to this contract will trigger tokensReceived as part of the lifecycle of the BridgedPolygonNORI transaction
   */
  bytes32 public constant ERC777_TOKENS_RECIPIENT_HASH =
    keccak256("ERC777TokensRecipient");

  mapping(uint256 => mapping(uint256 => RestrictionDuration))
    private _methodologyAndVersionToScheduleDuration;

  mapping(address => EnumerableSetUpgradeable.UintSet)
    private _addressToScheduleIdSet;

  mapping(uint256 => Schedule) private _scheduleIdToScheduleStruct;

  EnumerableSetUpgradeable.UintSet private _allScheduleIds;

  /**
   * @notice The BridgedPolygonNORI contract for which this contract wraps tokens.
   */
  FIFOMarket private _market;

  /**
   * @notice The BridgedPolygonNORI contract for which this contract wraps tokens.
   */
  BridgedPolygonNORI private _bridgedPolygonNori;

  /**
   * @notice The Removal contract that accounts for carbon removal supply.
   */
  Removal private _removal;

  /**
   * @notice The [ERC-1820](https://eips.ethereum.org/EIPS/eip-1820) pseudo-introspection registry
   * contract
   *
   * @dev Registering that RestrictedNORI implements the ERC777TokensRecipient interface with the registry is a
   * requirement to be able to receive ERC-777 BridgedPolygonNORI tokens. Once registered, sending BridgedPolygonNORI
   * tokens to this contract will trigger tokensReceived as part of the lifecycle of the BridgedPolygonNORI transaction
   */
  IERC1820RegistryUpgradeable internal constant _ERC1820_REGISTRY =
    IERC1820RegistryUpgradeable(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

  /**
   * @notice Emitted on successful creation of a new schedule.
   */
  event ScheduleCreated(uint256 indexed projectId);

  /**
   * @notice Emitted when unreleased tokens of an active schedule are revoked.
   */
  event TokensRevoked(
    uint256 indexed atTime,
    uint256 indexed removalId,
    uint256 indexed scheduleId,
    uint256 quantity
  );

  /**
   * @notice Emitted on withdrawal of released tokens.
   */
  event TokensClaimed(
    address indexed from,
    address indexed to,
    uint256 indexed scheduleId,
    uint256 quantity
  );

  // todo document expected initialzation state (this is a holdover from LockedNORI, not totally sure what it means)
  function initialize() external initializer {
    super.initialize("https://nori.com/api/restrictionschedule/{id}.json"); // todo which URL do we want to use?
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC1155Supply_init_unchained();
    _ERC1820_REGISTRY.setInterfaceImplementer(
      address(this),
      ERC777_TOKENS_RECIPIENT_HASH,
      address(this)
    );
    _setupRole(SCHEDULE_CREATOR_ROLE, _msgSender());
    _setupRole(TOKEN_REVOKER_ROLE, _msgSender());
    setRestrictionDurationForMethodologyAndVersion(1, 0, SECONDS_IN_TEN_YEARS);
  }

  // View functions and getters =========================================
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, ERC1155PresetMinterPauserUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  /**
   * Returns the schedule duration in seconds that has been set for a given methodology and
   * methodology version.
   */
  function getRestrictionDurationForMethodologyAndVersion(
    uint256 methodology,
    uint256 methodologyVersion
  ) public view returns (RestrictionDuration memory) {
    return
      _methodologyAndVersionToScheduleDuration[methodology][methodologyVersion];
  }

  /** Returns an array of all existing schedule ids, regardless of the status of the schedule. */
  function getAllScheduleIds() external view returns (uint256[] memory) {
    uint256[] memory allScheduleIdsArray = new uint256[](
      _allScheduleIds.length()
    );
    for (uint256 i = 0; i < allScheduleIdsArray.length; i++) {
      allScheduleIdsArray[i] = _allScheduleIds.at(i);
    }
    return allScheduleIdsArray;
  }

  /** Returns an array of all schedule ids of which an address currently owns any tokens. */
  function getScheduleIdsForAccount(address account)
    external
    view
    returns (uint256[] memory)
  {
    EnumerableSetUpgradeable.UintSet
      storage scheduleIdSet = _addressToScheduleIdSet[account];
    uint256[] memory scheduleIds = new uint256[](scheduleIdSet.length());
    for (uint256 i = 0; i < scheduleIds.length; i++) {
      scheduleIds[i] = scheduleIdSet.at(i);
    }
    return scheduleIds;
  }

  /** Returns an account-specific view of the details of a specific schedule. */
  function getScheduleDetailForAccount(address account, uint256 scheduleId)
    public
    view
    returns (ScheduleDetailForAddress memory)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];

    return
      ScheduleDetailForAddress(
        account,
        scheduleId,
        schedule.startTime,
        schedule.endTime,
        balanceOf(account, scheduleId),
        claimableBalanceForScheduleForAccount(scheduleId, account),
        schedule.claimedAmountsByAddress[account],
        schedule.quantitiesRevokedByAddress[account],
        schedule.exists
      );
  }

  /** Returns an account-specific view of the details of all schedules that an account has ownership of. */
  function batchGetScheduleDetailsForAccount(address account)
    external
    view
    returns (ScheduleDetailForAddress[] memory)
  {
    EnumerableSetUpgradeable.UintSet
      storage scheduleIds = _addressToScheduleIdSet[account];
    ScheduleDetailForAddress[]
      memory scheduleDetails = new ScheduleDetailForAddress[](
        scheduleIds.length()
      );
    for (uint256 i = 0; i < scheduleIds.length(); i++) {
      scheduleDetails[i] = getScheduleDetailForAccount(
        account,
        scheduleIds.at(i)
      );
    }
    return scheduleDetails;
  }

  /**
   * Returns summary struct for a schedule.
   */
  function getScheduleSummary(uint256 scheduleId)
    public
    view
    returns (ScheduleSummary memory)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    uint256 numberOfTokenHolders = schedule.tokenHolders.length();
    address[] memory tokenHoldersArray = new address[](numberOfTokenHolders);
    uint256[] memory scheduleIdArray = new uint256[](numberOfTokenHolders);
    for (uint256 i = 0; i < schedule.tokenHolders.length(); i++) {
      tokenHoldersArray[i] = schedule.tokenHolders.at(i);
      scheduleIdArray[i] = scheduleId;
    }

    return
      ScheduleSummary(
        scheduleId,
        schedule.startTime,
        schedule.endTime,
        totalSupply(scheduleId),
        claimableBalanceForSchedule(scheduleId),
        schedule.totalClaimedAmount,
        schedule.totalQuantityRevoked,
        tokenHoldersArray,
        schedule.exists
      );
  }

  /**
   * Returns an array of summary structs for the specified schedules.
   */
  function batchGetScheduleSummaries(uint256[] calldata scheduleIds)
    external
    view
    returns (ScheduleSummary[] memory)
  {
    ScheduleSummary[] memory scheduleSummaries = new ScheduleSummary[](
      scheduleIds.length
    );
    for (uint256 i = 0; i < scheduleIds.length; i++) {
      scheduleSummaries[i] = getScheduleSummary(scheduleIds[i]);
    }
    return scheduleSummaries;
  }

  /** Returns the current number of revocable tokens for a given schedule at the current block timestamp. */
  function revocableQuantityForSchedule(uint256 scheduleId)
    public
    view
    returns (uint256)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    return
      totalSupply(scheduleId) +
      schedule.totalClaimedAmount -
      _releasedBalanceOfSingleSchedule(scheduleId);
  }

  /** Released balance less the total claimed amount at current block timestamp for a schedule. */
  function claimableBalanceForSchedule(uint256 scheduleId)
    public
    view
    returns (uint256)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    if (!schedule.exists) {
      revert NonexistentSchedule({scheduleId: scheduleId});
    }
    return
      _releasedBalanceOfSingleSchedule(scheduleId) -
      schedule.totalClaimedAmount;
  }

  /**
   * A single account's claimable balance at current block timestamp for a schedule
   *
   * @dev calculations have to consider an account's total proportional claim to the schedule's released tokens,
   * using totals constructed from current balances and claimed amounts, and then subtract anything that
   * account has already claimed.
   */
  function claimableBalanceForScheduleForAccount(
    uint256 scheduleId,
    address account
  ) public view returns (uint256) {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    uint256 scheduleTrueTotal = schedule.totalClaimedAmount +
      totalSupply(scheduleId);
    // avoid division by 0
    if (scheduleTrueTotal == 0) {
      return 0;
    }
    uint256 balanceOfAccount = balanceOf(account, scheduleId);
    uint256 claimedAmountForAccount = schedule.claimedAmountsByAddress[account];
    uint256 claimableBalanceForFullSchedule = claimableBalanceForSchedule(
      scheduleId
    );
    uint256 claimableForAccount = ((claimedAmountForAccount +
      balanceOfAccount) *
      (claimableBalanceForFullSchedule + schedule.totalClaimedAmount)) /
      scheduleTrueTotal -
      claimedAmountForAccount;
    return claimableForAccount;
  }

  // External functions ===================================================

  /**
   * Registers the addresses of the market, bpNori, and removal contracts in this contract.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE`
   */
  function registerContractAddresses(
    address marketAddress,
    address bridgedPolygonNoriAddress,
    address removalAddress
  ) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _market = FIFOMarket(marketAddress);
    _bridgedPolygonNori = BridgedPolygonNORI(bridgedPolygonNoriAddress);
    _removal = Removal(removalAddress);
  }

  /**
   * Sets the duration in seconds that should be applied to schedules created on behalf of removals
   * originating from the given methodology and methodology version.

   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE`
   */
  function setRestrictionDurationForMethodologyAndVersion(
    uint256 methodology,
    uint256 methodologyVersion,
    uint256 durationInSeconds
  ) public whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
    _methodologyAndVersionToScheduleDuration[methodology][
      methodologyVersion
    ] = RestrictionDuration(durationInSeconds, true);
  }

  /**
   * Sets up a restriction schedule with parameters determined from the project id.
   *
   *
   * ##### Requirements:
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `SCHEDULE_CREATOR_ROLE` role
   */
  function createSchedule(uint256 projectId)
    external
    whenNotPaused
    onlyRole(SCHEDULE_CREATOR_ROLE)
  {
    if (!_scheduleIdToScheduleStruct[projectId].exists) {
      _createSchedule(projectId);
    }
  }

  /**
   * This function is triggered when BridgedPolygonNORI is sent to this contract
   *
   * @dev Sending BridgedPolygonNORI to this contract triggers the tokensReceived hook defined by the ERC-777 standard
   * because this contract is a registered ERC777 tokens recipient.
   *
   * [See here for more](
   * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-777.md#erc777tokensrecipient-and-the-tokensreceived-hook)
   */
  function tokensReceived(
    address,
    address from,
    address,
    uint256 amount,
    bytes calldata userData,
    bytes calldata operatorData
  ) external override {
    if (!(_msgSender() == address(_bridgedPolygonNori))) {
      revert TokenSenderNotBPNORI();
    }
    if (!(from == address(_market) || hasRole(DEFAULT_ADMIN_ROLE, from))) {
      revert InvalidBpNoriSender({account: from});
    }

    uint256 removalId = abi.decode(userData, (uint256));
    _depositFor(removalId, amount, userData, operatorData);
  }

  /**
   * Claim released tokens and withdraw them to `recipient` address.
   *
   * @dev This function burns `amount` of `RestrictedNORI` for the given schedule id
   * and transfers `amount` of `BridgedPolygonNORI` from the `RestrictedNORI` contract's
   * balance to `recipient`'s balance.
   *
   * Enforcement of the availability of claimable tokens
   * for the `_burn` call happens in `_beforeTokenTransfer`
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   */
  function withdrawFromSchedule(
    address recipient,
    uint256 scheduleId,
    uint256 amount
  ) external returns (bool) {
    super._burn(_msgSender(), scheduleId, amount);
    _bridgedPolygonNori.send(
      // solhint-disable-previous-line check-send-result, because this isn't a solidity send
      recipient,
      amount,
      ""
    );
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    schedule.totalClaimedAmount += amount;
    schedule.claimedAmountsByAddress[_msgSender()] += amount;
    emit TokensClaimed(_msgSender(), recipient, scheduleId, amount);
    return true;
  }

  /**
   * Transfers `amount` tokens of token type `id` from `from` to `to`.
   *
   * [See the OZ ERC1155 documentation for more] (
   * https://docs.openzeppelin.com/contracts/3.x/api/token/erc1155#IERC1155-safeTransferFrom-address-address-uint256-uint256-bytes-)
   */
  function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
  ) public override {
    super.safeTransferFrom(from, to, id, amount, data);
    Schedule storage schedule = _scheduleIdToScheduleStruct[id];
    if (amount != 0) {
      _addressToScheduleIdSet[to].add(id);
      schedule.tokenHolders.add(to);
    }
    if (balanceOf(from, id) == 0) {
      _addressToScheduleIdSet[from].remove(id);
      schedule.tokenHolders.remove(from);
    }
  }

  /**
   * Batched version of `safeTransferFrom`.
   *
   * [See the OZ ERC1155 documentation for more] (
   * https://docs.openzeppelin.com/contracts/3.x/api/token/erc1155#IERC1155-safeBatchTransferFrom-address-address-uint256---uint256---bytes-)
   */
  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public override {
    super.safeBatchTransferFrom(from, to, ids, amounts, data);
    for (uint256 i = 0; i < ids.length; i++) {
      Schedule storage schedule = _scheduleIdToScheduleStruct[ids[i]];
      if (amounts[i] != 0) {
        _addressToScheduleIdSet[to].add(ids[i]);
        schedule.tokenHolders.add(to);
      }
      if (balanceOf(from, ids[i]) == 0) {
        _addressToScheduleIdSet[from].remove(ids[i]);
        schedule.tokenHolders.remove(from);
      }
    }
  }

  /**
   * For each index-matched account, removal id, and amount, revokes amount of tokens from schedule corresponding
   * to the specified removal and transfers to the corresponding account.
   *
   * @dev Transfers any unreleased tokens in the removal id's corresponding schedule and reduces the total supply
   * of that token. No change is made to balances that have released but not yet been claimed.
   * If a token has multiple owners, balances are burned proportionally to ownership percentage, summing to the total
   * amount being revoked.
   *
   * The behavior of this function can be used in two specific ways:
   * - To revoke a specific number of tokens as specified by the `amounts` array.
   * - To revoke all remaining revokable tokens in a schedule set amount to 0 in the `amounts` array.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `TOKEN_REVOKER_ROLE`
   * - The requirements of _beforeTokenTransfer apply to this function
   * - toAccounts.length == removalIds.length == amounts.length
   */
  function batchRevokeUnreleasedTokenAmounts(
    address[] calldata toAccounts,
    uint256[] calldata removalIds,
    uint256[] calldata amounts
  ) external whenNotPaused onlyRole(TOKEN_REVOKER_ROLE) {
    if (!(toAccounts.length == removalIds.length)) {
      revert ArrayLengthMismatch({
        array1Name: "fromAccounts",
        array2Name: "removalIds"
      });
    }
    if (!(toAccounts.length == amounts.length)) {
      revert ArrayLengthMismatch({
        array1Name: "fromAccounts",
        array2Name: "amounts"
      });
    }
    for (uint256 i = 0; i < toAccounts.length; i++) {
      _revokeUnreleasedTokens(toAccounts[i], removalIds[i], amounts[i]);
    }
  }

  // Private implementations ==========================================

  /**
   * Wraps minting of wrapper token and schedule setup.
   *
   * @dev If no schedule is set up for the specified removal id, one is created.
   *
   * @param removalId uint256 The removal for which funds are being deposited.
   * @param amount uint256 Quantity of `_bridgedPolygonNori` to deposit
   * @param userData bytes extra information provided by the user (if any)
   * @param operatorData bytes extra information provided by the operator (if any)
   */
  function _depositFor(
    uint256 removalId,
    uint256 amount,
    bytes memory userData,
    bytes memory operatorData
  ) internal returns (bool) {
    uint256 projectId = _removal.getProjectIdForRemoval(removalId);
    Removal.ScheduleData memory scheduleData = _removal.getScheduleData(
      projectId
    );
    address recipient = scheduleData.supplierAddress;
    if (!_scheduleIdToScheduleStruct[projectId].exists) {
      _createSchedule(projectId);
    }
    super._mint(recipient, projectId, amount, "");
    Schedule storage schedule = _scheduleIdToScheduleStruct[projectId];
    schedule.tokenHolders.add(recipient);
    _addressToScheduleIdSet[recipient].add(projectId);
    return true;
  }

  /**
   * Sets up a schedule for the specified project id (implementation).
   *
   * @dev schedules are created when removal tokens are listed for sale in the market contract,
   * so this should only be invoked during `tokensReceived` in the exceptional case that
   * tokens were sent to this contract without a schedule set up.
   */
  function _createSchedule(uint256 projectId) internal {
    Removal.ScheduleData memory scheduleData = _removal.getScheduleData(
      projectId
    );
    if (scheduleData.startTime == 0) {
      revert InvalidScheduleStartTime({projectId: projectId});
    }
    address recipient = scheduleData.supplierAddress;
    if (recipient == address(0)) {
      revert RecipientCannotBeZeroAddress();
    }
    if (hasRole(SCHEDULE_CREATOR_ROLE, recipient)) {
      revert RecipientCannotHaveRole({
        recipient: recipient,
        role: "SCHEDULE_CREATOR_ROLE"
      });
    }
    if (_scheduleIdToScheduleStruct[projectId].exists) {
      revert ScheduleExists({scheduleTokenId: projectId});
    }
    Schedule storage schedule = _scheduleIdToScheduleStruct[projectId];
    _allScheduleIds.add(projectId);
    RestrictionDuration
      memory restrictionDuration = getRestrictionDurationForMethodologyAndVersion(
        scheduleData.methodology,
        scheduleData.methodologyVersion
      );
    if (!restrictionDuration.wasSet) {
      revert RestrictionDurationNotSet({projectId: projectId});
    }
    _addressToScheduleIdSet[recipient].add(projectId);
    schedule.exists = true;
    schedule.startTime = scheduleData.startTime;
    schedule.endTime = scheduleData.startTime + restrictionDuration.duration;
    schedule.releasedAmountFloor = 0;
    emit ScheduleCreated(projectId);
  }

  /**
   * @notice Revokes unreleased tokens from a schedule.
   * This is an *admin* operation callable only by addresses having TOKEN_REVOKER_ROLE
   * (enforced in `batchRevokeUnreleasedTokenAmounts`)
   *
   * @dev Only the maximum revocable number of tokens (unreleased tokens) can be revoked.
   * Once the tokens have been revoked, the current released amount can never fall below
   * its current level, even if the linear release schedule of the new amount would cause
   * the released amount to be lowered at the current timestamp (a floor is established).
   *
   * Unlike in the `withdrawFromSchedule` function, here we burn `RestrictedNORI`
   * from the schedule owner but send that `BridgedPolygonNORI` back to Nori's
   * treasury or an address of Nori's choosing (the *to* address).
   * The *claimedAmount* is not changed because this is not a claim operation.
   */
  function _revokeUnreleasedTokens(
    address to,
    uint256 removalId,
    uint256 amount
  ) internal {
    uint256 scheduleId = _removal.getProjectIdForRemoval(removalId);
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    if (!schedule.exists) {
      revert NonexistentSchedule({scheduleId: scheduleId});
    }
    uint256 releasedBalance = _releasedBalanceOfSingleSchedule(scheduleId);

    uint256 quantityToRevoke;
    // amount of zero indicates revocation of all remaining tokens.
    if (amount > 0) {
      if (!(amount <= revocableQuantityForSchedule(scheduleId))) {
        revert InsufficientUnreleasedTokens({scheduleId: scheduleId});
      }
      quantityToRevoke = amount;
    } else {
      quantityToRevoke = revocableQuantityForSchedule(scheduleId);
    }

    // burn correct proportion from each token holder
    EnumerableSetUpgradeable.AddressSet storage tokenHolders = schedule
      .tokenHolders;
    uint256[] memory quantitiesToBurnForHolders = new uint256[](
      tokenHolders.length()
    );

    uint256 cumulativeQuantityToBurn = 0;
    for (uint256 i = 0; i < (tokenHolders.length() - 1); i++) {
      uint256 quantityToBurnForHolder = _quantityToRevokePerTokenHolder(
        quantityToRevoke,
        scheduleId,
        tokenHolders.at(i)
      );
      quantitiesToBurnForHolders[i] = quantityToBurnForHolder;
      cumulativeQuantityToBurn += quantityToBurnForHolder;
    }
    quantitiesToBurnForHolders[tokenHolders.length() - 1] =
      quantityToRevoke -
      cumulativeQuantityToBurn;

    for (uint256 i = 0; i < (tokenHolders.length()); i++) {
      super._burn(
        tokenHolders.at(i),
        scheduleId,
        quantitiesToBurnForHolders[i]
      );
      schedule.quantitiesRevokedByAddress[
        tokenHolders.at(i)
      ] += quantitiesToBurnForHolders[i];
    }

    schedule.totalQuantityRevoked += quantityToRevoke;
    _bridgedPolygonNori.send(
      // solhint-disable-previous-line check-send-result, because this isn't a solidity send
      to,
      quantityToRevoke,
      ""
    );
    emit TokensRevoked(
      block.timestamp, // solhint-disable-line not-rely-on-time, this is time-dependent
      removalId,
      scheduleId,
      quantityToRevoke
    );
  }

  /**
   * Hook that is called before any token transfer. This includes minting and burning, as well as batched variants.
   *
   * @dev Follows the rules of hooks defined [here](
   *  https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   * @dev See the ERC1155 specific version [here](
   *  https://docs.openzeppelin.com/contracts/3.x/api/token/erc1155#ERC1155-_beforeTokenTransfer-address-address-address-uint256---uint256---bytes-)
   *
   * ##### Requirements:
   *
   * - the contract must not be paused
   * - One of the following must be true:
   *    - the operation is a mint (which should ONLY occur when BridgedPolygonNORI is being wrapped via `_depositFor`)
   *    - the operation is a burn, which only happens during revocation and withdrawal:
   *      - if the operation is a revocation, that permission is enforced by the TOKEN_REVOKER_ROLE
   *      - if the operation is a withdrawal the burn amount must be <= the sender's claimable balance
   *    - the operation is a transfer and _all_ of the following must be true:
   *      - the operator is operating on their own balance (enforced in the inherited contract)
   *      - the operator has sufficient balance to transfer (enforced in the inherited contract)
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
    override(ERC1155PresetMinterPauserUpgradeable, ERC1155SupplyUpgradeable)
  {
    bool isMinting = from == address(0);
    bool isBurning = to == address(0);

    bool isWithdrawing = isBurning && from == operator;
    bool isTransferring = !isMinting && !isBurning;

    if (isBurning) {
      for (uint256 i = 0; i < ids.length; i++) {
        Schedule storage schedule = _scheduleIdToScheduleStruct[ids[i]];
        schedule.releasedAmountFloor = _releasedBalanceOfSingleSchedule(ids[i]);
      }
    }
    if (isWithdrawing) {
      for (uint256 i = 0; i < ids.length; i++) {
        if (amounts[i] > claimableBalanceForScheduleForAccount(ids[i], from)) {
          revert InsufficientClaimableBalance({
            account: from,
            scheduleId: ids[i]
          });
        }
      }
    }
    return super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  /**
   * Linearly released balance for a single schedule at the current block timestamp, ignoring any
   * released amount floor that has been set for the schedule.
   */
  /* solhint-disable not-rely-on-time, this is time-dependent */
  function _linearReleaseAmountAvailable(uint256 scheduleId)
    internal
    view
    returns (uint256)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    if (block.timestamp >= schedule.endTime) {
      return totalSupply(scheduleId);
    }
    uint256 rampTotalTime = schedule.endTime - schedule.startTime;
    return
      block.timestamp < schedule.startTime
        ? 0
        : (totalSupply(scheduleId) * (block.timestamp - schedule.startTime)) /
          rampTotalTime;
  }

  /* solhint-enable not-rely-on-time */

  /**
   * @dev Calculates the number of tokens that should be revoked from a given token holder and schedule based on their
   * proportion of ownership of that schedule's tokens and the total number of tokens being revoked.
   */
  function _quantityToRevokePerTokenHolder(
    uint256 totalQuantityToRevoke,
    uint256 scheduleId,
    address account
  ) private view returns (uint256) {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    uint256 scheduleTrueTotal = schedule.totalClaimedAmount +
      totalSupply(scheduleId);
    // avoid division by 0
    if (scheduleTrueTotal == 0) {
      return 0;
    }
    uint256 balanceOfAccount = balanceOf(account, scheduleId);
    uint256 claimedAmountForAccount = schedule.claimedAmountsByAddress[account];
    uint256 revocableForAccount = ((claimedAmountForAccount +
      balanceOfAccount) * (totalQuantityToRevoke)) / scheduleTrueTotal;

    return revocableForAccount;
  }

  /**
   * @dev The total amount of released tokens available at the current block timestamp for the schedule.
   * Takes the maximum of either the calculated linearly released amount based on the schedule parameters,
   * or the released amount floor, which is set at the current released amount whenever the balance of a
   * schedule is decreased through revocation or withdrawal.
   */
  function _releasedBalanceOfSingleSchedule(uint256 scheduleId)
    internal
    view
    returns (uint256)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    return
      MathUpgradeable.max(
        _linearReleaseAmountAvailable(scheduleId),
        schedule.releasedAmountFloor
      );
  }

  /**
   * Grants `role` to `account`
   *
   * ### Requirements:
   *    - SCHEDULE_CREATOR_ROLE cannot be granted to an owner of RestrictedNORI tokens
   *
   * [See OZ Access Control docs for more] (
   *  https://docs.openzeppelin.com/contracts/3.x/access-control)
   */
  function _grantRole(bytes32 role, address account) internal virtual override {
    if (role == SCHEDULE_CREATOR_ROLE) {
      if (_addressToScheduleIdSet[account].length() > 0) {
        revert RoleUnassignableToScheduleHolder({
          account: account,
          role: "SCHEDULE_CREATOR_ROLE"
        });
      }
    }
    super._grantRole(role, account);
  }

  // Disabled functions ===========================================
  /**
   * Overridden standard ERC1155.setApprovalForAll that will always revert
   *
   * @dev This function is not currently supported from external callers so we override it to revert.
   */
  function setApprovalForAll(address, bool) public pure override {
    revert OperatorActionsNotSupported();
  }

  /**
   * Overridden standard ERC1155.isApprovedForAll that will always revert
   *
   * @dev This function is not currently supported from external callers so we override it to revert.
   */
  function isApprovedForAll(address, address)
    public
    pure
    override
    returns (bool)
  {
    revert OperatorActionsNotSupported();
  }

  /**
   * Overridden standard ERC1155.burn that will always revert
   *
   * @dev This function is not currently supported from external callers so we override it to revert.
   */
  function burn(
    address,
    uint256,
    uint256
  ) public pure override {
    revert BurningNotSupported();
  }

  /**
   * Overridden standard ERC1155.burnBatch that will always revert
   *
   * @dev This function is not currently supported from external callers so we override it to revert.
   */
  function burnBatch(
    address,
    uint256[] calldata,
    uint256[] calldata
  ) public pure override {
    revert BurningNotSupported();
  }

  /**
   * Overridden standard ERC1155.mint that will always revert
   *
   * @dev This function is not currently supported from external callers so we override it to revert.
   */
  function mint(
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
  ) public pure override {
    revert MintingNotSupported();
  }

  /**
   * Overridden standard ERC1155.mintBatch that will always revert
   *
   * @dev This function is not currently supported from external callers so we override it to revert.
   */
  function mintBatch(
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public pure override {
    revert MintingNotSupported();
  }
}
