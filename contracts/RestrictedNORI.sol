// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "./AccessPresetPausable.sol";
import "./Errors.sol";
import "./IERC20WithPermit.sol";
import "./IRemoval.sol";
import "./IMarket.sol";
import "./IRestrictedNORI.sol";
import {RestrictedNORILib, Schedule} from "./RestrictedNORILib.sol";
import {RemovalIdLib} from "./RemovalIdLib.sol";

/**
 * @notice View information for the current state of one schedule.
 * @param scheduleTokenId The schedule token ID.
 * @param startTime The start time of the schedule.
 * @param endTime The end time of the schedule.
 * @param totalSupply The total supply of the schedule.
 * @param totalClaimableAmount The total amount that can be claimed from the schedule.
 * @param totalClaimedAmount The total amount that has been claimed from the schedule.
 * @param totalQuantityRevoked The total quantity that has been revoked from the schedule.
 * @param tokenHolders The holders of the schedule.
 */
struct ScheduleSummary {
  uint256 scheduleTokenId;
  uint256 startTime;
  uint256 endTime;
  uint256 totalSupply;
  uint256 totalClaimableAmount;
  uint256 totalClaimedAmount;
  uint256 totalQuantityRevoked;
  address[] tokenHolders;
}

/**
 * @notice View information for one account's ownership of a schedule.
 * @param tokenHolder The token holder.
 * @param scheduleTokenId The schedule token ID.
 * @param balance The balance of the token holder.
 * @param claimableAmount The amount that can be claimed from the schedule by the token holder.
 * @param claimedAmount The amount that has been claimed from the schedule by the token holder.
 * @param quantityRevoked The quantity that has been revoked from the schedule by the token holder.
 */
struct ScheduleDetailForAddress {
  address tokenHolder;
  uint256 scheduleTokenId;
  uint256 balance;
  uint256 claimableAmount;
  uint256 claimedAmount;
  uint256 quantityRevoked;
}

/**
 * @title A wrapped ERC20 token contract for restricting the release of tokens for use as insurance
 * collateral.
 * @author Nori Inc.
 * @notice Based on the mechanics of a wrapped ERC-20 token, this contract layers schedules over the withdrawal
 * functionality to implement _restriction_, a time-based release of tokens that, until released, can be reclaimed
 * by Nori to enforce the permanence guarantee of carbon removals.
 *
 * ##### Behaviors and features:
 *
 * ###### Schedules
 *
 * - _Schedules_ define the release timeline for restricted tokens.
 * - A specific schedule is associated with one ERC1155 token ID and can have multiple token holders.
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
 *
 * - A given schedule is a logical overlay to a specific 1155 token. This token can have any number of token holders
 * if restricted tokens for a given schedule are minted to multiple addresses, but RestrictedNORI cannot be transferred
 * between addresses. Ownership percentages are relevant and enforced during withdrawal and revocation.
 *
 * ###### Withdrawal
 *
 * - _Withdrawal_ is the process of a token holder claiming the tokens that have been released by the restriction
 * schedule. When tokens are withdrawn, the 1155 schedule token is burned, and the underlying ERC20 token being held
 * by this contract is sent to the address specified by the token holder performing the withdrawal.
 * Tokens are released by a schedule based on the linear release of the schedule's `totalSupply`, but a token holder
 * can only withdraw released tokens in proportion to their percentage ownership of the schedule tokens.
 *
 * ###### Revocation
 *
 * - _Revocation_ is the process of tokens being recaptured by Nori to enforce carbon permanence guarantees.
 * Only unreleased tokens can ever be revoked. When tokens are revoked from a schedule, the current number of released
 * tokens does not decrease, even as the schedule's total supply decreases through revocation (a floor is enforced).
 * When these tokens are revoked, the 1155 schedule token is burned, and the underlying ERC20 token held by this
 * contract is sent to the address specified by Nori. If a schedule has multiple token holders, tokens are burned from
 * each holder in proportion to their total percentage ownership of the schedule.
 *
 * ###### Additional behaviors and features
 *
 * - [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
 * - [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all functions that mutate state are
 * pausable.
 * - [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
 * - `SCHEDULE_CREATOR_ROLE`: Can create restriction schedules without sending the underlying tokens to the contract.
 * The market contract has this role and sets up relevant schedules as removal tokens are minted.
 * - `MINTER_ROLE`: Can call `mint` on this contract, which mints tokens of the correct schedule ID (token ID) for a
 * given removal. The market contract has this role and can mint RestrictedNORI while routing sale proceeds to this
 * contract.
 * - `TOKEN_REVOKER_ROLE`: Can revoke unreleased tokens from a schedule. Only Nori admin wallet should have this role.
 * - `PAUSER_ROLE`: Can pause and unpause the contract.
 * - `DEFAULT_ADMIN_ROLE`: This is the only role that can add/revoke other accounts to any of the roles.
 *
 * ##### Inherits:
 *
 * - [ERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155)
 * - [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 * - [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
 * - [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
 * - [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)
 *
 * ##### Implements:
 *
 * - [IERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155)
 * - [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
 * - [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)
 *
 * ##### Uses:
 *
 * - [RestrictedNORILib](./RestrictedNORILib.md) for `Schedule`.
 * - [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet) for
 * `EnumerableSetUpgradeable.UintSet` and `EnumerableSetUpgradeable.AddressSet`.
 * - [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)
 */
contract RestrictedNORI is
  IRestrictedNORI,
  ERC1155SupplyUpgradeable,
  AccessPresetPausable,
  MulticallUpgradeable
{
  using RestrictedNORILib for Schedule;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

  /**
   * @notice Role conferring creation of schedules.
   * @dev The Market contract is granted this role after deployments.
   */
  bytes32 public constant SCHEDULE_CREATOR_ROLE =
    keccak256("SCHEDULE_CREATOR_ROLE");

  /**
   * @notice Role conferring sending of underlying ERC20 token to this contract for wrapping.
   * @dev The Market contract is granted this role after deployments.
   */
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /**
   * @notice Role conferring revocation of restricted tokens.
   * @dev Only Nori admin addresses should have this role.
   */
  bytes32 public constant TOKEN_REVOKER_ROLE = keccak256("TOKEN_REVOKER_ROLE");

  /**
   * @notice Accounting for the per-address current deficit of RestrictedNORI that should be manually minted
   * by a Nori admin to a new, ERC1155-compatible wallet on behalf of the original supplier.
   * @dev In the case of a non-ERC1155-compatible supplier wallet address, minting RestrictedNORI during a
   * purchase will fail and cause an event to be emitted. This data structure tracks the maximum amount
   * of RestrictedNORI that should be remedially minted to a supplier's compatible address to avoid over-
   * minting the wrapper token and failing to have enough RestrictedNORI backed by wrapped NORI.
   * TODO This variable should be used to enforce the maximum number of tokens that can ever be minted manually
   * on behalf of a given address, and should be decremented when this occurs, which is not yet implemented.
   */
  mapping(address => uint256) private _supplierToDeficit;

  /**
   * @notice A mapping of methodology to version to schedule duration.
   */
  mapping(uint256 => mapping(uint256 => uint256))
    private _methodologyAndVersionToScheduleDuration;

  /**
   * @notice A mapping of schedule ID to schedule.
   */
  mapping(uint256 => Schedule) private _scheduleIdToScheduleStruct;

  /**
   * @notice An enumerable set containing all schedule IDs.
   */
  EnumerableSetUpgradeable.UintSet private _allScheduleIds;

  /**
   * @notice The underlying ERC20 token contract for which this contract wraps tokens.
   */
  IERC20WithPermit private _underlyingToken;

  /**
   * @notice The Removal contract that accounts for carbon removal supply.
   */
  IRemoval private _removal;

  /**
   * @notice The Market contract that sells carbon removals.
   */
  IMarket private _market;

  /**
   * @notice Emitted on successful creation of a new schedule.
   * @param projectId The ID of the project for which the schedule was created.
   * @param startTime The start time of the schedule.
   * @param endTime The end time of the schedule.
   */
  event ScheduleCreated(
    uint256 indexed projectId,
    uint256 startTime,
    uint256 endTime
  );

  /**
   * @notice Emitted when unreleased tokens of an active schedule are revoked.
   * @param atTime The time at which the revocation occurred.
   * @param scheduleId The ID of the schedule from which tokens were revoked.
   * @param removalId The ID of the released removal for which tokens were revoked.
   * @param quantity The quantity of tokens revoked.
   * @param scheduleOwners The addresses of the schedule owners from which tokens were revoked.
   * @param quantitiesBurned The quantities of tokens burned from each schedule owner.
   */
  event RevokeTokens(
    uint256 indexed atTime,
    uint256 indexed scheduleId,
    uint256 indexed removalId,
    uint256 quantity,
    address[] scheduleOwners,
    uint256[] quantitiesBurned
  );

  /**
   * @notice Emitted on withdrawal of released tokens.
   * @param from The address from which tokens were withdrawn.
   * @param to The address to which tokens were withdrawn.
   * @param scheduleId The ID of the schedule from which tokens were withdrawn.
   * @param quantity The quantity of tokens withdrawn.
   */
  event ClaimTokens(
    address indexed from,
    address indexed to,
    uint256 indexed scheduleId,
    uint256 quantity
  );

  /**
   * @notice Locks the contract, preventing any future re-initialization.
   * @dev See more [here](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable-_disableInitializers--).
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initialize the RestrictedNORI contract.
   */
  function initialize() external initializer {
    __ERC1155_init_unchained({
      uri_: "https://nori.com/api/restrictionschedule/{id}.json"
    });
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Pausable_init_unchained();
    __ERC1155Supply_init_unchained();
    __Multicall_init_unchained();
    _grantRole({role: DEFAULT_ADMIN_ROLE, account: _msgSender()});
    _grantRole({role: PAUSER_ROLE, account: _msgSender()});
    _grantRole({role: SCHEDULE_CREATOR_ROLE, account: _msgSender()});
    _grantRole({role: TOKEN_REVOKER_ROLE, account: _msgSender()});
    setRestrictionDurationForMethodologyAndVersion({
      methodology: 1,
      methodologyVersion: 0,
      durationInSeconds: 315_569_520 // Seconds in 10 years (accounts for leap years)
    });
  }

  /**
   * @notice Increments the value of `_supplierToDeficit[originalSupplier]` by `amount`.
   * @dev This function is only callable by the Market contract, and is used to account for the number
   * of RestrictedNORI tokens that have failed to be minted to the specified non-ERC1155-compatible wallet
   * during a purchase.
   * @param originalSupplier The original intended recipient of failed RestrictedNORI mint(s).
   * @param amount The amount to increment `_supplierToDeficit` by.
   */
  function incrementDeficitForSupplier(address originalSupplier, uint256 amount)
    external
  {
    if (_msgSender() != address(_market)) {
      revert SenderNotMarketContract();
    }
    _supplierToDeficit[originalSupplier] += amount;
  }

  /**
   * @notice Revokes `amount` of tokens from the project (schedule) associated with the specificed
   * `removalId` and transfers them to `toAccount`.
   * @dev The behavior of this function can be used in two specific ways:
   * 1. To revoke a specific number of tokens as specified by the `amount` parameter.
   * 2. To revoke all remaining revokable tokens in a schedule by specifying 0 as the `amount`.
   *
   * Transfers unreleased tokens in the removal's project's schedule and reduces the total supply
   * of that token. Only unreleased tokens can be revoked from a schedule and no change is made to
   * balances that have released but not yet been claimed.
   * If a token has multiple owners, balances are burned proportionally to ownership percentage,
   * summing to the total amount being revoked.
   * Once the tokens have been revoked, the current released amount can never fall below
   * its current level, even if the linear release schedule of the new amount would cause
   * the released amount to be lowered at the current timestamp (a floor is established).
   *
   * Unlike in the `withdrawFromSchedule` function, here we burn RestrictedNORI
   * from the schedule owner but send that underlying ERC20 token back to Nori's
   * treasury or an address of Nori's choosing (the `toAccount` address).
   * The `claimedAmount` is not changed because this is not a claim operation.
   *
   * Emits a `RevokeTokens` event.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `TOKEN_REVOKER_ROLE` role.
   * - The requirements of `_beforeTokenTransfer` apply to this function.
   * @param removalId The removal ID that was released and on account of which tokens are being revoked.
   * @param amount The amount to revoke.
   * @param toAccount The account to which the underlying ERC20 token should be sent.
   */
  function revokeUnreleasedTokens(
    uint256 removalId,
    uint256 amount,
    address toAccount
  ) external onlyRole(TOKEN_REVOKER_ROLE) {
    uint256 projectId = _removal.getProjectId({id: removalId});
    Schedule storage schedule = _scheduleIdToScheduleStruct[projectId];
    if (!schedule.doesExist()) {
      revert NonexistentSchedule({scheduleId: projectId});
    }
    uint256 quantityRevocable = schedule.revocableQuantityForSchedule({
      scheduleId: projectId,
      totalSupply: totalSupply(projectId)
    });
    if (!(amount <= quantityRevocable)) {
      revert InsufficientUnreleasedTokens({scheduleId: projectId});
    }
    // amount of zero indicates revocation of all remaining tokens.
    uint256 quantityToRevoke = amount > 0 ? amount : quantityRevocable;
    // burn correct proportion from each token holder
    address[] memory tokenHoldersLocal = schedule.tokenHolders.values();
    uint256[] memory accountBalances = new uint256[](tokenHoldersLocal.length);
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < tokenHoldersLocal.length; ++i) {
        accountBalances[i] = balanceOf({
          account: tokenHoldersLocal[i],
          id: projectId
        });
      }
    }
    uint256[] memory quantitiesToBurnForHolders = new uint256[](
      tokenHoldersLocal.length
    );
    /**
     * Calculate the final holder's quantity to revoke by subtracting the sum of other quantities
     * from the desired total to revoke, thus avoiding any precision rounding errors from affecting
     * the total quantity revoked by up to several wei.
     */
    uint256 cumulativeQuantityToBurn = 0;
    for (uint256 i = 0; i < (tokenHoldersLocal.length - 1); ++i) {
      uint256 quantityToBurnForHolder = _quantityToRevokeForTokenHolder({
        totalQuantityToRevoke: quantityToRevoke,
        scheduleId: projectId,
        schedule: schedule,
        account: tokenHoldersLocal[i],
        balanceOfAccount: accountBalances[i]
      });
      quantitiesToBurnForHolders[i] = quantityToBurnForHolder;
      cumulativeQuantityToBurn += quantityToBurnForHolder;
    }
    quantitiesToBurnForHolders[tokenHoldersLocal.length - 1] =
      quantityToRevoke -
      cumulativeQuantityToBurn;
    for (uint256 i = 0; i < (tokenHoldersLocal.length); ++i) {
      super._burn({
        from: tokenHoldersLocal[i],
        id: projectId,
        amount: quantitiesToBurnForHolders[i]
      });
      schedule.quantitiesRevokedByAddress[
        tokenHoldersLocal[i]
      ] += quantitiesToBurnForHolders[i];
    }
    schedule.totalQuantityRevoked += quantityToRevoke;
    emit RevokeTokens({
      atTime: block.timestamp, // solhint-disable-line not-rely-on-time, this is time-dependent
      removalId: removalId,
      scheduleId: projectId,
      quantity: quantityToRevoke,
      scheduleOwners: tokenHoldersLocal,
      quantitiesBurned: quantitiesToBurnForHolders
    });
    if (!_underlyingToken.transfer({to: toAccount, amount: quantityToRevoke})) {
      revert ERC20TransferFailed();
    }
  }

  /**
   * @notice Register the underlying assets used by this contract.
   * @dev Register the addresses of the Market, underlying ERC20, and Removal contracts in this contract.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE` role.
   * @param wrappedToken The address of the underlying ERC20 contract for which this contract wraps tokens.
   * @param removal The address of the Removal contract that accounts for Nori's issued carbon removals.
   * @param market The address of the Market contract that sells Nori's issued carbon removals.
   */
  function registerContractAddresses(
    IERC20WithPermit wrappedToken,
    IRemoval removal,
    IMarket market
  ) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
    _underlyingToken = IERC20WithPermit(wrappedToken);
    _removal = IRemoval(removal);
    _market = IMarket(market);
  }

  /**
   * @notice Sets up a restriction schedule with parameters determined from the project ID.
   * @dev Create a schedule for a project ID and set the parameters of the schedule.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `SCHEDULE_CREATOR_ROLE` role.
   * @param projectId The ID that will be used as this schedule's token ID
   * @param startTime The schedule's start time in seconds since the unix epoch
   * @param methodology The methodology of this project, used to look up correct schedule duration
   * @param methodologyVersion The methodology version, used to look up correct schedule duration
   */
  function createSchedule(
    uint256 projectId,
    uint256 startTime,
    uint8 methodology,
    uint8 methodologyVersion
  ) external override whenNotPaused onlyRole(SCHEDULE_CREATOR_ROLE) {
    if (this.scheduleExists({scheduleId: projectId})) {
      revert ScheduleExists({scheduleId: projectId});
    }
    uint256 restrictionDuration = getRestrictionDurationForMethodologyAndVersion({
        methodology: methodology,
        methodologyVersion: methodologyVersion
      });
    _validateSchedule({
      startTime: startTime,
      restrictionDuration: restrictionDuration
    });
    _createSchedule({
      projectId: projectId,
      startTime: startTime,
      restrictionDuration: restrictionDuration
    });
  }

  /**
   * @notice Mint RestrictedNORI tokens for a schedule.
   * @dev Mint `amount` of RestrictedNORI to the schedule ID that corresponds to the provided `removalId`.
   * The schedule ID for this removal is looked up in the Removal contract. The underlying ERC20 asset is
   *  sent to this contract from the buyer by the Market contract during a purchase, so this function only concerns
   * itself with minting the RestrictedNORI token for the correct token ID.
   *
   * ##### Requirements:
   *
   * - Can only be used if the caller has the `MINTER_ROLE` role.
   * - The rules of `_beforeTokenTransfer` apply.
   * @param amount The amount of RestrictedNORI to mint.
   * @param removalId The removal token ID for which proceeds are being restricted.
   */
  function mint(uint256 amount, uint256 removalId) external {
    if (!hasRole({role: MINTER_ROLE, account: _msgSender()})) {
      revert InvalidMinter({account: _msgSender()});
    }
    uint256 projectId = _removal.getProjectId({id: removalId});
    address supplierAddress = RemovalIdLib.supplierAddress({
      removalId: removalId
    });
    super._mint({to: supplierAddress, id: projectId, amount: amount, data: ""});
    _scheduleIdToScheduleStruct[projectId].tokenHolders.add({
      value: supplierAddress
    });
  }

  /**
   * @notice Claim sender's released tokens and withdraw them to `recipient` address.
   *
   * @dev This function burns `amount` of RestrictedNORI for the given schedule ID
   * and transfers `amount` of underlying ERC20 token from the RestrictedNORI contract's
   * balance to `recipient`'s balance.
   * Enforcement of the availability of claimable tokens for the `_burn` call happens in `_beforeTokenTransfer`.
   *
   * Emits a `ClaimTokens` event.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * @param recipient The address receiving the unwrapped underlying ERC20 token.
   * @param scheduleId The schedule from which to withdraw.
   * @param amount The amount to withdraw.
   * @return Whether or not the tokens were successfully withdrawn.
   */
  function withdrawFromSchedule(
    address recipient,
    uint256 scheduleId,
    uint256 amount
  ) external returns (bool) {
    super._burn({from: _msgSender(), id: scheduleId, amount: amount});
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    schedule.totalClaimedAmount += amount;
    schedule.claimedAmountsByAddress[_msgSender()] += amount;
    emit ClaimTokens({
      from: _msgSender(),
      to: recipient,
      scheduleId: scheduleId,
      quantity: amount
    });
    if (!_underlyingToken.transfer({to: recipient, amount: amount})) {
      revert ERC20TransferFailed();
    }
    return true;
  }

  /**
   * @notice Returns the current deficit of RestrictedNORI tokens that failed to be minted to
   * the given non-ERC1155-compatible wallet and have not yet been replaced manually on behalf
   * of the original supplier.
   * @param originalSupplier The original supplier address for which to retrieve the deficit.
   */
  function getDeficitForAddress(address originalSupplier)
    external
    view
    returns (uint256)
  {
    return _supplierToDeficit[originalSupplier];
  }

  /**
   * @notice Get all schedule IDs.
   * @return Returns an array of all existing schedule IDs, regardless of the status of the schedule.
   */
  function getAllScheduleIds() external view returns (uint256[] memory) {
    uint256[] memory allScheduleIdsArray = new uint256[](
      _allScheduleIds.length()
    );
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < allScheduleIdsArray.length; ++i) {
        allScheduleIdsArray[i] = _allScheduleIds.at({index: i});
      }
    }
    return allScheduleIdsArray;
  }

  /**
   * @notice Returns an account-specific view of the details of a specific schedule.
   * @param account The account for which to provide schedule details.
   * @param scheduleId The token ID of the schedule for which to retrieve details.
   * @return Returns a `ScheduleDetails` struct containing the details of the schedule.
   */
  function getScheduleDetailForAccount(address account, uint256 scheduleId)
    external
    view
    returns (ScheduleDetailForAddress memory)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    return
      ScheduleDetailForAddress({
        tokenHolder: account,
        scheduleTokenId: scheduleId,
        balance: balanceOf({account: account, id: scheduleId}),
        claimableAmount: schedule.claimableBalanceForScheduleForAccount({
          account: account,
          totalSupply: totalSupply({id: scheduleId}),
          balanceOfAccount: balanceOf({account: account, id: scheduleId})
        }),
        claimedAmount: schedule.claimedAmountsByAddress[account],
        quantityRevoked: schedule.quantitiesRevokedByAddress[account]
      });
  }

  /**
   * @notice Batch version of `getScheduleDetailForAccount`.
   * @param account The account for which to provide schedule details.
   * @param scheduleIds The token IDs of the schedules for which to retrieve details.
   * @return Returns an array of `ScheduleDetails` structs containing the details of the schedules
   */
  function batchGetScheduleDetailsForAccount(
    address account,
    uint256[] memory scheduleIds
  ) external view returns (ScheduleDetailForAddress[] memory) {
    ScheduleDetailForAddress[]
      memory scheduleDetails = new ScheduleDetailForAddress[](
        scheduleIds.length
      );
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < scheduleIds.length; ++i) {
        if (_scheduleIdToScheduleStruct[scheduleIds[i]].doesExist()) {
          scheduleDetails[i] = this.getScheduleDetailForAccount({
            account: account,
            scheduleId: scheduleIds[i]
          });
        }
      }
    }
    return scheduleDetails;
  }

  /**
   * @notice Check the existence of a schedule.
   * @param scheduleId The token ID of the schedule for which to check existence.
   * @return Returns a boolean indicating whether or not the schedule exists.
   */
  function scheduleExists(uint256 scheduleId)
    external
    view
    override
    returns (bool)
  {
    return _scheduleIdToScheduleStruct[scheduleId].doesExist();
  }

  /**
   * @notice Returns an array of summary structs for the specified schedules.
   * @param scheduleIds The token IDs of the schedules for which to retrieve details.
   * @return Returns an array of `ScheduleSummary` structs containing the summary of the schedules.
   */
  function batchGetScheduleSummaries(uint256[] calldata scheduleIds)
    external
    view
    returns (ScheduleSummary[] memory)
  {
    ScheduleSummary[] memory scheduleSummaries = new ScheduleSummary[](
      scheduleIds.length
    );
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < scheduleIds.length; ++i) {
        scheduleSummaries[i] = getScheduleSummary({scheduleId: scheduleIds[i]});
      }
    }
    return scheduleSummaries;
  }

  /**
   * @notice Released balance less the total claimed amount at current block timestamp for a schedule.
   * @param scheduleId The token ID of the schedule for which to retrieve details.
   * @return Returns the claimable amount for the schedule.
   */
  function claimableBalanceForSchedule(uint256 scheduleId)
    external
    view
    returns (uint256)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    return
      schedule.claimableBalanceForSchedule({
        scheduleId: scheduleId,
        totalSupply: totalSupply({id: scheduleId})
      });
  }

  /**
   * @notice A single account's claimable balance at current block timestamp for a schedule.
   * @dev Calculations have to consider an account's total proportional claim to the schedule's released tokens,
   * using totals constructed from current balances and claimed amounts, and then subtract anything that
   * account has already claimed.
   * @param scheduleId The token ID of the schedule for which to retrieve details.
   * @param account The account for which to retrieve details.
   * @return Returns the claimable amount for an account's schedule.
   */
  function claimableBalanceForScheduleForAccount(
    uint256 scheduleId,
    address account
  ) external view returns (uint256) {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    return
      schedule.claimableBalanceForScheduleForAccount({
        account: account,
        totalSupply: totalSupply({id: scheduleId}),
        balanceOfAccount: balanceOf({account: account, id: scheduleId})
      });
  }

  /**
   * @notice Get the current number of revocable tokens for a given schedule at the current block timestamp.
   * @param scheduleId The schedule ID for which to revoke tokens.
   * @return Returns the number of revocable tokens for a given schedule at the current block timestamp.
   */
  function revocableQuantityForSchedule(uint256 scheduleId)
    external
    view
    returns (uint256)
  {
    Schedule storage schedule = _scheduleIdToScheduleStruct[scheduleId];
    return
      schedule.revocableQuantityForSchedule({
        scheduleId: scheduleId,
        totalSupply: totalSupply({id: scheduleId})
      });
  }

  /**
   * @notice Set the restriction duration for a methodology and version.
   * @dev Set the duration in seconds that should be applied to schedules created on behalf of removals
   * originating from the given methodology and methodology version.
   *
   * ##### Requirements:
   *
   * - Can only be used when the contract is not paused.
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE` role.
   * @param methodology The methodology of carbon removal.
   * @param methodologyVersion The version of the methodology.
   * @param durationInSeconds The duration in seconds that insurance funds should be restricted for this
   * methodology and version.
   */
  function setRestrictionDurationForMethodologyAndVersion(
    uint256 methodology,
    uint256 methodologyVersion,
    uint256 durationInSeconds
  ) public whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
    if (durationInSeconds == 0) {
      revert InvalidZeroDuration();
    }
    _methodologyAndVersionToScheduleDuration[methodology][
      methodologyVersion
    ] = durationInSeconds;
  }

  /**
   * @notice Get the address of the underlying ERC20 token being wrapped by this contract.
   * @return The address of the underlying ERC20 token being wrapped by this contract.
   */
  function getUnderlyingTokenAddress() public view returns (address) {
    return address(_underlyingToken);
  }

  /**
   * @notice Get a summary for a schedule.
   * @param scheduleId The token ID of the schedule for which to retrieve details.
   * @return Returns the schedule summary.
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
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < numberOfTokenHolders; ++i) {
        tokenHoldersArray[i] = schedule.tokenHolders.at({index: i});
        scheduleIdArray[i] = scheduleId;
      }
    }
    uint256 supply = totalSupply({id: scheduleId});
    return
      ScheduleSummary({
        scheduleTokenId: scheduleId,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        totalSupply: supply,
        totalClaimableAmount: schedule.claimableBalanceForSchedule({
          scheduleId: scheduleId,
          totalSupply: supply
        }),
        totalClaimedAmount: schedule.totalClaimedAmount,
        totalQuantityRevoked: schedule.totalQuantityRevoked,
        tokenHolders: tokenHoldersArray
      });
  }

  /**
   * @dev See [IERC165.supportsInterface](
   * https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.
   * @param interfaceId The interface ID to check for support.
   * @return Returns true if the interface is supported, false otherwise.
   */
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, AccessControlEnumerableUpgradeable)
    returns (bool)
  {
    return super.supportsInterface({interfaceId: interfaceId});
  }

  /**
   * @notice Get the schedule duration (in seconds) that has been set for a given methodology and methodology version.
   * @param methodology The methodology of carbon removal.
   * @param methodologyVersion The version of the methodology.
   * @return Returns the schedule duration in seconds.
   */
  function getRestrictionDurationForMethodologyAndVersion(
    uint256 methodology,
    uint256 methodologyVersion
  ) public view returns (uint256) {
    return
      _methodologyAndVersionToScheduleDuration[methodology][methodologyVersion];
  }

  /**
   * @notice Token transfers are disabled.
   * @dev Transfer is disabled because keeping track of claimable amounts as tokens are
   * claimed and transferred requires more bookkeeping infrastructure that we don't currently
   * have time to write but may implement in the future.
   */
  function safeTransferFrom(
    address,
    address,
    uint256,
    uint256,
    bytes memory
  ) public pure override {
    revert FunctionDisabled();
  }

  /**
   * @notice Token transfers are disabled.
   * @dev Transfer is disabled because keeping track of claimable amounts as tokens are
   * claimed and transferred requires more bookkeeping infrastructure that we don't currently
   * have time to write but may implement in the future.
   */
  function safeBatchTransferFrom(
    address,
    address,
    uint256[] memory,
    uint256[] memory,
    bytes memory
  ) public pure override {
    revert FunctionDisabled();
  }

  /**
   * @notice Sets up a schedule for the specified project.
   * @dev Schedules are created when removal tokens are listed for sale in the market contract,
   * so this should only be invoked during `tokensReceived` in the exceptional case that
   * tokens were sent to this contract without a schedule set up.
   *
   * Revert strings are used instead of custom errors here for proper surfacing
   * from within the market contract `onERC1155BatchReceived` hook.
   *
   * Emits a `ScheduleCreated` event.
   * @param projectId The ID that will be used as the new schedule's ID.
   * @param startTime The schedule start time in seconds since the unix epoch.
   * @param restrictionDuration The duration of the schedule in seconds since the unix epoch.
   */
  function _createSchedule(
    uint256 projectId,
    uint256 startTime,
    uint256 restrictionDuration
  ) internal {
    Schedule storage schedule = _scheduleIdToScheduleStruct[projectId];
    schedule.startTime = startTime;
    schedule.endTime = startTime + restrictionDuration;
    _allScheduleIds.add({value: projectId});
    emit ScheduleCreated({
      projectId: projectId,
      startTime: startTime,
      endTime: schedule.endTime
    });
  }

  /**
   * @notice Hook that is called before any token transfer. This includes minting and burning, as well as batched
   * variants.
   * @dev Follows the rules of hooks defined [here](
   * https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * See the ERC1155 specific version [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155).
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   * - One of the following must be true:
   *    - The operation is a mint.
   *    - The operation is a burn, which only happens during revocation and withdrawal:
   *      - If the operation is a revocation, that permission is enforced by the `TOKEN_REVOKER_ROLE`.
   *      - If the operation is a withdrawal the burn amount must be <= the sender's claimable balance.
   * @param operator The address which initiated the transfer (i.e. msg.sender).
   * @param from The address to transfer from.
   * @param to The address to transfer to.
   * @param ids The token IDs to transfer.
   * @param amounts The amounts of the token `id`s to transfer.
   * @param data The data to pass to the receiver contract.
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override(ERC1155SupplyUpgradeable) whenNotPaused {
    bool isBurning = to == address(0);
    bool isWithdrawing = isBurning && from == operator;
    if (isBurning) {
      // Skip overflow check as for loop is indexed starting at zero.
      unchecked {
        for (uint256 i = 0; i < ids.length; ++i) {
          uint256 id = ids[i];
          Schedule storage schedule = _scheduleIdToScheduleStruct[id];
          if (isWithdrawing) {
            if (
              amounts[i] >
              schedule.claimableBalanceForScheduleForAccount({
                account: from,
                totalSupply: totalSupply({id: id}),
                balanceOfAccount: balanceOf({account: from, id: id})
              })
            ) {
              revert InsufficientClaimableBalance({
                account: from,
                scheduleId: id
              });
            }
          }
          schedule.releasedAmountFloor = schedule
            .releasedBalanceOfSingleSchedule({
              totalSupply: totalSupply({id: id})
            });
        }
      }
    }
    return
      super._beforeTokenTransfer({
        operator: operator,
        from: from,
        to: to,
        ids: ids,
        amounts: amounts,
        data: data
      });
  }

  /**
   * @notice Validates that the schedule start time and duration are non-zero.
   * @param startTime The schedule start time in seconds since the unix epoch.
   * @param restrictionDuration The duration of the schedule in seconds since the unix epoch.
   */
  function _validateSchedule(uint256 startTime, uint256 restrictionDuration)
    internal
    pure
  {
    require(startTime != 0, "rNORI: Invalid start time");
    require(restrictionDuration != 0, "rNORI: duration not set");
  }

  /**
   * @notice Calculates the quantity that should be revoked from a given token holder and schedule based on their
   * proportion of ownership of the schedule's tokens and the total number of tokens being revoked.
   * @param totalQuantityToRevoke The total quantity of tokens being revoked from this schedule.
   * @param scheduleId The schedule (token ID) from which tokens are being revoked.
   * @param schedule The schedule (struct) from which tokens are being revoked.
   * @param account The token holder for which to calculate the quantity that should be revoked.
   * @param balanceOfAccount The total balance of this token ID owned by `account`.
   * @return The quantity of tokens that should be revoked from `account` for the given schedule.
   */
  function _quantityToRevokeForTokenHolder(
    uint256 totalQuantityToRevoke,
    uint256 scheduleId,
    Schedule storage schedule,
    address account,
    uint256 balanceOfAccount
  ) private view returns (uint256) {
    uint256 scheduleTrueTotal = schedule.scheduleTrueTotal({
      totalSupply: totalSupply({id: scheduleId})
    });
    uint256 quantityToRevokeForAccount;
    // avoid division by or of 0
    if (scheduleTrueTotal == 0 || totalQuantityToRevoke == 0) {
      quantityToRevokeForAccount = 0;
    } else {
      uint256 claimedAmountForAccount = schedule.claimedAmountsByAddress[
        account
      ];
      quantityToRevokeForAccount =
        ((claimedAmountForAccount + balanceOfAccount) *
          (totalQuantityToRevoke)) /
        scheduleTrueTotal;
    }
    return quantityToRevokeForAccount;
  }
}
