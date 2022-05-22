// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "./ERC777PresetPausablePermissioned.sol";
import "./BridgedPolygonNORI.sol";

uint256 constant SECONDS_IN_TEN_YEARS = 31_536_000;

contract EscrowedNORI is
  IERC777RecipientUpgradeable,
  ERC777PresetPausablePermissioned
{
  // using EnumerableMapUpgradeable for uint256; todo use for address to escrows lookup?

  struct EscrowSchedule {
    uint256 startTime;
    uint256 endTime;
    uint256 totalAmount;
  }

  struct EscrowAccount {
    EscrowSchedule escrowSchedule;
    uint256 accountAmount;
    uint256 claimedAmount;
    uint256 originalAmount;
    bool exists;
    uint256 lastRevocationTime;
    uint256 lastQuantityRevoked;
  }

  struct EscrowAccountDetail {
    uint256 accountAmount;
    address recipient;
    uint256 startTime;
    uint256 escrowEndTime;
    uint256 claimedAmount;
    uint256 originalAmount;
    uint256 lastRevocationTime;
    uint256 lastQuantityRevoked;
    bool exists;
  }

  // todo we can probably get rid of one of these! they're the same now
  struct CreateEscrowAccountParams {
    address recipient;
    uint256 startYear;
    uint256 startTime;
  }

  struct DepositForParams {
    address recipient;
    uint256 startYear;
    uint256 startTime;
  }

  /**
   * @notice Role conferring creation and revocation of escrow accounts.
   */
  bytes32 public constant ESCROW_CREATOR_ROLE =
    keccak256("ESCROW_CREATOR_ROLE");

  /**
   * @notice Used to register the ERC777TokensRecipient recipient interface in the
   * ERC-1820 registry
   *
   * @dev Registering that EscrowedNORI implements the ERC777TokensRecipient interface with the registry is a
   * requiremnt to be able to receive ERC-777 BridgedPolygonNORI tokens. Once registered, sending BridgedPolygonNORI
   * tokens to this contract will trigger tokensReceived as part of the lifecycle of the BridgedPolygonNORI transaction
   */
  bytes32 public constant ERC777_TOKENS_RECIPIENT_HASH =
    keccak256("ERC777TokensRecipient");

  // map from address to enumerable map between vintage and escrow id (maybe also just year)
  // todo mapping(address => EnumerableMapUpgradeable) private _removalToEscrowAccount;
  mapping(address => mapping(uint256 => uint256))
    private _removalToEscrowAccount;
  mapping(address => uint256[]) private _addressToEnumerableEscrowKeys;

  // map from escrow id (year?) to escrow
  mapping(address => mapping(uint256 => EscrowAccount))
    private _addressToEscrowAccounts;

  /**
   * @notice The BridgedPolygonNORI contract that this contract wraps tokens for
   */
  BridgedPolygonNORI private _bridgedPolygonNori;

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
   * @notice Emitted on successful creation of a new escrow account.
   */
  event EscrowAccountCreated(
    address indexed recipient,
    uint256 indexed amount,
    uint256 indexed startTime
  );

  /**
   * @notice Emitted on when the unreleased portion of an active escrow account is terminated.
   */
  event UnreleasedTokensRevoked(
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

  // todo document expected initialzation state
  // todo I switched the visibility of this function from public to external...
  // is that right for an initializer or was there a reason it was public?
  function initialize(BridgedPolygonNORI bridgedPolygonNoriAddress)
    external
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
    __ERC777_init_unchained("Escrowed NORI", "eNORI", operators);
    _bridgedPolygonNori = bridgedPolygonNoriAddress;
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
    address to = abi.decode(userData, (address));
    require(to != address(0), "eNORI: token send missing required userData");
    _depositFor(amount, userData, operatorData);
  }

  /**
   * @notice Claim unlocked tokens and withdraw them to *to* address.
   *
   * @dev This function burns `amount` of `EscrowedNORI` and transfers `amount`
   * of `BridgedPolygonNORI` from the `EscrowedNORI` contract's balance to
   * `_msgSender()`'s balance.
   *
   * Enforcement of the availability of wrapped and unlocked tokens
   * for the `_burn` call happens in `_beforeTokenTransfer`
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   */
  // TODO this will need a notion of the total number of released tokens availble to withdraw,
  // and a mechanism for withdrawing them correctly from potentially a variety of escrow accounts
  function withdrawTo(address recipient, uint256 amount)
    external
    returns (bool)
  {
    EscrowAccount storage escrowAccount = _grants[_msgSender()]; // fixme
    super._burn(_msgSender(), amount, "", "");
    _bridgedPolygonNori.send(
      // solhint-disable-previous-line check-send-result, because this isn't a solidity send
      recipient,
      amount,
      ""
    );
    escrowAccount.claimedAmount += amount;
    emit TokensClaimed(_msgSender(), recipient, amount);
    return true;
  }

  /**
   * @notice Sets up a lockup schedule for recipient.
   *
   * @dev This function can be used as an alternative way to set up an escrow account that doesn't require
   * wrapping BridgedPolygonNORI first.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `ESCROW_CREATOR_ROLE` role
   */
  function createEscrowAccount(
    uint256 amount,
    address recipient,
    uint256 startTime,
    uint256 escrowEndTime
  ) external whenNotPaused onlyRole(ESCROW_CREATOR_ROLE) {
    bytes memory userData = abi.encode(recipient, startTime, escrowEndTime);
    _createEscrowAccount(amount, userData);
  }

  /**
   * @notice Truncates a batch of escrow accounts of amounts in a single go
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
    address[] calldata fromAccounts,
    address[] calldata toAccounts,
    uint256[] calldata escrowAccountStartYears,
    uint256[] calldata atTimes,
    uint256[] calldata amounts
  ) external whenNotPaused onlyRole(ESCROW_CREATOR_ROLE) {
    require(
      fromAccounts.length == toAccounts.length,
      "eNORI: fromAccounts and toAccounts length mismatch"
    );
    require(
      toAccounts.length == atTimes.length,
      "eNORI: toAccounts and atTimes length mismatch"
    );
    require(
      atTimes.length == amounts.length,
      "eNORI: atTimes and amounts length mismatch"
    );
    for (uint256 i = 0; i < fromAccounts.length; i++) {
      _revokeUnreleasedTokens(
        fromAccounts[i],
        toAccounts[i],
        escrowAccountStartYears[i],
        atTimes[i],
        amounts[i]
      );
    }
  }

  /**
   * @notice Number of  tokens that were revoked if any.
   */
  function quantityRevokedFrom(address account, uint256 escrowAccountStartYear)
    external
    view
    returns (uint256)
  {
    EscrowAccount storage escrowAccount = _addressToEscrowAccounts[account][
      escrowAccountStartYear
    ];
    return escrowAccount.originalAmount - escrowAccount.accountAmount;
  }

  /**
   * @notice Returns all governing settings for multiple escrow accounts
   *
   * @dev If an escrow account does not exist for an address, the resulting
   * escrow account will be zeroed out in the return value
   */
  function batchGetEscrowAccounts(address[] calldata addresses)
    public
    view
    returns (EscrowAccountDetail[] memory)
  {
    EscrowAccountDetail[]
      memory escrowAccountDetails = new EscrowAccountDetail[](addresses.length);
    for (uint256 i = 0; i < addresses.length; i++) {
      escrowAccountDetails[i] = getEscrowAccount(addresses[i]);
    }
    return escrowAccountDetails;
  }

  /**
   * @notice Returns all governing settings for an escrow account.
   */
  function getEscrowAccount(address account, uint256 escrowAccountStartYear)
    public
    view
    returns (EscrowAccountDetail memory)
  {
    EscrowAccount storage escrowAcount = _addressToEscrowAccounts[account][
      escrowAccountStartYear
    ];
    return
      EscrowAccountDetail(
        escrowAcount.accountAmount,
        account,
        escrowAcount.escrowSchedule.startTime,
        escrowAcount.escrowSchedule.endTime,
        escrowAcount.claimedAmount,
        escrowAcount.originalAmount,
        escrowAcount.lastRevocationTime,
        escrowAcount.lastQuantityRevoked,
        escrowAcount.exists
      );
  }

  /**
   * @notice Released balance less any claimed amount at current block timestamp.
   */
  function releasedBalanceOf(address account, uint256 escrowAccountStartYear)
    public
    view
    returns (uint256)
  {
    return _releasedBalanceOf(account, escrowAccountStartYear, block.timestamp); // solhint-disable-line not-rely-on-time, this is time-dependent
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
   * @notice Wraps minting of wrapper token and escrow account setup.
   *
   * @dev If `startTime` is zero no escrow account is set up.
   * Satisfies situations where funding of the account happens over time.
   *
   * @param amount uint256 Quantity of `_bridgedPolygonNori` to deposit
   * @param userData CreateEscrowAccountParams or DepositForParams (which are now the same TODO)
   * @param operatorData bytes extra information provided by the operator (if any)
   */
  function _depositFor(
    uint256 amount,
    bytes calldata userData,
    bytes calldata operatorData
  ) internal returns (bool) {
    DepositForParams memory params = abi.decode(userData, (DepositForParams)); // todo error handling
    // If a startTime parameter is non-zero then set up a schedule
    // Validation happens inside _createEscrowAccount
    if (params.startTime > 0) {
      _createEscrowAccount(amount, userData);
    }
    require(
      _addressToEscrowAccounts[params.recipient][params.startYear].exists,
      "eNORI: Cannot deposit without an escrow account"
    );
    super._mint(params.recipient, amount, userData, operatorData);
    return true;
  }

  /**
   * @notice Sets up a lockup schedule for recipient (implementation).
   *
   *
   * This will be invoked via the `tokensReceived` callback for cases
   * where we have the tokens in hand at the time we set up the escrow account.
   *
   * It is also callable externally (see `grantTo`) to handle cases // todo what was `grantTo`???
   * where tokens are incrementally deposited after the escrow account is established.
   */
  function _createEscrowAccount(uint256 amount, bytes memory userData)
    internal
  {
    CreateEscrowAccountParams memory params = abi.decode(
      userData,
      (CreateEscrowAccountParams)
    );
    require(
      address(params.recipient) != address(0),
      "eNORI: Recipient cannot be zero address"
    );
    require(
      !hasRole(ESCROW_CREATOR_ROLE, params.recipient),
      "eNORI: Recipient cannot be escrow admin"
    );
    require(
      !_addressToEscrowAccounts[params.recipient][params.startYear].exists,
      "eNORI: Escrow account already exists"
    );

    EscrowAccount storage escrowAccount = _addressToEscrowAccounts[
      params.recipient
    ][params.startYear];
    escrowAccount.accountAmount = amount;
    escrowAccount.originalAmount = amount;
    escrowAccount.exists = true;
    escrowAccount.escrowSchedule.totalAmount = amount;
    escrowAccount.escrowSchedule.startTime = params.startTime;
    escrowAccount.escrowSchedule.endTime =
      params.startTime +
      SECONDS_IN_TEN_YEARS;
    emit EscrowAccountCreated(params.recipient, amount, params.startTime);
  }

  /**
   * @notice Truncates an escrow account.
   * This is an *admin* operation callable only by addresses having ESCROW_CREATOR_ROLE
   * (enforced in `batchRevokeUnreleasedTokenAmounts`)
   * // todo what should this description actually be now??
   * @dev The implementation never updates underlying schedules
   * but only the escrow account amount.  This avoids changing the behavior of the grant
   * before the point of revocation.  Anytime an unlock schedule is in
   * play the corresponding balance functions need to take care to never return
   * more than the grant amount less the claimed amount.
   *
   * Unlike in the `claim` function, here we burn `EscrowedNORI` from the escrow account owner but
   * send that `BridgedPolygonNORI` back to Nori's treasury or an address of Nori's
   * choosing (the *to* address).  The *claimedAmount* is not changed because this is
   * not a claim operation.
   */
  function _revokeUnreleasedTokens(
    address from,
    address to,
    uint256 escrowAccountStartYear,
    uint256 atTime,
    uint256 amount
  ) internal {
    require(
      (atTime == 0 && amount > 0) || (atTime > 0 && amount == 0),
      "eNORI: Must specify a revocation time or an amount not both"
    );
    EscrowAccount storage escrowAccount = _addressToEscrowAccounts[from][
      escrowAccountStartYear
    ];
    require(escrowAccount.exists, "eNORI: no escrow account exists");
    require(
      _hasEscrowSchedule(from),
      "eNORI: no escrow schedule for this escrow account"
    );
    uint256 revocationTime = atTime == 0 && amount > 0
      ? block.timestamp
      : atTime; // atTime of zero indicates a revocation by amount
    require(
      revocationTime >= block.timestamp,
      "eNORI: Revocation cannot be in the past"
    );
    uint256 releasedBalance = _linearReleaseAmountAvailable(
      escrowAccount.escrowSchedule,
      revocationTime
    );
    require(
      releasedBalance < escrowAccount.accountAmount,
      "eNORI: tokens already released"
    );
    uint256 revocableQuantity = escrowAccount.accountAmount - releasedBalance;
    uint256 quantityRevoked;
    // amount of zero indicates revocation by time.  Amount becomes all remaining tokens
    // at *atTime*
    if (amount > 0) {
      require(amount <= revocableQuantity, "eNORI: too few unreleased tokens");
      quantityRevoked = amount;
    } else {
      quantityRevoked = revocableQuantity;
    }
    escrowAccount.accountAmount = escrowAccount.accountAmount - quantityRevoked;
    escrowAccount.lastRevocationTime = revocationTime;
    escrowAccount.lastQuantityRevoked = quantityRevoked;
    super._burn(from, quantityRevoked, "", "");
    _bridgedPolygonNori.send(
      // solhint-disable-previous-line check-send-result, because this isn't a solidity send
      to,
      quantityRevoked,
      ""
    );
    emit UnreleasedTokensRevoked(revocationTime, from, quantityRevoked);
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
    bool ownerHasSufficientReleasedBalance = amount <= releasedBalanceOf(from);
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
    EscrowSchedule storage schedule,
    uint256 atTime
  ) internal view returns (uint256) {
    if (atTime >= schedule.endTime) {
      return schedule.totalAmount;
    }
    uint256 rampTotalTime = schedule.endTime - schedule.startTime;
    return
      atTime < schedule.startTime
        ? 0
        : (schedule.totalAmount * (atTime - schedule.startTime)) /
          rampTotalTime;
  }

  /**
   * @notice Released balance less any claimed amount at `atTime` (implementation)
   *  TODO is this even right anymore?
   * @dev If any tokens have been revoked then the schedule (which doesn't get updated) may return more than the total
   * escrow account amount. This is done to preserve the behavior of the escrow schedule despite a reduction in the
   * total quantity of tokens releasing.
   * i.o.w The rate of release does not change after calling `revokeUnreleasedTokens`
   */
  // todo revoked tokens can change the total escrow account amount and thus the beahvior of the releasing
  function _releasedBalanceOf(
    address account,
    uint256 escrowAccountStartYear,
    uint256 atTime
  ) internal view returns (uint256) {
    EscrowAccount storage escrowAccount = _addressToEscrowAccounts[account][
      escrowAccountStartYear
    ];
    uint256 balance = this.balanceOf(account);
    if (escrowAccount.exists) {
      if (_hasEscrowSchedule(account)) {
        balance =
          MathUpgradeable.min( // todo I think this min isn't necessary
            _linearReleaseAmountAvailable(escrowAccount.escrowSchedule, atTime),
            escrowAccount.accountAmount
          ) -
          escrowAccount.claimedAmount;
      } else {
        balance = escrowAccount.accountAmount - escrowAccount.claimedAmount;
      }
    }
    return balance;
  }

  function _beforeOperatorChange(address, uint256) internal pure override {
    revert("eNORI: operator actions disabled");
  }

  /**
   * @dev Returns true if the there is an escrow account for *account* with an escrow schedule.
   */
  function _hasEscrowSchedule(address account, uint256 escrowAccountStartYear)
    private
    view
    returns (bool)
  {
    EscrowAccount storage escrowAccount = _addressToEscrowAccounts[account][
      escrowAccountStartYear
    ];
    return escrowAccount.exists && escrowAccount.escrowSchedule.startTime > 0;
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

  // todo I added escrowAccountStartYear to function sig -- is this going to clash??
  // probably have to find another mechanism for determining whether this account has ANY escrow accounts associated
  function _beforeRoleChange(
    bytes32 role,
    address account,
    uint256 escrowAccountStartYear
  ) internal virtual override {
    super._beforeRoleChange(role, account);
    if (role == ESCROW_CREATOR_ROLE) {
      require(
        !_addressToEscrowAccounts[account][escrowAccountStartYear].exists,
        "eNORI: Cannot assign role to an escrow account holder"
      );
    }
  }
}
