// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "./Market.sol";
import {RemovalUtils, UnpackedRemovalIdV0} from "./RemovalUtils.sol";
import {ArrayLengthMismatch} from "./Errors.sol";

// todo global rename (accounts -> owners)
// todo disable other mint functions
// todo investigate ERC1155SupplyUpgradeable.totalSupply
// todo look into this and use unchecked more https://github.com/OpenZeppelin/openzeppelin-contracts/issues/3512
// todo globally pack structs
// todo define all structs at the file level as it makes it easier to import

struct BatchMintRemovalsData {
  // todo can we de-dupe this with RemovalData? perhaps by nesting the struct?
  uint256 projectId; // todo what is the max project ID size?
  uint256 scheduleStartTime;
  uint8 holdbackPercentage;
  bool list;
}

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
 * @title Removal // todo
 */
contract Removal is ERC1155SupplyUpgradeable, PausableAccessPreset {
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  error TokenIdExists(uint256 tokenId);

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
   * @notice the RestrictedNORI contract that manages restricted tokens.
   */
  RestrictedNORI private _restrictedNori;

  /**
   * @notice The Market contract that removals can be bought and sold from.
   */
  Market private _market;

  /**
   * @notice The Certificate contract that removals are retired into.
   */
  Certificate private _certificate;

  mapping(uint256 => RemovalData) private _removalIdToRemovalData;
  mapping(uint256 => ScheduleData) private _projectIdToScheduleData; // todo why does this live here and not in rNORI?
  mapping(address => EnumerableSetUpgradeable.UintSet)
    private _addressToOwnedTokenIds; // todo tests that ensure this is maintained correctly

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
   * @dev Registers the market, rNORI, and certificate contracts so that they can be referenced in this contract.
   */
  function registerContractAddresses(
    RestrictedNORI restrictedNori,
    Market market,
    Certificate certificate
  ) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
    // todo configureContract() that does this + grantRole
    // todo can any of these be included in the initializer instead?
    // todo need a better contract registry system
    // todo do we want to break apart these registerContractAddresses() functions for each separate contract?
    _restrictedNori = restrictedNori;
    _market = market;
    _certificate = certificate;
  }

  /**
   * @notice Mints multiple removals at once (for a single supplier).
   * @param to The supplier address.
   * @param amounts Each removal's tonnes of CO2 formatted as wei.
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
    uint256[] memory ids, // todo structs[] instead of encoding beforehand
    BatchMintRemovalsData memory data
  ) external onlyRole(MINTER_AND_LISTER_ROLE) {
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
      supplierAddress: RemovalUtils.supplierAddress(firstRemoval),
      methodology: RemovalUtils.methodology(firstRemoval),
      methodologyVersion: RemovalUtils.methodologyVersion(firstRemoval)
    });
    _mintBatch(to, ids, amounts, "");
    if (data.list) {
      safeBatchTransferFrom(to, address(_market), ids, amounts, "");
    }
  }

  /**
   * @notice Marks an amount of a removal as released given a removal ID and a quantity.
   * @param owner The owner of the removal to release.
   * @param removalId The ID of the removal to mark as released.
   * @param amount The amount of the removal to release.
   *
   * @dev
   *
   * ##### Requirements:
   *
   * - The rules of `_beforeTokenTransfer` are enforced.
   * - The caller must have the `RELEASER_ROLE`.
   * - The rules of `_burn` are enforced.
   */
  function release(
    address owner,
    uint256 removalId,
    uint256 amount
  ) external onlyRole(RELEASER_ROLE) {
    // todo what does this need to change about rNORI?
    // todo how should we handle the case where certificate == 0 after relasing? Should it still exist with value of 0?
    // todo decrement child removal balances of certificate if contained in one
    _burn(owner, removalId, amount); // todo batch?
  }

  function marketAddress() external view returns (address) {
    return address(_market);
  }

  function restrictedNoriAddress() external view returns (address) {
    return address(_restrictedNori);
  }

  function certificateAddress() external view returns (address) {
    return address(_certificate);
  }

  /**
   * @notice Gets the restriction schedule id (which is the removal's project id) for a given removal id.
   */
  function getProjectIdForRemoval(uint256 removalId)
    external
    view
    returns (uint256)
  {
    return _removalIdToRemovalData[removalId].projectId; // todo should this just return the whole struct?
  }

  /**
   * @notice Gets the restriction schedule data for a given removal id.
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
   * @notice Gets the restriction schedule data for a given project id.
   */
  function getScheduleDataForProjectId(uint256 projectId)
    external
    view
    returns (ScheduleData memory)
  {
    return _projectIdToScheduleData[projectId];
  }

  /** @notice Gets the holdback percentages for a batch of removal ids. */
  function batchGetHoldbackPercentages(uint256[] memory removalIds)
    external
    view
    returns (uint256[] memory)
  {
    uint256 numberOfRemovals = removalIds.length;
    uint256[] memory holdbackPercentages = new uint256[](numberOfRemovals);
    for (uint256 i = 0; i < numberOfRemovals; ++i) {
      uint256 id = removalIds[i];
      holdbackPercentages[i] = _removalIdToRemovalData[id].holdbackPercentage;
    }
    return holdbackPercentages;
  }

  function cumulativeBalanceOfBatch(address[] memory accounts)
    external
    view
    returns (uint256[] memory)
  {
    // todo use multicall instead
    uint256 numberOfAccounts = accounts.length;
    uint256[] memory batchBalances = new uint256[](numberOfAccounts);
    for (uint256 i = 0; i < numberOfAccounts; ++i) {
      batchBalances[i] = this.cumulativeBalanceOf(accounts[i]);
    }
    return batchBalances;
  }

  function tokensOfOwner(
    address owner // todo global rename (tokens -> removals?)
  ) external view returns (uint256[] memory) {
    return _addressToOwnedTokenIds[owner].values();
  }

  // todo rename cumulativeBalanceOfOwner
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

  // todo better naming for all balance functions (e.g., balanceOfIds -> blanaceOfRemovalsForAccount)
  function balanceOfIds(address account, uint256[] memory ids)
    external
    view
    returns (uint256[] memory)
  {
    uint256[] memory batchBalances = new uint256[](ids.length);
    for (uint256 i = 0; i < ids.length; ++i) {
      batchBalances[i] = balanceOf(account, ids[i]); // todo batch;
    }
    return batchBalances;
  }

  /**
   * @notice Packs data about a removal into a 256-bit token id for the removal.
   * @dev Performs some possible validations on the data before attempting to create the id.
   * @param removalData removal data struct to be packed into a uint256 ID
   */
  function createRemovalId(
    UnpackedRemovalIdV0 memory removalData // todo look into using calldata elsewhere
  ) external pure returns (uint256) {
    // todo add struct version and remove non-struct version
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
    return RemovalUtils.unpackRemovalIdV0(removalId);
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
    if (
      hasRole(MINTER_AND_LISTER_ROLE, _msgSender())
    ) // todo this should probably just be a different function name
    {
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
   * @notice Burns an amount of tokens from an account.
   * @dev Destroys `amount` tokens of token type `id` from `from`. If the tokens are included as part of any
   * certificates, the certificate balances are decremented by `amount` as well.
   *
   * ##### Requirements:
   *
   * - Enforces the rules of `ERC1155Upgradeable._burn`.
   */
  function _burn(
    address from,
    uint256 id,
    uint256 amount
  ) internal override {
    if (from == address(_market)) {
      _market.release(id, amount);
    } else if (from == address(_certificate)) {
      Certificate.Balance[] memory certificatesOfRemoval = _certificate
        .certificatesOfRemoval(id);
      uint256 numberOfCertificatesForRemoval = certificatesOfRemoval.length;
      bytes[] memory releaseCalls = new bytes[](numberOfCertificatesForRemoval);
      for (uint256 i = 0; i < numberOfCertificatesForRemoval; ++i) {
        // todo releaseFromCertificate vs releaseUnlisted
        Certificate.Balance memory certificateBalance = certificatesOfRemoval[
          i
        ];
        releaseCalls[i] = abi.encodeWithSelector(
          _certificate.releaseRemoval.selector,
          certificateBalance.id,
          id,
          certificateBalance.amount
        );
      }
      _certificate.multicall(releaseCalls);
    }
    super._burn(from, id, amount);
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
   * - The contract must not be paused.
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
    return super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  // todo (and fix _beforeTokenTransfer docs)
  function _afterTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal override {
    // todo any good reason not to merge before + after hooks?
    uint256 numberOfTokenTransfers = amounts.length;
    for (uint256 i = 0; i < numberOfTokenTransfers; ++i) {
      uint256 id = ids[i];
      if (from != address(0)) {
        if (balanceOf(from, id) == 0) {
          _addressToOwnedTokenIds[from].remove(id);
        }
      }
      if (to != address(0)) {
        _addressToOwnedTokenIds[to].add(id);
      }
    }
    return super._afterTokenTransfer(operator, from, to, ids, amounts, data);
  }
}
