// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol"; // todo preset + custom errors
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "./RestrictedNORI.sol";
import "./Market.sol";
import {RemovalUtils, UnpackedRemovalIdV0, RemovalId} from "./RemovalUtils.sol";
import {ArrayLengthMismatch} from "./SharedCustomErrors.sol";
// import "forge-std/console2.sol"; // todo

error TokenIdExists(RemovalId tokenId);

struct BatchMintRemovalsData {
  // todo can we de-dupe this with RemovalData? perhaps by nesting the struct?
  uint256 projectId; // todo what is the max project ID size?
  uint256 scheduleStartTime;
  uint8 holdbackPercentage;
  bool list;
}

// todo disable other mint functions
// todo investigate ERC1155SupplyUpgradeable.totalSupply
// todo look into this and use unchecked more https://github.com/OpenZeppelin/openzeppelin-contracts/issues/3512
// todo globally pack structs

/**
 * @title Removal // todo
 */
contract Removal is
  ERC1155SupplyUpgradeable,
  PausableUpgradeable,
  AccessControlEnumerableUpgradeable
{
  using RemovalUtils for RemovalId;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  struct ScheduleData {
    uint256 startTime;
    address supplierAddress;
    uint256 methodology;
    uint256 methodologyVersion;
  }

  struct RemovalData {
    uint256 projectId;
    uint256 holdbackPercentage;
  }

  /**
   * @notice Role conferring the the ability to mark a removal as released.
   * @dev Only a Nori admin address should have this role.
   */
  bytes32 public constant RELEASER_ROLE = keccak256("RELEASER_ROLE");

  /**
   * @notice Role conferring the ability to mint removals as well as the ability to list minted removals that have yet
   * to be listed for sale.
   *
   * @dev Only a Nori admin address should have this role.
   */
  bytes32 public constant MINTER_AND_LISTER_ROLE =
    keccak256("MINTER_AND_LISTER_ROLE");

  /**
   * @notice Role conferring pausing and unpausing of this contract.
   *
   * @dev Only a Nori admin address should have this role.
   */
  bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

  /**
   * @notice the RestrictedNORI contract that manages restricted tokens.
   */
  RestrictedNORI private _restrictedNori;

  /**
   * @notice the Market contract that removals can be bought and sold from
   */
  Market private _market;

  mapping(RemovalId => RemovalData) private _removalIdToRemovalData;
  mapping(uint256 => ScheduleData) private _projectIdToScheduleData; // todo why does this live here and not in rNORI?
  mapping(address => EnumerableSetUpgradeable.UintSet)
    private _addressToOwnedTokenIds;

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  function initialize() external initializer {
    // todo verify all initializers are called
    __Context_init_unchained();
    __ERC1155_init_unchained("https://nori.com/api/removal/{id}.json");
    __Pausable_init_unchained();
    __ERC1155Supply_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
    _grantRole(MINTER_AND_LISTER_ROLE, _msgSender());
    _grantRole(RELEASER_ROLE, _msgSender());
  }

  /**
   * @dev Registers the market and restricted Nori contracts so that they can be referenced in this contract.
   */
  function registerContractAddresses(
    RestrictedNORI restrictedNoriAddress_,
    Market marketAddress_
  ) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
    // todo configureContract() that does this + grantRole
    _restrictedNori = restrictedNoriAddress_;
    _market = marketAddress_;
  }

  /**
   * @notice Mints multiple removals at once (for a single supplier).
   * @param to The supplier address
   * @param amounts Each removal's tonnes of CO2 formatted as wei
   * @param ids The token ids to use for this batch of removals. The id itself encodes the supplier's ethereum address,
   * a parcel identifier, the vintage, country code, state code, methodology identifer, methodology version, and id
   * format.
   * @param data Encodes the project id and schedule start time for this batch of removals, the market contract
   * address and a boolean that indicates whether to list these removals for sale now.
   *
   * @dev If `list` is true in the decoded BatchMintRemovalsData, also lists those removals for sale in the market.
   *
   * ##### Requirements:
   *
   * - Enforces the rules of `Removal._beforeTokenTransfer`.
   * TODO
   */
  function mintBatch(
    address to,
    uint256[] memory amounts,
    RemovalId[] memory ids, // todo structs[] instead of encoding beforehand
    BatchMintRemovalsData memory data
  ) external onlyRole(MINTER_AND_LISTER_ROLE) {
    uint256 numberOfRemovals = ids.length;
    if (!(amounts.length == numberOfRemovals)) {
      revert ArrayLengthMismatch({array1Name: "amounts", array2Name: "ids"});
    }
    uint256 projectId = data.projectId;
    uint256 holdbackPercentage = data.holdbackPercentage;
    for (uint256 i = 0; i < numberOfRemovals; ++i) {
      RemovalId id = ids[i];
      if (
        exists(RemovalId.unwrap(id)) ||
        _removalIdToRemovalData[id].projectId != 0
      ) {
        revert TokenIdExists({tokenId: id});
      }
      _removalIdToRemovalData[id].projectId = projectId; // todo access _removalIdToRemovalData[removalId] once per loop
      _removalIdToRemovalData[id].holdbackPercentage = holdbackPercentage;
    }
    RemovalId firstRemoval = ids[0];
    _projectIdToScheduleData[projectId] = ScheduleData({
      startTime: data.scheduleStartTime,
      supplierAddress: firstRemoval.supplierAddress(),
      methodology: firstRemoval.methodology(),
      methodologyVersion: firstRemoval.methodologyVersion()
    });
    _mintBatch(to, RemovalUtils.unwrapRemovalIds(ids), amounts, "");
    if (data.list) {
      safeBatchTransferFrom(
        to,
        address(_market),
        RemovalUtils.unwrapRemovalIds(ids),
        amounts,
        ""
      );
    }
  }

  /**
   * @notice Marks an amount of a removal as released given a removal ID and a quantity.
   * @param owner The owner of the removal to release
   * @param removalId The ID of the removal to mark as released.
   * @param amount The amount of the removal to release.
   *
   * @dev
   *
   * ##### Requirements:
   *
   * - The contract must not be paused.
   * - The caller must have the `RELEASER_ROLE`.
   * - The rules of `ERC1155Upgradeable._burn` are enforced.
   */
  function release(
    address owner,
    RemovalId removalId,
    uint256 amount
  ) external onlyRole(RELEASER_ROLE) whenNotPaused {
    // todo what does this need to change about rNORI?
    // todo how should we handle the case where certificate == 0 after relasing? Should it still exist with value of 0?
    // todo decrement child removal balances of certificate if contained in one
    _burn(owner, RemovalId.unwrap(removalId), amount); // todo batch?
  }

  function marketAddress() external view returns (address) {
    return address(_market);
  }

  function restrictedNoriAddress() external view returns (address) {
    return address(_restrictedNori);
  }

  /**
   * @notice Get the restriction schedule id (which is the removal's project id) for a given removal id.
   */
  function getProjectIdForRemoval(RemovalId removalId)
    external
    view
    returns (uint256)
  {
    return _removalIdToRemovalData[removalId].projectId; // todo should this just return the whole struct?
  }

  /**
   * @notice Get the restriction schedule data for a given removal id.
   */
  function getScheduleDataForRemovalId(RemovalId removalId)
    external
    view
    returns (ScheduleData memory)
  {
    return
      _projectIdToScheduleData[_removalIdToRemovalData[removalId].projectId];
  }

  /**
   * @notice Get the restriction schedule data for a given project id.
   */
  function getScheduleDataForProjectId(uint256 projectId)
    external
    view
    returns (ScheduleData memory)
  {
    return _projectIdToScheduleData[projectId];
  }

  /** @notice Get the holdback percentages for a batch of removal ids. */
  function batchGetHoldbackPercentages(RemovalId[] memory removalIds)
    external
    view
    returns (uint256[] memory)
  {
    uint256 numberOfRemovals = removalIds.length;
    uint256[] memory holdbackPercentages = new uint256[](numberOfRemovals);
    for (uint256 i = 0; i < numberOfRemovals; ++i) {
      RemovalId id = removalIds[i];
      holdbackPercentages[i] = _removalIdToRemovalData[id].holdbackPercentage;
    }
    return holdbackPercentages;
  }

  function cumulativeBalanceOfBatch(address[] memory accounts)
    external
    view
    returns (uint256[] memory)
  {
    uint256 numberOfAccounts = accounts.length; // todo global rename (accounts -> owners)
    uint256[] memory batchBalances = new uint256[](numberOfAccounts);
    for (uint256 i = 0; i < numberOfAccounts; ++i) {
      batchBalances[i] = this.cumulativeBalanceOf(accounts[i]);
    }
    return batchBalances;
  }

  // todo batch?
  function tokensOfOwner(
    address owner // todo global rename (tokens -> removals?)
  ) external view returns (uint256[] memory) {
    return _addressToOwnedTokenIds[owner].values();
  }

  // todo rename cumulativeBalanceOfOwner
  // todo batch?
  function cumulativeBalanceOf(address owner) external view returns (uint256) {
    // todo are the bodies of these functions re-usable across the contract? Seems like an abstraction might be possible
    EnumerableSetUpgradeable.UintSet storage removals = _addressToOwnedTokenIds[
      owner
    ];
    uint256 numberOfTokensOwned = removals.length();
    address[] memory owners = new address[](numberOfTokensOwned);
    for (uint256 i = 0; i < numberOfTokensOwned; ++i) {
      owners[i] = owner;
    }
    uint256[] memory totals = balanceOfBatch(owners, removals.values());
    uint256 total = 0;
    for (uint256 i = 0; i < numberOfTokensOwned; ++i) {
      total += totals[i];
    }
    return total;
  }

  // todo do we need to also add a version of these functions compatible with childTokens in certificate?
  // todo batch?
  function cumulativeBalanceOfOwnerSubset(address owner, RemovalId[] memory ids)
    external
    view
    returns (uint256)
  {
    address[] memory owners = new address[](ids.length);
    for (uint256 i = 0; i < ids.length; ++i) {
      owners[i] = owner;
    }
    uint256[] memory totals = balanceOfBatch(
      owners,
      RemovalUtils.unwrapRemovalIds(ids)
    );
    uint256 total = 0;
    for (uint256 i = 0; i < totals.length; ++i) {
      total += totals[i];
    }
    return total;
  }

  // todo batch?
  function numberOfTokensOwnedByAddress(address account)
    external
    view
    returns (uint256)
  {
    // todo global rename tokens -> removals?
    return _addressToOwnedTokenIds[account].length();
  }

  // todo better naming for all balance functions (e.g., balanceOfIds -> blanaceOfRemovalsForAccount)
  function balanceOfIds(address account, RemovalId[] memory ids)
    external
    view
    returns (uint256[] memory)
  {
    uint256[] memory batchBalances = new uint256[](ids.length);
    for (uint256 i = 0; i < ids.length; ++i) {
      batchBalances[i] = balanceOf(account, RemovalId.unwrap(ids[i])); // todo batch;
    }
    return batchBalances;
  }

  /**
   * @notice Packs data about a removal into a 256-bit token id for the removal.
   * @dev Performs some possible validations on the data before attempting to create the id.
   * @param removalData removal data encoded as bytes, with the first byte storing the version.
   */
  function createRemovalId(
    bytes calldata removalData // todo look into using calldata elsewhere
  ) external pure returns (RemovalId) {
    // todo add struct version and remove non-struct version
    return RemovalUtils.createRemovalId(removalData);
  }

  /**
   * @notice Unpacks a V0 removal id into its component data.
   */
  function unpackRemovalIdV0(RemovalId removalId)
    external
    pure
    returns (UnpackedRemovalIdV0 memory)
  {
    return removalId.unpackRemovalIdV0();
  }

  /**
   * @dev Overrides the default behavior of `ERC1155Upgradeable.safeBatchTransferFrom` to allow admins to list removals
   * for sale.
   */
  function safeBatchTransferFrom(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public override {
    if (hasRole(MINTER_AND_LISTER_ROLE, _msgSender())) {
      _safeBatchTransferFrom(from, to, ids, amounts, data);
    } else {
      super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, AccessControlEnumerableUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @notice Hook that is called before before any token transfer. This includes minting and burning, as well as
   * batched variants.
   *
   * @dev Follows the rules of hooks defined [here](
   *  https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)
   *
   * ##### Requirements:
   *
   * - The contract must not be paused
   * - Enforces the rules of `ERC1155Upgradeable._beforeTokenTransfer`.
   * - Enforces the rules of `ERC1155SupplyUpgradeable._beforeTokenTransfer`.
   * TODO rest
   */
  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal override whenNotPaused {
    uint256 numberOfTokenTransfers = amounts.length;
    for (uint256 i = 0; i < numberOfTokenTransfers; ++i) {
      uint256 id = ids[i];
      if (from != address(0)) {
        _addressToOwnedTokenIds[from].remove(id);
      }
      if (to != address(0)) {
        _addressToOwnedTokenIds[to].add(id);
      }
    }
    return super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }
}
