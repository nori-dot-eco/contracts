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
- batchGetEscrowScheduleSummaries(uint256[] memory scheduleIds)

- expose a single version of revokeUnreleasedTokens? maybe not

- look through for other TODOS

- what should the URI be for this 1155?

- update all the natspec comments

- tests tests tests!
 */

// Based on average year duration of 365.2425 days, which accounts for leap years
uint256 constant SECONDS_IN_TEN_YEARS = 315_569_520;

error BurningNotSupported();
error TokenSenderNotBPNORI();
error RecipientCannotBeZeroAddress();
error RecipientCannotHaveRole(address recipient, string role);
error EscrowDurationNotSet(uint256 removalId);
error NonexistentEscrowSchedule(uint256 scheduleId);
error EscrowScheduleExists(
  uint256 scheduleTokenId,
  uint256 removalIdTriggeredCreation
);
error RoleCannotTransfer(address account, string role);
error RoleUnassignableToEscrowScheduleHolder(address account, string role);
error MissingRequiredRole(address account, string role);
error ArrayLengthMismatch(string array1Name, string array2Name);
error AllTokensAlreadyReleased(uint256 scheduleId);
error InsufficientUnreleasedTokens(uint256 scheduleId);
error InsufficientBalance(address account, uint256 scheduleId);
error LogicError(string message);

contract EscrowedNORI is
  IERC777RecipientUpgradeable,
  ERC1155PresetMinterPauserUpgradeable,
  ERC1155SupplyUpgradeable
{
  using RemovalUtils for uint256;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

  struct EscrowSchedule {
    uint256 startTime;
    uint256 endTime;
    uint256 totalSupply;
    uint256 totalClaimedAmount;
    bool exists;
    uint256 totalQuantityRevoked;
    uint256 releasedAmountFloor;
    EnumerableSetUpgradeable.AddressSet tokenHolders;
    mapping(address => uint256) claimedAmountsByAddress;
    mapping(address => uint256) quantitiesRevokedByAddress;
  }

  struct EscrowScheduleSummary {
    uint256 scheduleTokenId;
    uint256 startTime;
    uint256 endTime;
    uint256 totalSupply;
    uint256 totalClaimableAmount;
    uint256 totalClaimedAmount; // todo do we want these?  or do we want these and not the others?
    uint256 totalQuantityRevoked;
    address[] tokenHolders;
    bool exists;
  }

  struct EscrowScheduleDetailForAddress {
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
   * @notice Role conferring creation and revocation of escrow schedules.
   */
  bytes32 public constant ESCROW_CREATOR_ROLE =
    keccak256("ESCROW_CREATOR_ROLE");

  /**
   * @notice Used to register the ERC777TokensRecipient recipient interface in the
   * ERC-1820 registry
   *
   * @dev Registering that EscrowedNORI implements the ERC777TokensRecipient interface with the registry is a
   * requirement to be able to receive ERC-777 BridgedPolygonNORI tokens. Once registered, sending BridgedPolygonNORI
   * tokens to this contract will trigger tokensReceived as part of the lifecycle of the BridgedPolygonNORI transaction
   */
  bytes32 public constant ERC777_TOKENS_RECIPIENT_HASH =
    keccak256("ERC777TokensRecipient");

  mapping(uint256 => mapping(uint256 => uint256))
    private _methodologyAndVersionToEscrowDuration;

  mapping(address => EnumerableSetUpgradeable.UintSet)
    private _addressToScheduleIdSet;

  mapping(uint256 => EscrowSchedule) private _scheduleIdToScheduleStruct;

  EnumerableSetUpgradeable.UintSet private _allScheduleIds;

  /**
   * @notice The BridgedPolygonNORI contract that this contract wraps tokens for
   */
  BridgedPolygonNORI private _bridgedPolygonNori;

  /**
   * @notice The Removal contract that accounts for supply.
   */
  Removal private _removal;

  /**
   * @notice The [ERC-1820](https://eips.ethereum.org/EIPS/eip-1820) pseudo-introspection registry
   * contract
   *
   * @dev Registering that EscrowedNORI implements the ERC777TokensRecipient interface with the registry is a
   * requirement to be able to receive ERC-777 BridgedPolygonNORI tokens. Once registered, sending BridgedPolygonNORI
   * tokens to this contract will trigger tokensReceived as part of the lifecycle of the BridgedPolygonNORI transaction
   */
  IERC1820RegistryUpgradeable private _erc1820; // todo is this even used anywhere?

  // todo we lost access to _ERC1820_REGISTRY when we became an 1155 over a 777, so I dug this
  // straight out of the 777 implementation is that ok?
  IERC1820RegistryUpgradeable internal constant _ERC1820_REGISTRY =
    IERC1820RegistryUpgradeable(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

  /**
   * @notice Emitted on successful creation of a new escrow schedule.
   */
  event EscrowScheduleCreated(
    uint256 indexed scheduleId,
    uint256 indexed removalIdTriggeredCreation
  );

  /**
   * @notice Emitted on when unreleased tokens of an active escrow schedule are revoked.
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

  // todo document expected initialzation state
  function initialize(
    BridgedPolygonNORI bridgedPolygonNoriAddress,
    Removal removalAddress
  ) external initializer {
    super.initialize("https://nori.com/api/escrowschedule/{id}.json"); // todo which URL do we want to use?
    address[] memory operators = new address[](1);
    operators[0] = _msgSender();
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC1155Supply_init_unchained();
    _bridgedPolygonNori = bridgedPolygonNoriAddress;
    _removal = removalAddress;
    _removal.initializeEscrowedNORI(address(this));
    _ERC1820_REGISTRY.setInterfaceImplementer(
      address(this),
      ERC777_TOKENS_RECIPIENT_HASH,
      address(this)
    );
    _grantRole(ESCROW_CREATOR_ROLE, _msgSender());
    setEscrowDurationForMethodologyAndVersion(1, 0, SECONDS_IN_TEN_YEARS);
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
  function getEscrowDurationForMethodologyAndVersion(
    uint256 methodology,
    uint256 methodologyVersion
  ) public view returns (uint256) {
    return
      _methodologyAndVersionToEscrowDuration[methodology][methodologyVersion];
  }

  function removalIdToScheduleId(uint256 removalId)
    public
    view
    returns (uint256)
  {
    address supplierAddress = removalId.supplierAddress();
    uint256 methodology = removalId.methodology();
    uint256 scheduleStartTime = _removal.getEscrowScheduleStartTimeForRemoval(
      removalId
    );
    return
      uint256(
        keccak256(
          abi.encodePacked(supplierAddress, methodology, scheduleStartTime)
        )
      );
  }

  function getAllScheduleIds() public view returns (uint256[] memory) {
    uint256[] memory allScheduleIdsArray = new uint256[](
      _allScheduleIds.length()
    );
    for (uint256 i = 0; i < allScheduleIdsArray.length; i++) {
      allScheduleIdsArray[i] = _allScheduleIds.at(i);
    }
    return allScheduleIdsArray;
  }

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

  function getEscrowScheduleDetailForAccount(
    address account,
    uint256 scheduleId
  ) public view returns (EscrowScheduleDetailForAddress memory) {
    EscrowSchedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];

    return
      EscrowScheduleDetailForAddress(
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

  function batchGetEscrowScheduleDetailsForAccount(address account)
    public
    view
    returns (EscrowScheduleDetailForAddress[] memory)
  {
    EnumerableSetUpgradeable.UintSet
      storage scheduleIds = _addressToScheduleIdSet[account];
    EscrowScheduleDetailForAddress[]
      memory escrowScheduleDetails = new EscrowScheduleDetailForAddress[](
        scheduleIds.length()
      );
    for (uint256 i = 0; i < scheduleIds.length(); i++) {
      escrowScheduleDetails[i] = getEscrowScheduleDetailForAccount(
        account,
        scheduleIds.at(i)
      );
    }
    return escrowScheduleDetails;
  }

  // TODO do we want a batchGetAllEscrowSchedules?
  // do we want a batchGetAllEscrowScheduleSummariesForAccount ?
  // do we want a batchGetEscrowScheduleSummaries that takes an array of schedule ids to fetch??
  // that way it's configurable... the first call could get ALL escrow schedule ids OR just a single accounts escrow schedule ids
  // and the second call could get the rest of the specific data we want.  probably that.
  // /**
  //  * @notice Returns details for all escrow schedules associated with an account.
  //  *
  //  */
  // function getEscrowSchedulesForAccount(address account)
  //   public
  //   view
  //   returns (EscrowScheduleDetail[] memory)
  // {
  //   EnumerableSetUpgradeable.UintSet
  //     storage scheduleIds = _addressToScheduleIdSet[account];
  //   EscrowScheduleDetail[]
  //     memory escrowScheduleDetails = new EscrowScheduleDetail[](
  //       scheduleIds.length()
  //     );
  //   for (uint256 i = 0; i < scheduleIds.length(); i++) {
  //     escrowScheduleDetails[i] = getEscrowScheduleSummary(scheduleIds.at(i));
  //   }
  //   return escrowScheduleDetails;
  // }

  /**
   * @notice Returns details for an escrow schedule.
   */
  function getEscrowScheduleSummary(uint256 scheduleId)
    public
    view
    returns (EscrowScheduleSummary memory)
  {
    EscrowSchedule storage escrowSchedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    uint256 numberOfTokenHolders = escrowSchedule.tokenHolders.length();
    address[] memory tokenHoldersArray = new address[](numberOfTokenHolders);
    uint256[] memory scheduleIdArray = new uint256[](numberOfTokenHolders);
    for (uint256 i = 0; i < escrowSchedule.tokenHolders.length(); i++) {
      tokenHoldersArray[i] = escrowSchedule.tokenHolders.at(i);
      scheduleIdArray[i] = scheduleId;
    }

    return
      EscrowScheduleSummary(
        scheduleId,
        escrowSchedule.startTime,
        escrowSchedule.endTime,
        totalSupply(scheduleId),
        claimableBalanceForSchedule(scheduleId),
        escrowSchedule.totalClaimedAmount,
        escrowSchedule.totalQuantityRevoked,
        tokenHoldersArray,
        escrowSchedule.exists
      );
  }

  function revocableQuantityForSchedule(uint256 scheduleId)
    public
    view
    returns (uint256)
  {
    EscrowSchedule storage escrowSchedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    return
      escrowSchedule.totalSupply -
      _releasedBalanceOfSingleEscrowSchedule(scheduleId);
  }

  // TODO does this need to be public or do we only anticipate using this privately?
  function revocableQuantityForScheduleForAccount(
    uint256 scheduleId,
    address account
  ) public view returns (uint256) {
    uint256 revocableQuantityForSchedule = revocableQuantityForSchedule(
      scheduleId
    );
    // todo this might be a common calculation that could use a utility
    return
      (revocableQuantityForSchedule * balanceOf(account, scheduleId)) /
      totalSupply(scheduleId);
  }

  /**
   * @notice Released balance less any claimed amount at current block timestamp for a single escrow schedule
   */
  function claimableBalanceForSchedule(uint256 scheduleId)
    public
    view
    returns (uint256)
  {
    EscrowSchedule storage escrowSchedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    if (!escrowSchedule.exists) {
      revert NonexistentEscrowSchedule({scheduleId: scheduleId});
    }
    return
      _releasedBalanceOfSingleEscrowSchedule(scheduleId) -
      escrowSchedule.totalClaimedAmount;
  }

  /**
   * @notice Released balance less any claimed amount at current block timestamp for a single escrow schedule and account
   */
  function claimableBalanceForScheduleForAccount(
    uint256 scheduleId,
    address account
  ) public view returns (uint256) {
    uint256 claimableBalanceForSchedule = claimableBalanceForSchedule(
      scheduleId
    );
    // todo this might be a common calculation that could use a utility
    return
      (claimableBalanceForSchedule * balanceOf(account, scheduleId)) /
      totalSupply(scheduleId);
  }

  // External functions ===================================================
  function setEscrowDurationForMethodologyAndVersion(
    uint256 methodology,
    uint256 methodologyVersion,
    uint256 durationInSeconds
  ) public whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
    _methodologyAndVersionToEscrowDuration[methodology][
      methodologyVersion
    ] = durationInSeconds;
  }

  /**
   * @notice Sets up an escrow schedule for recipient.
   *
   * @dev This function can be used as an alternative way to set up an escrow schedule that doesn't require
   * wrapping BridgedPolygonNORI first.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `ESCROW_CREATOR_ROLE` role
   */
  function createEscrowSchedule(uint256 removalId)
    external
    whenNotPaused
    onlyRole(ESCROW_CREATOR_ROLE)
  {
    _createEscrowSchedule(removalId);
  }

  /**
   * @notice Sets up a batch of escrow schedules.
   *
   *
   * ##### Requirements:
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `ESCROW_CREATOR_ROLE` role
   */
  function batchCreateEscrowSchedule(uint256[] calldata removalIds)
    external
    whenNotPaused
    onlyRole(ESCROW_CREATOR_ROLE)
  {
    for (uint256 i = 0; i < removalIds.length; i++) {
      uint256 scheduleId = removalIdToScheduleId(removalIds[i]);
      if (!_scheduleIdToScheduleStruct[scheduleId].exists) {
        _createEscrowSchedule(removalIds[i]);
      }
    }
  }

  /**
   * @notice This function is triggered when BridgedPolygonNORI is sent to this contract
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
    if (!hasRole(ESCROW_CREATOR_ROLE, sender)) {
      revert MissingRequiredRole({
        account: sender,
        role: "ESCROW_CREATOR_ROLE"
      });
    }

    uint256 removalId = abi.decode(userData, (uint256));
    _depositFor(removalId, amount, userData, operatorData);
  }

  /**
   * @notice Claim unlocked tokens and withdraw them to *to* address.
   *
   * @dev This function burns `amount` of `EscrowedNORI` and transfers `amount`
   * of `BridgedPolygonNORI` from the `EscrowedNORI` contract's balance to
   * `_msgSender()`'s balance.
   *
   * Enforcement of the availability of claimable tokens
   * for the `_burn` call happens in `_beforeTokenTransfer`
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   */
  function withdrawFromEscrowSchedule(
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
    EscrowSchedule storage escrowSchedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    escrowSchedule.totalClaimedAmount += amount;
    escrowSchedule.claimedAmountsByAddress[_msgSender()] += amount;
    emit TokensClaimed(_msgSender(), recipient, scheduleId, amount);
    return true;
  }

  function safeTransferFrom(
    address from,
    address to,
    uint256 id,
    uint256 amount,
    bytes memory data
  ) public override {
    if (hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
      revert RoleCannotTransfer({
        account: _msgSender(),
        role: "DEFAULT_ADMIN_ROLE"
      });
    }
    if (hasRole(ESCROW_CREATOR_ROLE, _msgSender())) {
      revert RoleCannotTransfer({
        account: _msgSender(),
        role: "ESCROW_CREATOR_ROLE"
      });
    }
    super.safeTransferFrom(from, to, id, amount, data);
    EscrowSchedule storage escrowSchedule = _scheduleIdToScheduleStruct[id];
    if (amount != 0) {
      _addressToScheduleIdSet[to].add(id);
      escrowSchedule.tokenHolders.add(to);
    }
    if (balanceOf(from, id) == 0) {
      _addressToScheduleIdSet[from].remove(id);
      escrowSchedule.tokenHolders.remove(from);
    }
  }

  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public override {
    if (hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
      revert RoleCannotTransfer({
        account: _msgSender(),
        role: "DEFAULT_ADMIN_ROLE"
      });
    }
    if (hasRole(ESCROW_CREATOR_ROLE, _msgSender())) {
      revert RoleCannotTransfer({
        account: _msgSender(),
        role: "ESCROW_CREATOR_ROLE"
      });
    }
    super.safeBatchTransferFrom(from, to, ids, amounts, data);
    for (uint256 i = 0; i < ids.length; i++) {
      EscrowSchedule storage escrowSchedule = _scheduleIdToScheduleStruct[
        ids[i]
      ];
      if (amounts[i] != 0) {
        _addressToScheduleIdSet[to].add(ids[i]);
        escrowSchedule.tokenHolders.add(to);
      }
      if (balanceOf(from, ids[i]) == 0) {
        _addressToScheduleIdSet[from].remove(ids[i]);
        escrowSchedule.tokenHolders.remove(from);
      }
    }
  }

  /**
   * @notice Truncates a batch of escrow schedules of amounts in a single go
   *
   * @dev Transfers any unreleased tokens in `fromAccounts`'s escrow to `to` and reduces the total amount. No change
   * is made to balances that have released but not yet been claimed.
   *
   * The behavior of this function can be used in two specific ways:
   * - To revoke all remaining revokable tokens in a batch (regardless of time), set amount to 0 in the `amounts` array.
   * - To revoke tokens at the current block timestamp, set atTimes to 0 in the `amounts` array.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `ESCROW_CREATOR_ROLE` role
   * - The requirements of _beforeTokenTransfer apply to this function
   * - fromAccounts.length == toAccounts.length == atTimes.length == amounts.length
   */
  function batchRevokeUnreleasedTokenAmounts(
    address[] calldata toAccounts,
    uint256[] calldata removalIds,
    uint256[] calldata amounts
  ) external whenNotPaused onlyRole(ESCROW_CREATOR_ROLE) {
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
   * @notice Wraps minting of wrapper token and escrow schedule setup.
   *
   * @dev If `startTime` is zero no escrow schedule is set up.
   * Satisfies situations where funding of the account happens over time.
   *
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
      _createEscrowSchedule(removalId);
    }
    super._mint(recipient, scheduleId, amount, "");
    EscrowSchedule storage escrowSchedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    escrowSchedule.totalSupply += amount;
    escrowSchedule.tokenHolders.add(recipient);
    _addressToScheduleIdSet[recipient].add(scheduleId);
    return true;
  }

  /**
   * @notice Sets up an escrow schedule for recipient (implementation).
   *
   * This will be invoked via the `tokensReceived` callback for cases
   * where we have the tokens in hand at the time we set up the escrow schedule.
   *
   * It is also callable externally
   */
  function _createEscrowSchedule(uint256 removalId) internal {
    address recipient = removalId.supplierAddress();
    uint256 startTime = _removal.getEscrowScheduleStartTimeForRemoval(
      removalId
    );
    uint256 scheduleId = removalIdToScheduleId(removalId);
    if (address(recipient) == address(0)) {
      revert RecipientCannotBeZeroAddress();
    }
    if (hasRole(ESCROW_CREATOR_ROLE, recipient)) {
      revert RecipientCannotHaveRole({
        recipient: recipient,
        role: "ESCROW_CREATOR_ROLE"
      });
    }
    if (_scheduleIdToScheduleStruct[scheduleId].exists) {
      revert EscrowScheduleExists({
        scheduleTokenId: scheduleId,
        removalIdTriggeredCreation: removalId
      });
    }
    EscrowSchedule storage escrowSchedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    _allScheduleIds.add(scheduleId);
    uint256 escrowDuration = getEscrowDurationForMethodologyAndVersion(
      removalId.methodology(),
      removalId.methodologyVersion()
    );
    if (escrowDuration == 0) {
      revert EscrowDurationNotSet({removalId: removalId});
    }
    _addressToScheduleIdSet[recipient].add(scheduleId);
    escrowSchedule.totalSupply = 0;
    escrowSchedule.exists = true;
    escrowSchedule.startTime = startTime;
    escrowSchedule.endTime = startTime + escrowDuration;
    escrowSchedule.releasedAmountFloor = 0;
    emit EscrowScheduleCreated(scheduleId, removalId);
  }

  /**
   * @notice Truncates an escrow schedule.
   * This is an *admin* operation callable only by addresses having ESCROW_CREATOR_ROLE
   * (enforced in `batchRevokeUnreleasedTokenAmounts`)
   * @dev The implementation never updates underlying schedules
   * but only the escrow schedule amount.  This avoids changing the behavior of the grant
   * before the point of revocation.  Anytime an unlock schedule is in
   * play the corresponding balance functions need to take care to never return
   * more than the grant amount less the claimed amount.
   *
   * Unlike in the `claim` function, here we burn `EscrowedNORI` from the escrow schedule owner but
   * send that `BridgedPolygonNORI` back to Nori's treasury or an address of Nori's
   * choosing (the *to* address).  The *claimedAmount* is not changed because this is
   * not a claim operation.
   */
  function _revokeUnreleasedTokens(
    address to,
    uint256 removalId,
    uint256 amount
  ) internal {
    address revokeFrom = removalId.supplierAddress();
    uint256 scheduleId = removalIdToScheduleId(removalId);
    EscrowSchedule storage escrowSchedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    if (!escrowSchedule.exists) {
      revert NonexistentEscrowSchedule({scheduleId: scheduleId});
    }
    uint256 releasedBalance = _releasedBalanceOfSingleEscrowSchedule(
      scheduleId
    );
    if (!(releasedBalance < escrowSchedule.totalSupply)) {
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

    escrowSchedule.totalSupply = escrowSchedule.totalSupply - quantityToRevoke;
    escrowSchedule.releasedAmountFloor = releasedBalance;
    escrowSchedule.totalQuantityRevoked += quantityToRevoke;
    // burn correct proportion from each token holder
    EnumerableSetUpgradeable.AddressSet storage tokenHolders = escrowSchedule
      .tokenHolders;
    for (uint256 i = 0; i < tokenHolders.length(); i++) {
      uint256 burnableAmountForHolder = revocableQuantityForScheduleForAccount(
        scheduleId,
        tokenHolders.at(i)
      );
      super._burn(tokenHolders.at(i), scheduleId, burnableAmountForHolder);
      escrowSchedule.quantitiesRevokedByAddress[
        tokenHolders.at(i)
      ] += burnableAmountForHolder;
    }
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
   * @notice Hook that is called before send, transfer, mint, and burn. Used used to disable transferring locked nori.
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
   *      - the operator has ESCROW_CREATOR_ROLE
   *      - the operator is not operating on their own balance
   *      - the transfer amount is <= the sender's unlocked balance
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
    bool operatorIsEscrowAdmin = hasRole(ESCROW_CREATOR_ROLE, operator);
    bool operatorIsNotSender = operator != from;
    if (isBurning && operatorIsNotSender && operatorIsEscrowAdmin) {
      for (uint256 i = 0; i < ids.length; i++) {
        if (!(balanceOf(from, ids[i]) >= amounts[i])) {
          revert InsufficientBalance({account: from, scheduleId: ids[i]});
        }
      }
    } else if (isBurning) {
      // todo do we need any other conditions here? meant to be for claiming only
      // let's see what happens when we try to transfer
      for (uint256 i = 0; i < ids.length; i++) {
        if (amounts[i] > claimableBalanceForScheduleForAccount(ids[i], from)) {
          revert InsufficientBalance({account: from, scheduleId: ids[i]});
        }
      }
    }
    return super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  /**
   * @dev The total amount of the linear release available at *atTime*
   *
   */
  function _linearReleaseAmountAvailable(EscrowSchedule storage escrowSchedule)
    internal
    view
    returns (uint256)
  {
    if (block.timestamp >= escrowSchedule.endTime) {
      return escrowSchedule.totalSupply;
    }
    uint256 rampTotalTime = escrowSchedule.endTime - escrowSchedule.startTime;
    return
      block.timestamp < escrowSchedule.startTime
        ? 0
        : (escrowSchedule.totalSupply *
          (block.timestamp - escrowSchedule.startTime)) / rampTotalTime;
  }

  /**
   * @notice Released balance for a single escrow schedule at current block timestamp
   */
  function _releasedBalanceOfSingleEscrowSchedule(uint256 scheduleId)
    internal
    view
    returns (uint256)
  {
    EscrowSchedule storage escrowSchedule = _scheduleIdToScheduleStruct[
      scheduleId
    ];
    return
      MathUpgradeable.max(
        _linearReleaseAmountAvailable(escrowSchedule),
        escrowSchedule.releasedAmountFloor
      );
  }

  function _grantRole(bytes32 role, address account) internal virtual override {
    if (role == ESCROW_CREATOR_ROLE) {
      if (_addressToScheduleIdSet[account].length() > 0) {
        revert RoleUnassignableToEscrowScheduleHolder({
          account: account,
          role: "ESCROW_CREATOR_ROLE"
        });
      }
    }
    super._grantRole(role, account);
  }

  // Disabled functions ===========================================
  // todo what do we do with:
  // setApprovalForAll ?
  // isApprovedForAll ?

  // any other ones need disabling??

  /**
   * @notice Overridden standard ERC777.burn that will always revert
   *
   * @dev This function is not currently supported from external callers so we override it so that we can revert.
   */
  function burn(
    address,
    uint256,
    uint256
  ) public pure override {
    revert BurningNotSupported();
  }

  /**
   * @notice Overridden standard ERC777.burn that will always revert
   *
   * @dev This function is not currently supported from external callers so we override it so that we can revert.
   */
  function burnBatch(
    address,
    uint256[] calldata,
    uint256[] calldata
  ) public pure override {
    revert BurningNotSupported();
  }
}
