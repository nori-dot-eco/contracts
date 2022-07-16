// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";
import "./RestrictedNORI.sol";
import {RemovalUtils, UnpackedRemovalIdV0} from "./RemovalUtils.sol";
import {TokenIdExists, ArrayLengthMismatch} from "./SharedCustomErrors.sol";
import "./Market.sol";

struct BatchMintRemovalsData {
  uint256 projectId;
  uint256 scheduleStartTime;
  uint256 holdbackPercentage;
  bool list;
}

// todo disable other mint functions
// todo investigate ERC1155SupplyUpgradeable.totalSupply

/**
 * @title Removal // todo
 */
contract Removal is
  ERC1155PausableUpgradeable,
  ERC1155BurnableUpgradeable,
  ERC1155SupplyUpgradeable,
  AccessControlEnumerableUpgradeable
{
  using RemovalUtils for uint256;
  using EnumerableMapUpgradeable for EnumerableMapUpgradeable.UintToAddressMap;
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
   * @dev only a Nori admin address should have this role.
   */
  bytes32 public constant RELEASER_ROLE = keccak256("RELEASER_ROLE");

  /**
   * @notice Role conferring the abilit to mint removals.
   *
   * @dev only a Nori admin address should have this role.
   */
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /**
   * @notice Role conferring pausing and unpausing of this contract.
   *
   * @dev only a Nori admin address should have this role.
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

  mapping(uint256 => RemovalData) private _removalIdToRemovalData;
  mapping(uint256 => ScheduleData) private _projectIdToScheduleData;
  mapping(address => EnumerableSetUpgradeable.UintSet)
    private _addressToOwnedTokenIds;

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  function initialize() external initializer {
    __ERC1155_init_unchained("https://nori.com/api/removal/{id}.json");
    __Pausable_init_unchained();
    __ERC1155Burnable_init_unchained();
    __ERC1155Supply_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
    _grantRole(MINTER_ROLE, _msgSender());
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
    _restrictedNori = RestrictedNORI(restrictedNoriAddress_);
    _market = marketAddress_;
  }

  function marketAddress() external view returns (address) {
    return address(_market);
  }

  function restrictedNoriAddress() external view returns (address) {
    return address(_restrictedNori);
  }

  /**
   * @notice Packs data about a removal into a 256-bit token id for the removal.
   * @dev Performs some possible validations on the data before attempting to create the id.
   * @param removalData removal data encoded as bytes, with the first byte storing the version.
   */
  function createRemovalId(bytes calldata removalData)
    external
    pure
    returns (uint256)
  {
    return RemovalUtils.createRemovalId(removalData);
  }

  /**
   * @notice Unpacks a V0 removal id into its component data.
   */
  function unpackRemovalIdV0(uint256 removalId)
    external
    pure
    returns (UnpackedRemovalIdV0 memory)
  {
    return removalId.unpackRemovalIdV0();
  }

  /**
   * @notice Get the restriction schedule id (which is the removal's project id) for a given removal id.
   */
  function getProjectIdForRemoval(uint256 removalId)
    external
    view
    returns (uint256)
  {
    return _removalIdToRemovalData[removalId].projectId; // todo should this just return the whole struct?
  }

  /**
   * @notice Get the restriction schedule data for a given removal id.
   */
  function getScheduleDataForRemovalId(uint256 removalId)
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

  /** Get the holdback percentages for a batch of removal ids. */
  function batchGetHoldbackPercentages(uint256[] memory removalIds)
    external
    view
    returns (uint256[] memory)
  {
    uint256 numberOFRemovals = removalIds.length;
    uint256[] memory holdbackPercentages = new uint256[](numberOFRemovals);
    for (uint256 i = 0; i < numberOFRemovals; ++i) {
      uint256 id = removalIds[i];
      holdbackPercentages[i] = _removalIdToRemovalData[id].holdbackPercentage;
    }
    return holdbackPercentages;
  }

  /**
   * @notice Mints multiple removals at once (for a single supplier).
   * @dev If `list` is true in the decoded BatchMintRemovalsData, also lists those removals for sale in the market.
   * @param to The supplier address
   * @param amounts Each removal's tonnes of CO2 formatted as wei
   * @param ids The token ids to use for this batch of removals. The id itself encodes the supplier's ethereum address,
   * a parcel identifier, the vintage, country code, state code, methodology identifer, methodology version, and id
   * format.
   * @param data Encodes the project id and schedule start time for this batch of removals, the market contract
   * address and a boolean that indicates whether to list these removals for sale now.
   */
  function mintBatch(
    address to,
    uint256[] memory amounts,
    uint256[] memory ids, // todo structs[] instead of encoding beforehand
    BatchMintRemovalsData memory data
  ) external {
    uint256 numberOfRemovals = ids.length;
    if (!(amounts.length == numberOfRemovals)) {
      revert ArrayLengthMismatch({array1Name: "amounts", array2Name: "ids"});
    }
    uint256 projectId = data.projectId;
    uint256 holdbackPercentage = data.holdbackPercentage;
    for (uint256 i = 0; i < numberOfRemovals; ++i) {
      uint256 id = ids[i];
      if (exists(id) || _removalIdToRemovalData[id].projectId != 0) {
        revert TokenIdExists({tokenId: id});
      }
      _removalIdToRemovalData[id].projectId = projectId; // todo access _removalIdToRemovalData[removalId] once per loop
      _removalIdToRemovalData[id].holdbackPercentage = holdbackPercentage;
    }
    uint256 firstRemoval = ids[0];
    _projectIdToScheduleData[projectId] = ScheduleData({
      startTime: data.scheduleStartTime,
      supplierAddress: firstRemoval.supplierAddress(),
      methodology: firstRemoval.methodology(),
      methodologyVersion: firstRemoval.methodologyVersion()
    });
    _mintBatch(to, ids, amounts, "");
    _setApprovalForAll(to, _msgSender(), true); // todo look at vesting contract for potentially better approach
    if (data.list) {
      safeBatchTransferFrom(to, address(_market), ids, amounts, "");
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
   * - The `amount` for the removal must be <= the removal's initial amount
   */
  function release(
    address owner,
    uint256 removalId,
    uint256 amount
  ) external onlyRole(RELEASER_ROLE) {
    // todo initialBalanceOf? should be amount + released?
    // Querying the details of a removal returns a flag showing the quantity that was invalidated.
    // If this Removal has not been completely sold, we will not sell the invalidated amount of that Removal
    burn(owner, removalId, amount); // todo remove external burn interface and use internal one
    if (owner == address(_market)) {
      Market(owner).release(removalId, amount);
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
   * @dev Approve `operator` to operate on all of `owner`'s tokens
   */
  function _setApprovalForAll(
    address owner,
    address operator,
    bool approved
  ) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
    super._setApprovalForAll(owner, operator, approved);
  }

  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  )
    internal
    override(
      ERC1155SupplyUpgradeable,
      ERC1155PausableUpgradeable,
      ERC1155Upgradeable
    )
    whenNotPaused
  {
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
  function cumulativeBalanceOfOwnerSubset(address owner, uint256[] memory ids)
    external
    view
    returns (uint256)
  {
    address[] memory owners = new address[](ids.length);
    for (uint256 i = 0; i < ids.length; ++i) {
      owners[i] = owner;
    }
    uint256[] memory totals = balanceOfBatch(owners, ids);
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

  function balanceOfIds(address account, uint256[] memory ids)
    external
    view
    returns (uint256[] memory)
  {
    uint256[] memory batchBalances = new uint256[](ids.length);
    for (uint256 i = 0; i < ids.length; ++i) {
      batchBalances[i] = balanceOf(account, ids[i]);
    }
    return batchBalances;
  }
}
