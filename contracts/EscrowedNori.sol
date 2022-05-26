// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "./ERC777PresetPausablePermissioned.sol";
import "./BridgedPolygonNORI.sol";
import "./Removal.sol";
import {RemovalUtils} from "./RemovalUtils.sol";

/*
Open Questions:
- do we need to set up an escrow schedule with the full amount associated with the agreement?
  or is it ok that the amount of the escrow schedule actually changes over time either with the addition
  of new NORI or with the revocation of some?
  - seems to me that the amount changing gradually makes more sense, because if a supplier only sells one of their
  removals we actually want that single amount to release gradually over 10 years so that we have recourse to reclaim
  those insurance tokens on behalf of that removal at some point in the future

- do we need to allow specification of end time? or perhaps of duration? or can we assume always 10 years
  and use that hardcoded constant?

  - do we need any ability to create escrow schedules before tokens are received on behalf of a removal?
      I would argue that we don't, and that the only placed escrow schedules should be created is in tokensReceived > depositFor

  - should we set this up so that if a token is deposited on behalf of a removal id that DOESN'T have an entry for its schedule
  -   startTime that we use the year (in epoch seconds) of the removal's vintage as the startime? it would allow us to migrate
  -   seamlessly to the far superior world where the escrow schedules aren't so arbitrary and actually represent exactly
  -   10 years for each removal.

  - When it comes to keeping track of tokens that have been revoked, is it sufficient to keep a running total for any given escrow schedule,
  and then to rely on events for more granular examination at the level of removalid and to see the times at which things were revoked?
  - Do we need any additional information captured when a revocation happens?  Do we want to allow a default mechanism for recapturing ALL available tokens?
  I believe this is currently happening by specifying an amount of 0
 */

/*
TODO LIST:
- handle escrow schedule transferability (both batch and single) that transfers full grants.
  -  pretty sure we can't do this in any other way because it's too unclear which escrow schedules the transferred tokens belong to

- do we need a mechanism of removing escrow schedule ids from a supplier's list once the escrow schedule has been completely
- vested AND claimed? so that the process of withdrawing tokens is more gas efficient and iterates less??
  - old schedules could still be kept around and indexed by a different collection, for view purposes.

  - what are all the potential view functions we need here?

  - update all the natspec comments

  - tests tests tests!
 */

uint256 constant SECONDS_IN_TEN_YEARS = 31_536_000;

contract EscrowedNORI is
  IERC777RecipientUpgradeable,
  ERC777PresetPausablePermissioned
{
  using RemovalUtils for uint256;

  struct EscrowSchedule {
    uint256 startTime;
    uint256 endTime;
    uint256 currentAmount;
    uint256 claimedAmount;
    bool exists;
    uint256 totalQuantityRevoked;
    uint256 releasedAmountFloor;
  }

  struct EscrowScheduleDetail {
    uint256 currentAmount;
    address recipient;
    uint256 startTime;
    uint256 endTime;
    uint256 claimedAmount;
    uint256 totalQuantityRevoked;
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

  mapping(address => uint256[]) private _addressToEscrowScheduleIds;

  mapping(address => mapping(uint256 => EscrowSchedule))
    private _addressToEscrowSchedules;

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
   * requiremnt to be able to receive ERC-777 BridgedPolygonNORI tokens. Once registered, sending BridgedPolygonNORI
   * tokens to this contract will trigger tokensReceived as part of the lifecycle of the BridgedPolygonNORI transaction
   */
  IERC1820RegistryUpgradeable private _erc1820;

  /**
   * @notice Emitted on successful creation of a new escrow schedule.
   */
  event EscrowScheduleCreated(
    address indexed recipient,
    uint256 indexed startTime
  );

  /**
   * @notice Emitted on when unreleased tokens of an active escrow schedule are revoked.
   */
  event UnreleasedTokensRevoked(
    uint256 indexed atTime,
    uint256 indexed removalId,
    uint256 indexed escrowScheduleId,
    uint256 quantity
  );

  /**
   * @notice Emitted on withdwal of fully unlocked tokens.
   */
  event TokensClaimed(
    address indexed from,
    address indexed to,
    uint256 quantity
  );

  // todo document expected initialzation state
  // todo I switched the visibility of this function from public to external...
  // is that right for an initializer or was there a reason it was public?
  function initialize(
    BridgedPolygonNORI bridgedPolygonNoriAddress,
    Removal removalAddress
  ) external initializer {
    address[] memory operators = new address[](1);
    operators[0] = _msgSender();
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC777PresetPausablePermissioned_init_unchained();
    __ERC777_init_unchained("Escrowed NORI", "eNORI", operators);
    _bridgedPolygonNori = bridgedPolygonNoriAddress;
    _removal = removalAddress;
    _ERC1820_REGISTRY.setInterfaceImplementer(
      address(this),
      ERC777_TOKENS_RECIPIENT_HASH,
      address(this)
    );
    _grantRole(ESCROW_CREATOR_ROLE, _msgSender());
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
    require(
      _msgSender() == address(_bridgedPolygonNori),
      "eNORI: not BridgedPolygonNORI"
    );
    require(
      hasRole(ESCROW_CREATOR_ROLE, sender),
      "eNORI: sender is missing role ESCROW_CREATOR_ROLE"
    );
    uint256 removalId = abi.decode(userData, (uint256));
    require(
      removalId.supplierAddress() != address(0),
      "eNORI: token send missing required userData"
    );
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
  function withdrawTo(address recipient, uint256 amount)
    external
    returns (bool)
  {
    super._burn(_msgSender(), amount, "", "");
    _bridgedPolygonNori.send(
      // solhint-disable-previous-line check-send-result, because this isn't a solidity send
      recipient,
      amount,
      ""
    );
    // distribute claimed amount across escrow schedules
    uint256 remainingAmountToClaim = amount;
    uint256[] memory escrowScheduleIds = _addressToEscrowScheduleIds[
      _msgSender()
    ];
    for (uint256 i = 0; i < escrowScheduleIds.length; i++) {
      uint256 releasedAmountForSchedule = _claimableBalanceOfSingleEscrowSchedule(
        _msgSender(),
        escrowScheduleIds[i],
        block.timestamp // solhint-disable-line not-rely-on-time, this is time-dependent
      );
      EscrowSchedule storage escrowSchedule = _addressToEscrowSchedules[
        _msgSender()
      ][escrowScheduleIds[i]];
      if (releasedAmountForSchedule >= remainingAmountToClaim) {
        escrowSchedule.claimedAmount += remainingAmountToClaim;
        remainingAmountToClaim = 0;
        break;
      } else {
        escrowSchedule.claimedAmount += releasedAmountForSchedule;
        remainingAmountToClaim -= releasedAmountForSchedule;
      }
    }
    require(
      remainingAmountToClaim == 0,
      "eNORI: error distributing claimed amount across schedules"
    ); // if this happens something else is very wrong
    emit TokensClaimed(_msgSender(), recipient, amount);
    return true;
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
  function createEscrowSchedule(address recipient, uint256 startTime)
    external
    whenNotPaused
    onlyRole(ESCROW_CREATOR_ROLE)
  {
    _createEscrowSchedule(recipient, startTime);
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
    require(
      toAccounts.length == removalIds.length,
      "eNORI: fromAccounts and removalIds length mismatch"
    );
    require(
      toAccounts.length == amounts.length,
      "eNORI: fromAccounts and amounts length mismatch"
    );
    for (uint256 i = 0; i < toAccounts.length; i++) {
      _revokeUnreleasedTokens(toAccounts[i], removalIds[i], amounts[i]);
    }
  }

  /**
   * @notice
   */
  function revocableQuantity(address account, uint256 escrowScheduleId)
    public
    view
    returns (uint256)
  {
    EscrowSchedule storage escrowSchedule = _addressToEscrowSchedules[account][
      escrowScheduleId
    ];
    return
      escrowSchedule.currentAmount -
      _releasedBalanceOfSingleEscrowSchedule(
        account,
        escrowScheduleId,
        block.timestamp // solhint-disable-line not-rely-on-time, this is time-dependent
      );
  }

  /**
   * @notice Returns all governing settings for multiple escrow schedules
   *
   */
  function batchGetEscrowSchedules(address[] calldata accounts)
    public
    view
    returns (EscrowScheduleDetail[] memory)
  {
    EscrowScheduleDetail[]
      memory escrowScheduleDetails = new EscrowScheduleDetail[](
        accounts.length
      );
    for (uint256 i = 0; i < accounts.length; i++) {
      uint256[] memory escrowScheduleIds = _addressToEscrowScheduleIds[
        accounts[i]
      ];
      for (uint256 j = 0; j < escrowScheduleIds.length; j++) {
        escrowScheduleDetails[i] = getEscrowSchedule(
          accounts[i],
          escrowScheduleIds[j]
        );
      }
    }
    return escrowScheduleDetails;
  }

  /**
   * @notice Returns all governing settings for an escrow schedule.
   */
  function getEscrowSchedule(address account, uint256 escrowScheduleId)
    public
    view
    returns (EscrowScheduleDetail memory)
  {
    EscrowSchedule storage escrowAcount = _addressToEscrowSchedules[account][
      escrowScheduleId
    ];
    return
      EscrowScheduleDetail(
        escrowAcount.currentAmount,
        account,
        escrowAcount.startTime,
        escrowAcount.endTime,
        escrowAcount.claimedAmount,
        escrowAcount.totalQuantityRevoked,
        escrowAcount.exists
      );
  }

  /**
   * @notice Released balance less any claimed amount at current block timestamp.
   */
  function claimableBalanceOf(address account) public view returns (uint256) {
    return _claimableBalanceOf(account, block.timestamp); // solhint-disable-line not-rely-on-time, this is time-dependent
  }

  /**
   * @notice Overridden standard ERC777.burn that will always revert
   *
   * @dev This function is not currently supported from external callers so we override it so that we can revert.
   */
  function burn(uint256, bytes memory) public pure override {
    revert("eNORI: burning not supported");
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
    revert("eNORI: burning not supported");
  }

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
    bytes calldata userData,
    bytes calldata operatorData
  ) internal returns (bool) {
    address recipient = removalId.supplierAddress();
    uint256 escrowScheduleId = _removal.getEscrowScheduleIdForRemoval(
      removalId
    );
    // TODO error handling/ what to do if this value doesn't exist??
    // should we calculate the unix startTime for the removal's vintage? (or look it up)
    if (!_addressToEscrowSchedules[recipient][escrowScheduleId].exists) {
      _createEscrowSchedule(recipient, escrowScheduleId);
    }
    super._mint(recipient, amount, userData, operatorData);
    EscrowSchedule storage escrowSchedule = _addressToEscrowSchedules[
      recipient
    ][escrowScheduleId];
    escrowSchedule.currentAmount += amount;
    // todo are there any other data updates that have to happen here?
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
  function _createEscrowSchedule(address recipient, uint256 startTime)
    internal
  {
    require(
      address(recipient) != address(0),
      "eNORI: Recipient cannot be zero address"
    );
    require(
      !hasRole(ESCROW_CREATOR_ROLE, recipient),
      "eNORI: Recipient cannot be escrow admin"
    );
    require(
      !_addressToEscrowSchedules[recipient][startTime].exists,
      "eNORI: Escrow schedule already exists"
    );
    EscrowSchedule storage escrowSchedule = _addressToEscrowSchedules[
      recipient
    ][startTime];
    _addressToEscrowScheduleIds[recipient].push(startTime);
    escrowSchedule.currentAmount = 0;
    escrowSchedule.exists = true;
    escrowSchedule.startTime = startTime;
    escrowSchedule.endTime = startTime + SECONDS_IN_TEN_YEARS;
    escrowSchedule.releasedAmountFloor = 0;
    emit EscrowScheduleCreated(recipient, startTime);
  }

  /**
   * @notice Truncates an escrow schedule.
   * This is an *admin* operation callable only by addresses having ESCROW_CREATOR_ROLE
   * (enforced in `batchRevokeUnreleasedTokenAmounts`)
   * // todo what should this description actually be now??
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
    uint256 escrowScheduleId = _removal.getEscrowScheduleIdForRemoval(
      removalId
    );
    EscrowSchedule storage escrowSchedule = _addressToEscrowSchedules[
      revokeFrom
    ][escrowScheduleId];
    require(escrowSchedule.exists, "eNORI: no escrow schedule exists");
    uint256 releasedBalance = _releasedBalanceOfSingleEscrowSchedule(
      revokeFrom,
      escrowScheduleId,
      block.timestamp
    );
    require(
      releasedBalance < escrowSchedule.currentAmount,
      "eNORI: tokens already released"
    );
    uint256 quantityRevoked;
    // amount of zero indicates revocation of all remaining tokens.
    if (amount > 0) {
      require(
        amount <= revocableQuantity(revokeFrom, escrowScheduleId),
        "eNORI: too few unreleased tokens"
      );
      quantityRevoked = amount;
    } else {
      quantityRevoked = revocableQuantity(revokeFrom, escrowScheduleId);
    }
    escrowSchedule.currentAmount =
      escrowSchedule.currentAmount -
      quantityRevoked;
    escrowSchedule.releasedAmountFloor = releasedBalance;
    escrowSchedule.totalQuantityRevoked += quantityRevoked;
    super._burn(revokeFrom, quantityRevoked, "", "");
    _bridgedPolygonNori.send(
      // solhint-disable-previous-line check-send-result, because this isn't a solidity send
      to,
      quantityRevoked,
      ""
    );
    emit UnreleasedTokensRevoked(
      block.timestamp, // solhint-disable-line not-rely-on-time, this is time-dependent
      removalId,
      escrowScheduleId,
      quantityRevoked
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
    uint256 amount
  ) internal override {
    bool isMinting = from == address(0);
    bool isBurning = to == address(0);
    bool operatorIsEscrowAdmin = hasRole(ESCROW_CREATOR_ROLE, operator);
    bool operatorIsNotSender = operator != from;
    bool ownerHasSufficientReleasedBalance = amount <= claimableBalanceOf(from);
    if (isBurning && operatorIsNotSender && operatorIsEscrowAdmin) {
      require(balanceOf(from) >= amount, "eNORI: insufficient balance");
    } else if (!isMinting) {
      require(ownerHasSufficientReleasedBalance, "eNORI: insufficient balance");
    }
    return super._beforeTokenTransfer(operator, from, to, amount);
  }

  /**
   * @dev The total amount of the linear release available at *atTime*
   *
   */
  function _linearReleaseAmountAvailable(
    EscrowSchedule storage escrowSchedule,
    uint256 atTime
  ) internal view returns (uint256) {
    if (atTime >= escrowSchedule.endTime) {
      return escrowSchedule.currentAmount;
    }
    uint256 rampTotalTime = escrowSchedule.endTime - escrowSchedule.startTime;
    return
      atTime < escrowSchedule.startTime
        ? 0
        : (escrowSchedule.currentAmount * (atTime - escrowSchedule.startTime)) /
          rampTotalTime;
  }

  /**
   * @notice Released balance less any claimed amount at `atTime` (implementation)
   *  TODO is this even right anymore?
   * @dev If any tokens have been revoked then the schedule (which doesn't get updated) may return more than the total
   * escrow schedule amount. This is done to preserve the behavior of the escrow schedule despite a reduction in the
   * total quantity of tokens releasing.
   * i.o.w The rate of release does not change after calling `revokeUnreleasedTokens`
   */
  function _claimableBalanceOf(address account, uint256 atTime)
    internal
    view
    returns (uint256)
  {
    uint256 balance = this.balanceOf(account); // default to this if escrow schedules don't exist?
    uint256 totalReleasedBalance = 0;
    uint256[] memory escrowScheduleIds = _addressToEscrowScheduleIds[account];
    if (escrowScheduleIds.length > 0) {
      for (uint256 i = 0; i < escrowScheduleIds.length; i++) {
        totalReleasedBalance += _claimableBalanceOfSingleEscrowSchedule(
          account,
          escrowScheduleIds[i],
          atTime
        );
      }
      balance = totalReleasedBalance;
    }
    return balance;
  }

  /**
   * @notice Released balance less any claimed amount at `atTime` for a single escrow schedule (implementation)
   */
  function _claimableBalanceOfSingleEscrowSchedule(
    address account,
    uint256 escrowScheduleId,
    uint256 atTime
  ) internal view returns (uint256) {
    EscrowSchedule storage escrowSchedule = _addressToEscrowSchedules[account][
      escrowScheduleId
    ];
    require(escrowSchedule.exists, "eNORI: no escrow schedule exists");
    return
      _releasedBalanceOfSingleEscrowSchedule(
        account,
        escrowScheduleId,
        atTime
      ) - escrowSchedule.claimedAmount;
  }

  /**
   * @notice Released balance at `atTime` for a single escrow schedule
   */
  function _releasedBalanceOfSingleEscrowSchedule(
    address account,
    uint256 escrowScheduleId,
    uint256 atTime
  ) internal view returns (uint256) {
    EscrowSchedule storage escrowSchedule = _addressToEscrowSchedules[account][
      escrowScheduleId
    ];
    return
      MathUpgradeable.max(
        _linearReleaseAmountAvailable(escrowSchedule, atTime),
        escrowSchedule.releasedAmountFloor
      );
  }

  function _beforeOperatorChange(address, uint256) internal pure override {
    revert("eNORI: operator actions disabled");
  }

  function send(
    address,
    uint256,
    bytes memory
  ) public pure override {
    revert("eNORI: send disabled");
  }

  function operatorSend(
    address,
    address,
    uint256,
    bytes memory,
    bytes memory
  ) public pure override {
    revert("eNORI: operatorSend disabled");
  }

  function transfer(address, uint256) public pure override returns (bool) {
    revert("eNORI: transfer disabled");
  }

  function transferFrom(
    address,
    address,
    uint256
  ) public pure override returns (bool) {
    revert("eNORI: transferFrom disabled");
  }

  function _beforeRoleChange(bytes32 role, address account)
    internal
    virtual
    override
  {
    super._beforeRoleChange(role, account);
    if (role == ESCROW_CREATOR_ROLE) {
      require(
        !(_addressToEscrowScheduleIds[account].length > 0),
        "eNORI: Cannot assign role to an escrow schedule holder"
      );
    }
  }
}
