// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "./BridgedPolygonNORI.sol";
import "./Removal.sol";
import {RemovalUtils} from "./RemovalUtils.sol";

import "hardhat/console.sol"; // todo

/*
TODO LIST:
Top priority questions for Scott?


============================================================================================
- write out behavior summary as in LockedNORI
  - consider even more detail in the natspec comments

- rename everything using "restricted"

- large market test is blowing block gas limit on minting/listing... what to do about this?
  (maybe split the minting/listing into a few different transactions so that the rest of the large market test
  can proceed as intended)

- any input validation for restriction schedule start times (in Removal.sol) or durations (this contract), other data?
  - idea: create input validation view function that allowlists a hash/fingerprint of what you're actually going to mint
  - and then the vlaidation during mint simply checks if the hash of your input data has been pre-verified in this way
  - OR we just limit how many you can mint at once and go ahead and do the validation in -loop
  - maybe just on the range of earliest possible date and then  20 or so years in the future (maybe use a setter and lookup)

- todo start a notion page for potential gas optimizations?  maybe use a key word for in-contract comments to track these places

- require that for tokensReceived the msg sender is the market contract (requires another circular intialization with the market contract)
  - do we need a registry contract?
  - can we use ENS resolver? (definitely a future PR... maybe create a ticket for this in the future market contract improvements)
  removal gets deployed
  rNORI gets deployed (it does not yet have addresses for removal OR market)
  market gets deployed last and when it's deployed, it calls address setters on its removal and rnori instances from its initializer

- should we emit an address-specific event for revocation? since balance is indeed being burned from each given address.

- should we default to using SECONDS_IN_TEN_YEARS if a duration is not set in the duration lookup? or just revert?
  - no, update the way duration is set to include an "isSet" flag and revert if that isn't set when looking up the duration

- should we have a default behavior if a start time isn't set for a removal when its schedule is being created? revert?
      - no, add input validation to setting this start time when removals are minted so it can't be 0
      - then when the schedule is created just use what's there

- todo about revocation amounts not necessarily summing to the total amount (see in _revokeUnreleasedTokens)

- what should the URI be for this 1155? (covered in another ticket)

- tests tests tests!
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
  error OperatorActionsNotSupported();
  error TokenSenderNotBPNORI();
  error RecipientCannotBeZeroAddress();
  error RecipientCannotHaveRole(address recipient, string role);
  error RestrictionDurationNotSet(uint256 removalId);
  error NonexistentRestrictionSchedule(uint256 scheduleId);
  error RestrictionScheduleExists(
    uint256 scheduleTokenId,
    uint256 removalIdTriggeredCreation
  );
  error RoleCannotTransfer(address account, string role);
  error RoleUnassignableToScheduleHolder(address account, string role);
  error MissingRequiredRole(address account, string role);
  error ArrayLengthMismatch(string array1Name, string array2Name);
  error AllTokensAlreadyReleased(uint256 scheduleId);
  error InsufficientUnreleasedTokens(uint256 scheduleId);
  error InsufficientBalance(address account, uint256 scheduleId);
  error InsufficientClaimableBalance(address account, uint256 scheduleId);

  struct RestrictionSchedule {
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

  struct RestrictionScheduleSummary {
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

  struct RestrictionScheduleDetailForAddress {
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

  /**
   * @notice Role conferring creation of restriction schedules.
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

  mapping(uint256 => mapping(uint256 => uint256))
    private _methodologyAndVersionToRestrictionDuration;

  mapping(address => EnumerableSetUpgradeable.UintSet)
    private _addressToScheduleIdSet;

  mapping(uint256 => RestrictionSchedule) private _scheduleIdToScheduleStruct;

  EnumerableSetUpgradeable.UintSet private _allScheduleIds;

  /**
   * @notice The BridgedPolygonNORI contract that this contract wraps tokens for
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
  IERC1820RegistryUpgradeable private _erc1820; // todo is this even used anywhere?

  // todo we lost access to _ERC1820_REGISTRY when we became an 1155 over a 777, so I dug this
  // straight out of the OZ ERC777 implementation is that ok?
  IERC1820RegistryUpgradeable internal constant _ERC1820_REGISTRY =
    IERC1820RegistryUpgradeable(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

  /**
   * @notice Emitted on successful creation of a new restriction schedule.
   */
  event RestrictionScheduleCreated(
    uint256 indexed scheduleId,
    uint256 indexed removalIdTriggeredCreation
  );

  /**
   * @notice Emitted on when unreleased tokens of an active restriction schedule are revoked.
   */
  event UnreleasedTokensRevoked(
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
  function initialize(
    BridgedPolygonNORI bridgedPolygonNoriAddress,
    Removal removalAddress
  ) external initializer {
    super.initialize("https://nori.com/api/restrictionschedule/{id}.json"); // todo which URL do we want to use?
    address[] memory operators = new address[](1); // todo is this used anywhere? this is a holdover from LockedNORI.sol
    operators[0] = _msgSender();
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC1155Supply_init_unchained();
    _bridgedPolygonNori = bridgedPolygonNoriAddress;
    _removal = removalAddress;
    _removal.initializeRestrictedNORI(address(this));
    _ERC1820_REGISTRY.setInterfaceImplementer(
      address(this),
      ERC777_TOKENS_RECIPIENT_HASH,
      address(this)
    );
    _setupRole(SCHEDULE_CREATOR_ROLE, _msgSender());
    _setupRole(TOKEN_REVOKER_ROLE, _msgSender());
    setRestrictionDurationForMethodologyAndVersion(1, 0, SECONDS_IN_TEN_YEARS);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, ERC1155PresetMinterPauserUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  // View functions and getters =========================================
  /**
   * Returns the restriction schedule duration in seconds that has been set for a given methodology and
   * methodology version.
   */
  function getRestrictionDurationForMethodologyAndVersion(
    uint256 methodology,
    uint256 methodologyVersion
  ) public view returns (uint256) {
    return
      _methodologyAndVersionToRestrictionDuration[methodology][
        methodologyVersion
      ];
  }

  /**
   * Creates a unique, deterministic schedule token id based on a supplier's address, schedule start time,
   * and schedule duration, all of which can be acquired from a removal id.
   */
  function removalIdToScheduleId(uint256 removalId)
    public
    view
    returns (uint256)
  {
    address supplierAddress = removalId.supplierAddress();
    uint256 duration = getRestrictionDurationForMethodologyAndVersion(
      removalId.methodology(),
      removalId.methodologyVersion()
    );
    uint256 scheduleStartTime = _removal
      .getRestrictionScheduleStartTimeForRemoval(removalId);
    return
      uint256(
        keccak256(
          abi.encodePacked(supplierAddress, duration, scheduleStartTime)
        )
      );
  }

  /** Returns an array of all existing schedule ids, regardless of the status of the schedule. */
  function getAllScheduleIds() public view returns (uint256[] memory) {
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
    public
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

  /** Returns an account-specific view of the details of a specific restriction schedule. */
  function getRestrictionScheduleDetailForAccount(
    address account,
    uint256 scheduleId
  ) public view returns (RestrictionScheduleDetailForAddress memory) {
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];

    return
      RestrictionScheduleDetailForAddress(
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

  /** Returns an account-specific view of the details of all restriction schedules that an account has ownership of. */
  function batchGetRestrictionScheduleDetailsForAccount(address account)
    public
    view
    returns (RestrictionScheduleDetailForAddress[] memory)
  {
    EnumerableSetUpgradeable.UintSet
      storage scheduleIds = _addressToScheduleIdSet[account];
    RestrictionScheduleDetailForAddress[]
      memory scheduleDetails = new RestrictionScheduleDetailForAddress[](
        scheduleIds.length()
      );
    for (uint256 i = 0; i < scheduleIds.length(); i++) {
      scheduleDetails[i] = getRestrictionScheduleDetailForAccount(
        account,
        scheduleIds.at(i)
      );
    }
    return scheduleDetails;
  }

  /**
   * Returns summary struct for a restriction schedule.
   */
  function getRestrictionScheduleSummary(uint256 scheduleId)
    public
    view
    returns (RestrictionScheduleSummary memory)
  {
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    uint256 numberOfTokenHolders = schedule.tokenHolders.length();
    address[] memory tokenHoldersArray = new address[](numberOfTokenHolders);
    uint256[] memory scheduleIdArray = new uint256[](numberOfTokenHolders);
    for (uint256 i = 0; i < schedule.tokenHolders.length(); i++) {
      tokenHoldersArray[i] = schedule.tokenHolders.at(i);
      scheduleIdArray[i] = scheduleId;
    }

    return
      RestrictionScheduleSummary(
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
   * Returns an array of summary structs for the specified restriction schedules.
   */
  function batchGetRestrictionScheduleSummaries(uint256[] calldata scheduleIds)
    public
    view
    returns (RestrictionScheduleSummary[] memory)
  {
    RestrictionScheduleSummary[]
      memory scheduleSummaries = new RestrictionScheduleSummary[](
        scheduleIds.length
      );
    for (uint256 i = 0; i < scheduleIds.length; i++) {
      scheduleSummaries[i] = getRestrictionScheduleSummary(scheduleIds[i]);
    }
    return scheduleSummaries;
  }

  /** Returns the current number of revocable tokens for a given schedule at the current block timestamp. */
  function revocableQuantityForSchedule(uint256 scheduleId)
    public
    view
    returns (uint256)
  {
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    return
      totalSupply(scheduleId) +
      schedule.totalClaimedAmount -
      _releasedBalanceOfSingleSchedule(scheduleId);
  }

  /** Released balance less the total claimed amount at current block timestamp for a restriction schedule. */
  function claimableBalanceForSchedule(uint256 scheduleId)
    public
    view
    returns (uint256)
  {
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    if (!schedule.exists) {
      revert NonexistentRestrictionSchedule({scheduleId: scheduleId});
    }
    return
      _releasedBalanceOfSingleSchedule(scheduleId) -
      schedule.totalClaimedAmount;
  }

  /**
   * A single account's claimable balance at current block timestamp for a restriction schedule
   *
   * @dev calculations have to consider an account's total proportional claim to the schedule's released tokens,
   * using totals constructed from current balances and claimed amounts, and then subtract anything that
   * account has already claimed.
   */
  function claimableBalanceForScheduleForAccount(
    uint256 scheduleId,
    address account
  ) public view returns (uint256) {
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    uint256 scheduleTrueTotal = schedule.totalClaimedAmount +
      totalSupply(scheduleId);
    // avoid division by 0
    if (scheduleTrueTotal == 0) {
      return 0;
    }
    uint256 balanceOfAccount = balanceOf(account, scheduleId);
    uint256 claimedAmountForAccount = schedule.claimedAmountsByAddress[account];
    uint256 claimableBalanceForSchedule = claimableBalanceForSchedule(
      scheduleId
    );
    uint256 claimableForAccount = ((claimedAmountForAccount +
      balanceOfAccount) *
      (claimableBalanceForSchedule + schedule.totalClaimedAmount)) /
      scheduleTrueTotal -
      claimedAmountForAccount;
    return claimableForAccount;
  }

  // External functions ===================================================
  /**
   * Sets the duration in seconds that should be applied to restriction schedules created on behalf of removals
   * originating from the given methodology and methodology version.

   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `SCHEDULE_CREATOR_ROLE` role
   */
  function setRestrictionDurationForMethodologyAndVersion(
    uint256 methodology,
    uint256 methodologyVersion,
    uint256 durationInSeconds
  ) public whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
    _methodologyAndVersionToRestrictionDuration[methodology][
      methodologyVersion
    ] = durationInSeconds;
  }

  /**
   * Sets up a batch of restriction schedules with parameters determined from the removal ids.
   *
   *
   * ##### Requirements:
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `SCHEDULE_CREATOR_ROLE` role
   */
  function batchCreateRestrictionSchedule(uint256[] calldata removalIds)
    external
    whenNotPaused
    onlyRole(SCHEDULE_CREATOR_ROLE)
  {
    for (uint256 i = 0; i < removalIds.length; i++) {
      uint256 scheduleId = removalIdToScheduleId(removalIds[i]);
      if (!_scheduleIdToScheduleStruct[scheduleId].exists) {
        _createRestrictionSchedule(removalIds[i]);
      }
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
    address sender,
    address,
    address,
    uint256 amount,
    bytes calldata userData,
    bytes calldata operatorData
  ) external override {
    if (!(_msgSender() == address(_bridgedPolygonNori))) {
      revert TokenSenderNotBPNORI();
    }
    // todo require that _msgSender() IS the market contract (avoid polluting schedule creation)
    // the market address is probably already in on eof these unused data params
    // (and if it's not we could put it htere?)
    // because it's coming from the curren towner of the tokens that are being sent here
    // if (!hasRole(SCHEDULE_CREATOR_ROLE, sender)) {
    //   revert MissingRequiredRole({
    //     account: sender,
    //     role: "SCHEDULE_CREATOR_ROLE"
    //   });
    // }

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
  function withdrawFromRestrictionSchedule(
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
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
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
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[id];
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
      RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
        ids[i]
      ];
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
   * For each index-matched account, removal id, and amount, revokes amount of tokens from restriction schedule corresponding
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
   * - Can only be used when the caller has the `SCHEDULE_CREATOR_ROLE` role
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
   * Wraps minting of wrapper token and restriction schedule setup.
   *
   * @dev If no restriction schedule is set up for the specified removal id, one is created.
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
    address recipient = removalId.supplierAddress();
    uint256 scheduleId = removalIdToScheduleId(removalId);
    if (!_scheduleIdToScheduleStruct[scheduleId].exists) {
      _createRestrictionSchedule(removalId);
    }
    super._mint(recipient, scheduleId, amount, "");
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    schedule.tokenHolders.add(recipient);
    _addressToScheduleIdSet[recipient].add(scheduleId);
    return true;
  }

  /**
   * Sets up an restriction schedule for the specified removal id (implementation).
   *
   * @dev schedules are created when removal tokens are listed for sale in the market contract,
   * so this should only be invoked during `tokensReceived` in the exceptional case that
   * tokens were sent to this contract without a schedule set up.
   */
  function _createRestrictionSchedule(uint256 removalId) internal {
    address recipient = removalId.supplierAddress();
    uint256 startTime = _removal.getRestrictionScheduleStartTimeForRemoval(
      removalId
    );
    uint256 scheduleId = removalIdToScheduleId(removalId);
    if (address(recipient) == address(0)) {
      revert RecipientCannotBeZeroAddress();
    }
    if (hasRole(SCHEDULE_CREATOR_ROLE, recipient)) {
      revert RecipientCannotHaveRole({
        recipient: recipient,
        role: "SCHEDULE_CREATOR_ROLE"
      });
    }
    if (_scheduleIdToScheduleStruct[scheduleId].exists) {
      revert RestrictionScheduleExists({
        scheduleTokenId: scheduleId,
        removalIdTriggeredCreation: removalId
      });
    }
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    _allScheduleIds.add(scheduleId);
    uint256 restrictionDuration = getRestrictionDurationForMethodologyAndVersion(
        removalId.methodology(),
        removalId.methodologyVersion()
      );
    if (restrictionDuration == 0) {
      // todo duration is actually a uint256 and bool tuple where bool represent set, check set not duration
      revert RestrictionDurationNotSet({removalId: removalId});
    }
    _addressToScheduleIdSet[recipient].add(scheduleId);
    schedule.exists = true;
    schedule.startTime = startTime;
    schedule.endTime = startTime + restrictionDuration;
    schedule.releasedAmountFloor = 0;
    emit RestrictionScheduleCreated(scheduleId, removalId);
  }

  /**
   * @notice Revokes unreleased tokens from a restriction schedule.
   * This is an *admin* operation callable only by addresses having TOKEN_REVOKER_ROLE
   * (enforced in `batchRevokeUnreleasedTokenAmounts`)
   *
   * @dev Only the maximum revocable number of tokens (unreleased tokens) can be revoked.
   * Once the tokens have been revoked, the current released amount can never fall below
   * its current level, even if the linear release schedule of the new amount would cause
   * the released amount to be lowered at the current timestamp (a floor is established).
   *
   * Unlike in the `withdrawFromRestrictionSchedule` function, here we burn `RestrictedNORI`
   * from the restriction schedule owner but send that `BridgedPolygonNORI` back to Nori's
   * treasury or an address of Nori's choosing (the *to* address).
   * The *claimedAmount* is not changed because this is not a claim operation.
   */
  function _revokeUnreleasedTokens(
    address to,
    uint256 removalId,
    uint256 amount
  ) internal {
    uint256 scheduleId = removalIdToScheduleId(removalId);
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    if (!schedule.exists) {
      revert NonexistentRestrictionSchedule({scheduleId: scheduleId});
    }
    uint256 releasedBalance = _releasedBalanceOfSingleSchedule(scheduleId);
    // todo maybe remove this redundant check?
    if (!(releasedBalance < totalSupply(scheduleId))) {
      revert AllTokensAlreadyReleased({scheduleId: scheduleId});
    }

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
    for (uint256 i = 0; i < tokenHolders.length(); i++) {
      quantitiesToBurnForHolders[i] = _quantityToRevokePerTokenHolder(
        quantityToRevoke,
        scheduleId,
        tokenHolders.at(i)
      );
    }
    for (uint256 i = 0; i < tokenHolders.length(); i++) {
      super._burn(
        tokenHolders.at(i),
        scheduleId,
        quantitiesToBurnForHolders[i]
      );
      schedule.quantitiesRevokedByAddress[
        tokenHolders.at(i)
      ] += quantitiesToBurnForHolders[i];
    }
    // TODO it's possible that since integer division rounds toward 0 in solidity, we end up with
    // burned values per holder that don't quite add up to the total quantity to be revoked!
    // for example, totalSupply 100, revoking 50, one balance is 31, another balance is 69, that's going to
    // revoke 15.5 and 34.4 respectively, which is actually 15 and 34, which sums to 49 and not 50!
    // granted, real token amounts will usually be much larger values where the truncations are insignificant
    // ... but still, we should update this struct with the real value by summing across the burnable amounts
    // for all holders.
    schedule.totalQuantityRevoked += quantityToRevoke;
    _bridgedPolygonNori.send(
      // solhint-disable-previous-line check-send-result, because this isn't a solidity send
      to,
      quantityToRevoke,
      ""
    );
    emit UnreleasedTokensRevoked(
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
   *      - the operator does not have the admin roles DEFAULT_ADMIN_ROLE or SCHEDULE_CREATOR_ROLE
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
        RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
          ids[i]
        ];
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
   * @dev The total amount of the linear release available at the current block timestamp for the schedule.
   * Takes the maximum of either the calculated released amount based on the schedule parameters and total amount,
   * or the released amount floor, which is set at the current released amount whenever the balance of a schedule
   * is decreased through revocation.
   */
  function _linearReleaseAmountAvailable(uint256 scheduleId)
    internal
    view
    returns (uint256)
  {
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
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

  /**
   * @dev Calculates the number of tokens that can be revoked from a given token holder and schedule based on their
   * proportion of ownership of that schedule's tokens.
   */
  function _quantityToRevokePerTokenHolder(
    uint256 totalQuantityToRevoke,
    uint256 scheduleId,
    address account
  ) private view returns (uint256) {
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    uint256 scheduleTrueTotal = schedule.totalClaimedAmount +
      totalSupply(scheduleId);
    // avoid division by 0
    if (scheduleTrueTotal == 0) {
      return 0;
    }
    uint256 balanceOfAccount = balanceOf(account, scheduleId);
    uint256 claimedAmountForAccount = schedule.claimedAmountsByAddress[account];
    uint256 claimableBalanceForSchedule = claimableBalanceForSchedule(
      scheduleId
    );
    uint256 revocableForAccount = ((claimedAmountForAccount +
      balanceOfAccount) * (totalQuantityToRevoke)) / scheduleTrueTotal;

    return revocableForAccount;
  }

  /** Released balance for a single restriction schedule at the current block timestamp. */
  function _releasedBalanceOfSingleSchedule(uint256 scheduleId)
    internal
    view
    returns (uint256)
  {
    RestrictionSchedule storage schedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
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
}
