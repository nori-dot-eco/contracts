// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "./Market.sol";
import {RemovalIdLib, UnpackedRemovalIdV0} from "./RemovalIdLib.sol";
import {InvalidCall} from "./Errors.sol";
import "forge-std/console2.sol";
// todo shared Consider a shared MinterAccessPreset base contract that handles minting roles so role names can be shared
// todo consider globally renaming `account` to `owner`. Or if not, make sure we are cosnsistent with the naming
// todo disable unused inherited mint functions
// todo check that we are not re-defining logic inherited from `ERC1155SupplyUpgradeable` (esp. `totalSupply`)
// todo Removal.sol defines several structs making it a strong candidate for gas optimization
// todo consider removing cumulative fns and instead use multicall where needed to prevent defining fns that dont scale

// struct ScheduleData {
//   uint256 startTime;
//   // uint256 methodology;
//   // uint256 methodologyVersion;
// }

// struct RemovalData {
//   uint256 projectId;
//   uint256 holdbackPercentage;
// }

error TokenIdExists(uint256 tokenId);
error RemovalAmountZero(uint256 tokenId);

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
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); // todo listing (consigner role?)

  /**
   * @notice The `Market` contract that removals can be bought and sold from.
   */
  Market private _market;

  /**
   * @notice The `Certificate` contract that removals are retired into.
   */
  Certificate private _certificate;

  // todo Test accounting for `_projectIdToHoldbackPercentage` is maintained correctly (assuming we need it)
  mapping(uint256 => uint8) private _projectIdToHoldbackPercentage;
  // todo Test accounting for `_removalIdToProjectId` is maintained correctly (assuming we need it)
  // todo consider moving `Removal._removalIdToProjectId` to rNori
  mapping(uint256 => uint256) private _removalIdToProjectId;
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
   * @param amounts Each removal's tonnes of CO2 formatted.
   * @param removals The removals to mint (represented as an array of `UnpackedRemovalIdV0`). These removals are used
   * to encode the removal IDs.
   * @param projectId The project id for this batch of removals.
   * @param scheduleStartTime The start time of the schedule for this batch of removals.
   * @param holdbackPercentage The holdback percentage for this batch of removals.
   *
   * @dev If `to` is the market address, the removals are listed for sale in the market.
   *
   * ##### Requirements:
   *
   * - Enforces the rules of `Removal._beforeTokenTransfer`.
   * TODO add remaining `mintBatch` requirements docs
   */
  function mintBatch(
    address to,
    uint256[] calldata amounts,
    UnpackedRemovalIdV0[] calldata removals,
    uint256 projectId,
    uint256 scheduleStartTime,
    uint8 holdbackPercentage
  ) external onlyRole(MINTER_ROLE) {
    uint256[] memory removalIds = _createRemovalDataBatch({
      removals: removals,
      projectId: projectId
    });
    _projectIdToHoldbackPercentage[projectId] = holdbackPercentage;
    _mintBatch({to: to, ids: removalIds, amounts: amounts, data: ""});
    RestrictedNORI(_market.restrictedNoriAddress()).createSchedule({
      projectId: projectId,
      startTime: scheduleStartTime,
      methodology: removals[0].methodology, // todo enforce same methodology+version across ids?
      methodologyVersion: removals[0].methodologyVersion
    });
  }

  function consign(
    address from,
    uint256 id,
    uint256 amount
  )
    external
    onlyRole(MINTER_ROLE) // todo consignor_role
  {
    // todo test that checks consignment can happen using multi call with mix-match project ids
    _safeTransferFrom({
      from: from,
      to: address(_market),
      id: id,
      amount: amount,
      data: ""
    });
  }

  /**
   * @notice Releases an amount of a removal.
   * @dev Releases `amount` of removal by `removalId` by burning them.
   *
   * ##### Requirements:
   *
   * - Releasing burns first from unlisted balances, second from listed balances and third from certificates.
   * - If the removal is unlisted (e.g., owned by any account other than the market or certificate), the removal is
   * simply burned.
   * - If the removal is listed, it is delisted from the market and burned.
   * - If the removal is owned by one or more certificates, the removal is burned iteratively across each certificate
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

  // /**
  //  * @notice Gets the restriction schedule id (which is the removal's project id) for a given removal id.
  //  */
  // function getRemovalData(uint256 removalId)
  //   external
  //   view
  //   returns (RemovalData memory)
  // {
  //   return _removalIdToRemovalData[removalId];
  // }

  /**
   * @notice Gets the restriction schedule id (which is the removal's project id) for a given removal id.
   */
  function getProjectId(uint256 removalId) external view returns (uint256) {
    return _removalIdToProjectId[removalId];
  }

  // /**
  //  * @notice Gets the restriction schedule data for a given removal id.
  //  */
  // function getScheduleStartTimeForRemovalId(uint256 removalId)
  //   external
  //   view
  //   returns (uint256 memory)
  // {
  //   return
  //     _projectIdToScheduleStartTime[
  //       _removalIdToRemovalData[removalId].projectId
  //     ];
  // }

  // /**
  //  * @notice Gets the restriction schedule data for a given project id.
  //  */
  // function getScheduleDataForProjectId(uint256 projectId)
  //   external
  //   view
  //   returns (ScheduleData memory)
  // {
  //   return _projectIdToScheduleStartTime[projectId];
  // }

  // /**
  //  * @notice Gets the restriction schedule data for a given project id.
  //  */
  // function getScheduleDataForProjectId(uint256 projectId)
  //   external
  //   view
  //   returns (ScheduleData memory)
  // {
  //   return _projectIdToScheduleStartTime[projectId];
  // }

  /** @notice Gets the holdback percentages for a batch of removal ids. */
  function batchGetHoldbackPercentages(uint256[] calldata removalIds)
    external
    view
    returns (uint256[] memory)
  {
    uint256 numberOfRemovals = removalIds.length;
    uint256[] memory holdbackPercentages = new uint256[](numberOfRemovals);
    for (uint256 i = 0; i < numberOfRemovals; ++i) {
      holdbackPercentages[i] = _projectIdToHoldbackPercentage[
        _removalIdToProjectId[removalIds[i]]
      ];
    }
    return holdbackPercentages;
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

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, AccessControlEnumerableUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  function isApprovedForAll(address account, address operator)
    public
    view
    override
    returns (bool)
  {
    return
      account == address(_market) ||
      super.isApprovedForAll({account: account, operator: operator});
  }

  function _setApprovalForAll(
    address owner,
    address operator,
    bool approved
  ) internal override whenNotPaused {
    if (operator == address(_market)) {
      revert InvalidCall();
    }
    super._setApprovalForAll({
      owner: owner,
      operator: operator,
      approved: approved
    });
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
    for (uint256 i = 0; i < ids.length; ++i) {
      if (amounts[i] == 0) {
        revert RemovalAmountZero({tokenId: ids[i]});
      }
      address market = address(_market);
      if (to == market) {
        _currentMarketBalance += amounts[i];
      }
      if (from == market) {
        _currentMarketBalance -= amounts[i];
      }
    }
    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  function _releaseFromSupplier(uint256 removalId, uint256 amount) internal {
    super._burn(RemovalIdLib.supplierAddress(removalId), removalId, amount);
  }

  function _createRemovalDataBatch(
    UnpackedRemovalIdV0[] calldata removals,
    uint256 projectId
  ) internal returns (uint256[] memory) {
    uint256[] memory removalIds = new uint256[](removals.length);
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
      for (uint256 i = 0; i < removals.length; ++i) {
        uint256 removalId = RemovalIdLib.createRemovalId({
          removal: removals[i]
        });
        _createRemovalData({removalId: removalId, projectId: projectId});
        removalIds[i] = removalId;
      }
    }
    return removalIds;
  }

  function _createRemovalData(uint256 removalId, uint256 projectId) internal {
    if (_removalIdToProjectId[removalId] != 0) {
      revert TokenIdExists({tokenId: removalId});
    }
    _removalIdToProjectId[removalId] = projectId;
  }

  // function _createScheduleData(
  //   UnpackedRemovalIdV0 memory removal,
  //   uint256 projectId,
  //   uint256 scheduleStartTime
  // ) internal {
  //   _projectIdToScheduleData[projectId] = ScheduleData({
  //     startTime: scheduleStartTime
  //     // methodology: removal.methodology,
  //     // methodologyVersion: removal.methodologyVersion
  //   });
  // }

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
    _updateOwnedTokenIds(from, to, ids);
    super._afterTokenTransfer(operator, from, to, ids, amounts, data);
  }

  function _updateOwnedTokenIds(
    address from,
    address to,
    uint256[] memory ids
  ) internal {
    uint256 numberOfTokenTransfers = ids.length;
    // Skip overflow check as for loop is indexed starting at zero.
    unchecked {
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
    }
  }
}
