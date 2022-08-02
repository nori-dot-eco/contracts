// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "./Market.sol";
import {RemovalIdLib, UnpackedRemovalIdV0} from "./RemovalIdLib.sol";
import "./Errors.sol";

// todo shared Consider a shared MinterAccessPreset base contract that handles minting roles so role names can be shared
// todo consider globally renaming `account` to `owner`. Or if not, make sure we are cosnsistent with the naming
// todo disable unused inherited mint functions
// todo check that we are not re-defining logic inherited from `ERC1155SupplyUpgradeable` (esp. `totalSupply`)
// todo Removal.sol defines several structs making it a strong candidate for gas optimization
// todo consider removing cumulative fns and instead use multicall where needed to prevent defining fns that dont scale

struct BatchMintRemovalsData {
  uint256 projectId; // todo what is the max project ID size? Smaller id allows tighter `BatchMintRemovalsData` struct.
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
 * @title Removal
 */
contract Removal is
  ERC1155SupplyUpgradeable,
  PausableAccessPreset,
  MulticallUpgradeable
{
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  /**
   * @notice Role conferring the the ability to mark a removal as released.
   */
  bytes32 public constant RELEASER_ROLE = keccak256("RELEASER_ROLE");

  /**
   * @notice Role conferring the ability to mint removals as well as the ability to list minted removals that have yet
   * to be listed for sale.
   */
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  /**
   * @notice The `Market` contract that removals can be bought and sold from.
   */
  Market private _market;

  /**
   * @notice The `Certificate` contract that removals are retired into.
   */
  Certificate private _certificate;

  // todo Test accounting for `_removalIdToRemovalData` is maintained correctly (assuming we need it)
  mapping(uint256 => RemovalData) private _removalIdToRemovalData;
  // todo Test accounting for `_projectIdToScheduleData` is maintained correctly (assuming we need it)
  // todo consider moving `Removal._projectIdToScheduleData` to rNori
  mapping(uint256 => ScheduleData) private _projectIdToScheduleData;
  // todo Test accounting for `_addressToOwnedTokenIds` is maintained correctly (assuming we need it)
  mapping(address => EnumerableSetUpgradeable.UintSet)
    private _addressToOwnedTokenIds;
  uint256 private _currentMarketBalance;

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  function initialize() external initializer {
    __Context_init_unchained();
    __ERC1155_init_unchained("https://nori.com/api/removal/{id}.json");
    __Pausable_init_unchained();
    __ERC1155Supply_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Multicall_init_unchained();
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
    _grantRole(MINTER_ROLE, _msgSender());
    _grantRole(RELEASER_ROLE, _msgSender());
  }

  /**
   * @dev Registers the market, and certificate contracts so that they can be referenced in this contract.
   */
  function registerContractAddresses(Market market, Certificate certificate)
    external
    whenNotPaused
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _market = market;
    _certificate = certificate;
  }

  /**
   * @notice Mints multiple removals at once (for a single supplier).
   * @param to The supplier address.
   * @param amounts Each removal's tonnes of CO2 formatted as wei.
   * @param ids The token ids to use for this batch of removals. The id itself encodes the supplier's ethereum address,
   * a parcel identifier, the vintage, country code, state code, methodology identifier, methodology version, and id
   * format.
   * @param data Encodes the project id and schedule start time for this batch of removals, the market contract
   * address and a boolean that indicates whether to list these removals for sale now.
   *
   * @dev If `list` is true in the decoded BatchMintRemovalsData, also lists those removals for sale in the market.
   *
   * ##### Requirements:
   *
   * - Enforces the rules of `Removal._beforeTokenTransfer`.
   * TODO add remaining `mintBatch` requirements docs
   */
  function mintBatch(
    address to,
    uint256[] memory amounts,
    uint256[] memory ids, // todo consider changing the ids arg from uint256[] -> UnpackedRemovalIdV0[]
    BatchMintRemovalsData memory data // todo is a struct necessary for the data arg? Can we just add args instead?
  ) external onlyRole(MINTER_ROLE) {
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
      supplierAddress: RemovalIdLib.supplierAddress(firstRemoval),
      methodology: RemovalIdLib.methodology(firstRemoval),
      methodologyVersion: RemovalIdLib.methodologyVersion(firstRemoval)
    });
    _mintBatch(to, ids, amounts, "");
    RestrictedNORI(_market.restrictedNoriAddress()).createSchedule(projectId);
    if (data.list) {
      safeBatchTransferFrom({
        from: to,
        to: address(_market),
        ids: ids,
        amounts: amounts,
        data: ""
      });
    }
  }

  /**
   * @notice Releases an amount of a removal.
   * @dev Releases `amount` of removal by `removalId` by burning them.
   *
   * ##### Requirements:
   *
   * - Releasing burns first from unlisted balances, second from listed balances and third from certificates.
   * - 1. If the removal is unlisted (e.g., owned by any account other than the market or certificate), the removal is
   * simply burned.
   * - 2. If the removal is listed, it is delisted from the market and burned.
   * - 3. If the removal is owned by one or more certificates, the removal is burned iteratively across each certificate
   * until the amount is exhausted (e.g., if a removal of amount 3 releases an amount of 2.5 and that removal is owned
   * by 3 certificates containing an amount of 1 from the released removal, the resulting certificate's removal balances
   * for this removal are: 0, 0, and 0.5).
   * - If the removal is included as part of any certificates, the certificate balances are decremented by `amount`.
   * - The rules of `_beforeTokenTransfer` are enforced.
   * - The caller must have the `RELEASER_ROLE`.
   * - The rules of `_burn` are enforced.
   *
   * @param removalId The ID of the removal to release some amount of.
   * @param amount The amount of the removal to release.
   */
  function release(uint256 removalId, uint256 amount)
    external
    onlyRole(RELEASER_ROLE)
  {
    // todo might need to add pagination/incremental if removal spans a ton of certificates and reaches max gas
    uint256 amountReleased = 0;
    uint256 unlistedBalance = balanceOf({
      account: RemovalIdLib.supplierAddress(removalId),
      id: removalId
    });
    if (unlistedBalance > 0) {
      uint256 amountToRelease = MathUpgradeable.min(amount, unlistedBalance);
      _releaseFromSupplier({removalId: removalId, amount: amountToRelease});
      amountReleased += amountToRelease;
    }
    if (amountReleased < amount) {
      uint256 listedBalance = balanceOf(this.marketAddress(), removalId);
      if (listedBalance > 0) {
        uint256 amountToRelease = MathUpgradeable.min(
          amount - amountReleased,
          listedBalance
        );
        _releaseFromMarket({amount: amountToRelease, removalId: removalId});
        amountReleased += amountToRelease;
      }
      if (amountReleased < amount) {
        if (balanceOf(this.certificateAddress(), removalId) > 0) {
          uint256 amountToRelease = amount - amountReleased;
          _releaseFromCertificate({
            removalId: removalId,
            amount: amount - amountReleased
          });
          amountReleased += amountToRelease;
        }
      }
    }
  }

  function marketAddress() external view returns (address) {
    return address(_market);
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
    // todo consider making `getProjectIdForRemoval` return the whole schedule struct instead of the id
    return _removalIdToRemovalData[removalId].projectId;
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

  // todo this function will not scale well- consider dropping it somehow
  function tokensOfOwner(
    address owner // todo global rename (tokens -> removals?)
  ) external view returns (uint256[] memory) {
    return _addressToOwnedTokenIds[owner].values();
  }

  function getMarketBalance() external view returns (uint256) {
    return _currentMarketBalance;
  }

  // todo rename cumulativeBalanceOf -> cumulativeBalanceOfOwner (if we decide to keep it)
  // todo this function will not scale well as it relies on set.values- consider dropping it
  function cumulativeBalanceOf(address owner) external view returns (uint256) {
    // todo if we decide to keep this function, improve internal abstraction to re-use across cumulative funcs
    EnumerableSetUpgradeable.UintSet storage removals = _addressToOwnedTokenIds[
      owner
    ];
    uint256 numberOfTokensOwned = this.numberOfTokensOwnedByAddress(owner);
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

  function numberOfTokensOwnedByAddress(address account)
    external
    view
    returns (uint256)
  {
    return _addressToOwnedTokenIds[account].length();
  }

  function balanceOfIds(address account, uint256[] memory ids)
    external
    view
    returns (uint256[] memory)
  {
    uint256[] memory batchBalances = new uint256[](ids.length);
    for (uint256 i = 0; i < ids.length; ++i) {
      batchBalances[i] = balanceOf(account, ids[i]); // todo batch retrieve balances outside of loop
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
    return RemovalIdLib.createRemovalId(removalData);
  }

  /**
   * @notice Unpacks a V0 removal id into its component data.
   */
  function unpackRemovalIdV0(uint256 removalId)
    external
    pure
    returns (UnpackedRemovalIdV0 memory)
  {
    return RemovalIdLib.unpackRemovalIdV0(removalId);
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
    // todo _safeTransferFrom doesn't have the same behavior as this batch variant.fix that or disable non-batch version
    if (hasRole(MINTER_ROLE, _msgSender())) {
      _safeBatchTransferFrom({
        from: from,
        to: to,
        ids: ids,
        amounts: amounts,
        data: data
      });
    } else {
      super.safeBatchTransferFrom({
        from: from,
        to: to,
        ids: ids,
        amounts: amounts,
        data: data
      });
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
    uint256 numberOfTokenTransfers = amounts.length;
    for (uint256 i = 0; i < numberOfTokenTransfers; ++i) {
      if (amounts[i] == 0) {
        revert RemovalAmountZero({tokenId: ids[i]});
      }
      if (to == address(_market)) {
        _currentMarketBalance += amounts[i];
      }
      if (from == address(_market)) {
        _currentMarketBalance -= amounts[i];
      }
    }
    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  function _releaseFromSupplier(uint256 removalId, uint256 amount) internal {
    super._burn(RemovalIdLib.supplierAddress(removalId), removalId, amount);
  }

  function _releaseFromMarket(uint256 removalId, uint256 amount) internal {
    super._burn(this.marketAddress(), removalId, amount);
    _market.release(removalId, amount);
  }

  function _releaseFromCertificate(uint256 removalId, uint256 amount) internal {
    uint256 amountReleased = 0;
    Certificate.Balance[] memory certificatesOfRemoval = _certificate
      .certificatesOfRemoval(removalId);
    uint256 numberOfCertificatesForRemoval = certificatesOfRemoval.length;
    bytes[] memory releaseCalls = new bytes[](numberOfCertificatesForRemoval);
    for (uint256 i = 0; i < numberOfCertificatesForRemoval; ++i) {
      Certificate.Balance memory certificateBalance = certificatesOfRemoval[i];
      uint256 amountToReleaseFromCertificate = MathUpgradeable.min(
        amount - amountReleased,
        certificateBalance.amount
      );
      amountReleased += amountToReleaseFromCertificate;
      super._burn(
        this.certificateAddress(),
        removalId,
        amountToReleaseFromCertificate
      );
      releaseCalls[i] = abi.encodeWithSelector(
        _certificate.releaseRemoval.selector,
        certificateBalance.id,
        removalId,
        amountToReleaseFromCertificate
      );
      if (amountReleased == amount) break;
    }
    _certificate.multicall(releaseCalls);
  }

  function _afterTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal override {
    // todo find a way to merge _afterTokenTransfer and _beforeTokenTransfer, otherwise we loop through all IDs 2x
    uint256 numberOfTokenTransfers = amounts.length;
    for (uint256 i = 0; i < numberOfTokenTransfers; ++i) {
      uint256 id = ids[i];
      if (from != address(0)) {
        if (
          balanceOf(from, id) == 0 // todo batch calls to remove using multicall instead of calling in a loop
        ) {
          _addressToOwnedTokenIds[from].remove(id);
        }
      }
      if (to != address(0)) {
        _addressToOwnedTokenIds[to].add(id);
      }
    }
    super._afterTokenTransfer(operator, from, to, ids, amounts, data);
  }
}
