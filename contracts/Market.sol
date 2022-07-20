// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./Removal.sol";
import "./Certificate.sol";
import "./BridgedPolygonNORI.sol";
import "./RestrictedNORI.sol";
import {RemovalQueue, RemovalQueueByVintage} from "./RemovalQueue.sol";
import {RemovalUtils} from "./RemovalUtils.sol";

import "forge-std/console2.sol"; // todo

// todo emit events

// todo MARKET_ADMIN_ROLE (reserving, setting thresholds etc so they can be done from admin ui without super admin)

// todo pausable
/**
 * @title Market
 * // todo documentation
 */
contract Market is
  ContextUpgradeable,
  AccessControlEnumerableUpgradeable,
  PausableUpgradeable
{
  // todo pause + unpause base contract (only internal funcs are inherited in pausableupgradeable?)
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using RemovalQueue for RemovalQueueByVintage;

  error InsufficientSupply();
  error OutOfStock();
  error LowSupplyAllowlistRequired();
  error RemovalAlreadyReserved(uint256 removalId);
  error RemovalNotInActiveSupply(uint256 removalId);
  error RemovalNotInReservedSupply(uint256 removalId);

  /**
   * @notice Keeps track of order of suppliers by address using a circularly doubly linked list.
   */
  struct RoundRobinOrder {
    address previousSupplierAddress;
    address nextSupplierAddress;
  }

  Removal private _removal;
  Certificate private _certificate;
  BridgedPolygonNORI private _bridgedPolygonNori;
  RestrictedNORI private _restrictedNori;
  address private _noriFeeWallet;
  uint256 private _noriFeePercentage;
  uint256 private _priorityRestrictedThreshold;
  address private _currentSupplierAddress;
  mapping(address => RoundRobinOrder) private _suppliersInRoundRobinOrder;
  mapping(address => RemovalQueueByVintage) private _activeSupply;
  EnumerableSetUpgradeable.UintSet private _reservedSupply;

  /**
   * @notice Role allowing the purchase of supply when inventory is below the priority restricted threshold.
   */
  bytes32 public constant ALLOWLIST_ROLE = keccak256("ALLOWLIST_ROLE");

  /**
   * @notice Emitted on setting of _priorityRestrictedThreshold.
   */
  event PriorityRestrictedThresholdSet(uint256 threshold);

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  function initialize(
    address removalAddress,
    address bridgedPolygonNoriAddress,
    address certificateAddress,
    address restrictedNoriAddress,
    address noriFeeWalletAddress,
    uint256 noriFeePercentage
  ) public initializer {
    // todo verify all initializers are called
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    _removal = Removal(removalAddress);
    _bridgedPolygonNori = BridgedPolygonNORI(bridgedPolygonNoriAddress);
    _certificate = Certificate(certificateAddress);
    _restrictedNori = RestrictedNORI(restrictedNoriAddress);
    _noriFeePercentage = noriFeePercentage;
    _noriFeeWallet = noriFeeWalletAddress;
    _priorityRestrictedThreshold = 0;
    _currentSupplierAddress = address(0);
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(ALLOWLIST_ROLE, _msgSender());
  }

  function priorityRestrictedThreshold() external view returns (uint256) {
    return _priorityRestrictedThreshold;
  }

  function getNoriFeePercentage() external view returns (uint256) {
    // todo getX vs X naming convention + consistency
    return _noriFeePercentage;
  }

  function getNoriFee(uint256 amount) external view returns (uint256) {
    return (amount * _noriFeePercentage) / 100; // todo muldiv from OZ?;
  }

  function getCheckoutTotal(uint256 amount) external view returns (uint256) {
    return amount + this.getNoriFee(amount);
  }

  function getNoriFeeWallet() external view returns (address) {
    return _noriFeeWallet;
  }

  /**
   * @dev Calculates the quantity of carbon removals being purchased given the purchase total and the
   * percentage of that purchase total that is due to Nori as a transaction fee.
   */
  function certificateAmountFromPurchaseTotal(uint256 purchaseTotal)
    external
    view
    returns (uint256)
  {
    return (purchaseTotal * 100) / (100 + _noriFeePercentage);
  }

  function setPriorityRestrictedThreshold(uint256 threshold)
    external
    whenNotPaused
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _priorityRestrictedThreshold = threshold;
    emit PriorityRestrictedThresholdSet(threshold);
  }

  /**
   * @notice The amount of supply available for anyone to buy.
   */
  function totalUnrestrictedSupply() external view returns (uint256) {
    uint256 activeSupply = this.cumulativeActiveSupply();
    return
      activeSupply < _priorityRestrictedThreshold
        ? 0
        : activeSupply - _priorityRestrictedThreshold; // todo compare this against trySub?
  }

  function onERC1155BatchReceived(
    address,
    address,
    uint256[] memory ids,
    uint256[] memory,
    bytes memory
  ) external returns (bytes4) {
    // todo revert if not removal.sol
    // todo whennotpaused
    for (uint256 i = 0; i < ids.length; i++) {
      uint256 removalToAdd = ids[i];
      address supplierAddress = RemovalUtils.supplierAddress(removalToAdd);
      _activeSupply[supplierAddress].insertRemovalByVintage(removalToAdd);
      if (
        _suppliersInRoundRobinOrder[supplierAddress].nextSupplierAddress ==
        address(0) // If a new supplier has been added, or if the supplier had previously sold out
      ) {
        _addActiveSupplier(supplierAddress);
      }
    }
    _restrictedNori.createSchedule(
      _removal.getProjectIdForRemoval(ids[0]) // todo move to removal minting logic if possible
      // todo revert is ids don't all belong to the same project?
    );
    return this.onERC1155BatchReceived.selector;
  }

  /**
   * @dev // todo
   */
  function swap(
    address recipient,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external whenNotPaused {
    // todo multicall enabled swap?
    // todo we need to treat cumulativeActiveSupply in a more nuanced way when reservation of removals is implemented
    // potentialy creating more endpoints to understand how many are reserved v.s. actually available v.s.
    // priority reserved etc.
    _checkSupply();
    uint256 certificateAmount = this.certificateAmountFromPurchaseTotal(amount);
    (
      uint256 numberOfRemovals,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    ) = _allocateSupplyRoundRobin(certificateAmount);
    _bridgedPolygonNori.permit(
      _msgSender(),
      address(this),
      amount,
      deadline,
      v,
      r,
      s
    ); // todo check-effects
    this.fulfillOrder(
      _msgSender(),
      recipient,
      numberOfRemovals,
      ids,
      amounts,
      suppliers
    );
  }

  /**
   * @notice Overloaded version of swap that additionally accepts a supplier address and will fulfill an order using
   * only supply from this supplier.
   * @dev // todo
   */
  function swapFromSpecificSupplier(
    address recipient,
    uint256 amount,
    address supplierToBuyFrom,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external whenNotPaused {
    _checkSupply();
    uint256 certificateAmount = this.certificateAmountFromPurchaseTotal(amount);
    (
      uint256 numberOfRemovals,
      uint256[] memory ids,
      uint256[] memory amounts
    ) = _allocateSupplySingleSupplier(certificateAmount, supplierToBuyFrom);
    address[] memory suppliers = new address[](numberOfRemovals);
    for (uint256 i = 0; i < numberOfRemovals; i++) {
      suppliers[i] = supplierToBuyFrom;
    }
    _bridgedPolygonNori.permit( // todo de-dupe if possible
      _msgSender(),
      address(this),
      amount,
      deadline,
      v,
      r,
      s
    );
    this.fulfillOrder(
      _msgSender(), // todo not sure why this was needed when making fulfillorder external
      recipient,
      numberOfRemovals,
      ids,
      amounts,
      suppliers
    );
  }

  // todo is this redundant? should we just rely on _removal.cumulativeBalanceOf and not have a helper getter here?
  function cumulativeActiveSupply() external view returns (uint256) {
    return _removal.cumulativeBalanceOf(address(this));
  }

  // function cumulativeUnreservedSupply() external view returns (uint256) {
  // todo this calls cummulativeBalanceOf multiple times, might be possible to call once + slice the array at an index
  //   return this.cumulativeActiveSupply() - this.cumulativeReservedSupply();
  // }

  // // todo is this redundant? should we just rely on _removal.cumulativeBalanceOfOwnerSubset?
  // function cumulativeReservedSupply() external view returns (uint256) {
  //   return
  //     _removal.cumulativeBalanceOfOwnerSubset(
  //       address(this),
  //       _reservedSupply.values() // todo expose _reservedSupply.values()
  //     );
  // }

  // todo is this redundant? should we just rely on _removal.numberOfTokensOwnedByAddress?
  function numberOfActiveRemovals() external view returns (uint256) {
    return _removal.numberOfTokensOwnedByAddress(address(this));
  }

  /**
   * @dev The distinct number of removal token ids owned by the Market. // todo
   */
  function numberOfUnreservedRemovals() external view returns (uint256) {
    // todo getters for number of active/reserved/unreserved suppliers?
    // todo consider global rename of active to name that better describes "available + reserved
    // todo consistency in naming of cummulative vs total (perhaps use count vs total)
    // todo consistency in naming of supply vs removals
    // todo consider withrawing when reserving instead of adding it to the _reservedSupply set
    return this.numberOfActiveRemovals() - this.numberOfReservedRemovals(); // todo gas vs _reservedSupply.length() ?
  }

  /**
   * @dev The distinct number of removal token ids owned by the Market. // todo
   */
  function numberOfReservedRemovals() external view returns (uint256) {
    return _reservedSupply.length();
  }

  /**
   * @dev Reverts if market is out of stock or if available stock is being reserved for priority buyers
   * and buyer is not priority.
   */
  function _checkSupply() private view {
    uint256 activeSupply = this.cumulativeActiveSupply();
    if (activeSupply == 0) {
      revert OutOfStock();
    }
    if (activeSupply <= _priorityRestrictedThreshold) {
      if (!hasRole(ALLOWLIST_ROLE, _msgSender())) {
        revert LowSupplyAllowlistRequired();
      }
    }
  }

  /**
   * @dev Determines the removal ids, amounts, and suppliers to fill the given purchase quantity in
   * a round-robin order.
   */
  function _allocateSupplyRoundRobin(uint256 certificateAmount)
    private
    returns (
      uint256,
      uint256[] memory,
      uint256[] memory,
      address[] memory
    )
  {
    uint256 remainingAmountToFill = certificateAmount;
    uint256 numberOfActiveRemovalsInMarket = this.numberOfActiveRemovals();
    uint256[] memory ids = new uint256[](numberOfActiveRemovalsInMarket);
    uint256[] memory amounts = new uint256[](numberOfActiveRemovalsInMarket);
    address[] memory suppliers = new address[](numberOfActiveRemovalsInMarket);
    uint256 numberOfRemovalsForOrder = 0;
    // TODO (Gas Optimization): Declare variables outside of loop
    for (
      uint256 i = 0;
      i < numberOfActiveRemovalsInMarket;
      i++ // todo ++i consistency
    ) {
      uint256 removalId = _activeSupply[_currentSupplierAddress]
        .getNextRemovalForSale();
      uint256 removalAmount = _removal.balanceOf(address(this), removalId); // todo batch
      // order complete, not fully using up this removal, don't increment currentSupplierAddress,
      // don't check about removing active supplier
      if (remainingAmountToFill < removalAmount) {
        ids[numberOfRemovalsForOrder] = removalId;
        amounts[numberOfRemovalsForOrder] = remainingAmountToFill;
        suppliers[numberOfRemovalsForOrder] = _currentSupplierAddress;
        remainingAmountToFill = 0;
      } else {
        // we will use up this removal while completing the order, move on to next one
        if (
          i == numberOfActiveRemovalsInMarket - 1 &&
          remainingAmountToFill > removalAmount
        ) {
          revert InsufficientSupply();
        }
        ids[numberOfRemovalsForOrder] = removalId;
        amounts[numberOfRemovalsForOrder] = removalAmount; // this removal is getting used up
        suppliers[numberOfRemovalsForOrder] = _currentSupplierAddress;
        remainingAmountToFill -= removalAmount;
        _activeSupply[_currentSupplierAddress].removeRemoval(removalId);
        // If the supplier is out of supply, remove them from the active suppliers
        if (_activeSupply[_currentSupplierAddress].isRemovalQueueEmpty()) {
          _removeActiveSupplier(_currentSupplierAddress);
          // else if the supplier is the only supplier remaining with supply, don't bother incrementing.
        } else if (
          _suppliersInRoundRobinOrder[_currentSupplierAddress]
            .nextSupplierAddress != _currentSupplierAddress
        ) {
          _incrementCurrentSupplierAddress();
        }
      }
      numberOfRemovalsForOrder++;
      if (remainingAmountToFill == 0) {
        break;
      }
    }
    return (numberOfRemovalsForOrder, ids, amounts, suppliers);
  }

  /**
   * Determines the removal ids and amounts to fill the given purchase quantity, sourcing only
   * from a single supplier.
   */
  function _allocateSupplySingleSupplier(
    uint256 certificateAmount,
    address supplier
  )
    private
    returns (
      uint256,
      uint256[] memory,
      uint256[] memory
    )
  {
    RemovalQueueByVintage storage supplierRemovalQueue = _activeSupply[
      supplier
    ];
    uint256 totalNumberOfRemovalsForSupplier = 0;
    uint256 vintage = supplierRemovalQueue.earliestYear;
    uint256 latestYear = supplierRemovalQueue.latestYear;
    while (vintage <= latestYear) {
      totalNumberOfRemovalsForSupplier += supplierRemovalQueue
        .queueByVintage[vintage]
        .length();
      unchecked {
        vintage++;
      }
    }
    if (totalNumberOfRemovalsForSupplier == 0) {
      revert InsufficientSupply();
    }
    uint256 remainingAmountToFill = certificateAmount;
    uint256[] memory ids = new uint256[](totalNumberOfRemovalsForSupplier);
    uint256[] memory amounts = new uint256[](totalNumberOfRemovalsForSupplier);
    uint256 numberOfRemovals = 0;
    // TODO (Gas Optimization): Declare variables outside of loop
    for (uint256 i = 0; i < totalNumberOfRemovalsForSupplier; i++) {
      uint256 removalId = supplierRemovalQueue.getNextRemovalForSale();
      uint256 removalAmount = _removal.balanceOf(address(this), removalId);
      // order complete, not fully using up this removal
      if (remainingAmountToFill < removalAmount) {
        ids[numberOfRemovals] = removalId;
        amounts[numberOfRemovals] = remainingAmountToFill;
        remainingAmountToFill = 0;
        // we will use up this removal while completing the order, move on to next one
      } else {
        if (
          numberOfRemovals == totalNumberOfRemovalsForSupplier - 1 &&
          remainingAmountToFill > removalAmount
        ) {
          revert InsufficientSupply(); // todo de-duplicate
        }
        ids[numberOfRemovals] = removalId;
        amounts[numberOfRemovals] = removalAmount; // this removal is getting used up
        remainingAmountToFill -= removalAmount;
        supplierRemovalQueue.removeRemoval(removalId);
        // If the supplier is out of supply, remove them from the active suppliers
        if (supplierRemovalQueue.isRemovalQueueEmpty()) {
          _removeActiveSupplier(supplier);
        }
      }
      numberOfRemovals++;
      if (remainingAmountToFill == 0) {
        break;
      }
    }
    return (numberOfRemovals, ids, amounts);
  }

  function setNoriFeePercentage(uint256 noriFeePercentage)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
    whenNotPaused
  {
    _noriFeePercentage = noriFeePercentage;
  }

  function setNoriFeeWallet(address noriFeeWalletAddress)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
    whenNotPaused
  {
    _noriFeeWallet = noriFeeWalletAddress;
  }

  /**
   * @notice Completes order fulfillment for specified supply allocation. Pays suppliers, routes tokens to the
   * RestrictedNORI contract, pays Nori the order fee, updates accounting, and mints the certificate.
   * todo need to permission this now that it's external (or figure out how to use calldata with internal funcs)
   */
  function fulfillOrder(
    address operator,
    address recipient,
    uint256 numberOfRemovals,
    uint256[] calldata ids,
    uint256[] calldata amounts,
    address[] memory suppliers
  ) external {
    uint256[] memory batchedIds = ids[:numberOfRemovals]; // todo might need to revert this (not sure if slice includes correct values)
    uint256[] memory batchedAmounts = amounts[:numberOfRemovals]; // todo might need to revert this (not sure if slice includes correct values)
    uint256[] memory holdbackPercentages = _removal.batchGetHoldbackPercentages(
      batchedIds
    );
    // TODO (Gas Optimization): Declare variables outside of loop
    for (uint256 i = 0; i < numberOfRemovals; i++) {
      uint256 restrictedSupplierFee = 0;
      uint256 unrestrictedSupplierFee = batchedAmounts[i];
      if (holdbackPercentages[i] > 0) {
        restrictedSupplierFee =
          (unrestrictedSupplierFee * holdbackPercentages[i]) /
          100;
        unrestrictedSupplierFee -= restrictedSupplierFee;
        _restrictedNori.mint(restrictedSupplierFee, batchedIds[i]); // todo use single batch call, check effects
        _bridgedPolygonNori.transferFrom(
          operator,
          address(_restrictedNori),
          restrictedSupplierFee
        );
      }
      _bridgedPolygonNori.transferFrom(
        operator,
        _noriFeeWallet,
        this.getNoriFee(batchedAmounts[i])
      ); // todo use multicall to batch transfer
      _bridgedPolygonNori.transferFrom( // todo batch, check effects pattern
        operator,
        suppliers[i],
        unrestrictedSupplierFee
      );
    }
    bytes memory data = abi.encode(recipient);
    _removal.safeBatchTransferFrom(
      address(this),
      address(_certificate),
      batchedIds,
      batchedAmounts,
      data
    );
  }

  // todo?
  //  function numberOfActiveSuppliers() external view returns (uint256) {
  // }

  // TODO batch version of this?
  /**
   * @notice Removes removal from active supply and inserts it into the reserved supply, where it cannot be used to
   * fill orders.
   *
   * @dev If the removal is the last for the supplier, removes the supplier from the active supplier queue.
   *
   */
  function reserveRemoval(uint256 removalId) external whenNotPaused {
    address supplierAddress = RemovalUtils.supplierAddress(removalId);
    _removeActiveRemoval(supplierAddress, removalId);
    if (!_reservedSupply.add(removalId)) {
      revert RemovalAlreadyReserved({removalId: removalId});
    }
  }

  function _removeActiveRemoval(
    address supplierAddress,
    uint256 removalId // todo flip param order
  ) internal {
    console2.log("Remove active removal====");
    _activeSupply[supplierAddress].removeRemoval(removalId);
    if (_activeSupply[supplierAddress].isRemovalQueueEmpty()) {
      _removeActiveSupplier(supplierAddress); // todo can this be combined inside .removeRemoval?
    }
  }

  /**
   * @dev
   *
   * ##### Requirements:
   *
   * - The contract must not be paused. This is enforce by `Removal._beforeTokenTransfer`
   */
  function release(uint256 removalId, uint256 amount) external whenNotPaused {
    // todo consider making this a generalized `withdrawRemoval`?
    // todo RESERVER_ROLE? or require sender is Removal address
    address supplierAddress = RemovalUtils.supplierAddress(removalId);
    uint256 removalBalance = _removal.balanceOf(address(this), removalId);
    if (amount == removalBalance) {
      _unreserveRemoval(removalId);
      _removeActiveRemoval(supplierAddress, removalId);
    }
  }

  /**
   * @notice Removes a removal from the reserved supply
   * // TODO onlyRole(MARKET_ADMIN_ROLE)
   */
  function _unreserveRemoval(uint256 removalId) internal {
    if (!_reservedSupply.remove(removalId)) {
      revert RemovalNotInReservedSupply({removalId: removalId});
    }
  }

  // TODO batch version of this?
  /**
   * @notice Adds the removal back to active supply to be sold.
   *
   * @dev Removes removal from reserved supply and re-inserts it into the active supply, where it can be used to
   * fill orders again. If the supplier's other removals have all been sold, adds the supplier back to the
   * list of active suppliers
   */
  function unreserveRemoval(uint256 removalId) external whenNotPaused {
    // todo RESERVER_ROLE?
    address supplierAddress = RemovalUtils.supplierAddress(removalId);
    _unreserveRemoval(removalId);
    if (_activeSupply[supplierAddress].isRemovalQueueEmpty()) {
      _addActiveSupplier(supplierAddress);
    }
    _activeSupply[supplierAddress].insertRemovalByVintage(removalId);
  }

  /**
   * @dev See [IERC165.supportsInterface](
   * https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.
   */
  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @notice Increments the address of the current supplier.
   *
   * @dev Called the current supplier's removal is sold, or their last removal is reserved.
   * Updates _currentSupplierAddress to the next of whatever is the current supplier.
   */
  function _incrementCurrentSupplierAddress() private {
    // Update the current supplier to be the next of the current supplier
    _currentSupplierAddress = _suppliersInRoundRobinOrder[
      _currentSupplierAddress
    ].nextSupplierAddress;
  }

  /**
   * @notice Adds a supplier to the active supplier queue
   *
   * @dev Called when a new supplier is added to the marketplace, or after they have sold out and a reserved removal is
   * unreserved. If the first supplier, initializes a cicularly doubly-linked list, where initially the first supplier
   * points to itself as next and previous. When a new supplier is added, at the position of the current supplier,
   * update the previous pointer of the current supplier to point to the new supplier, and update the next pointer of
   * the previous supplier to the new supplier.
   */
  function _addActiveSupplier(address supplierAddress) private {
    // If this is the first supplier to be added, update the intialized addresses.
    if (_currentSupplierAddress == address(0)) {
      _currentSupplierAddress = supplierAddress;
      _suppliersInRoundRobinOrder[supplierAddress] = RoundRobinOrder({
        previousSupplierAddress: supplierAddress,
        nextSupplierAddress: supplierAddress
      });
    } else {
      // Add the new supplier to the round robin order,
      // with the current supplier as next and the current supplier's previous supplier as previous
      _suppliersInRoundRobinOrder[supplierAddress] = RoundRobinOrder({
        previousSupplierAddress: _suppliersInRoundRobinOrder[
          _currentSupplierAddress
        ].previousSupplierAddress,
        nextSupplierAddress: _currentSupplierAddress
      });
      // Update the previous supplier to point to the new supplier as next
      _suppliersInRoundRobinOrder[
        _suppliersInRoundRobinOrder[_currentSupplierAddress]
          .previousSupplierAddress
      ].nextSupplierAddress = supplierAddress;
      // Update the current supplier to point to the new supplier as previous
      _suppliersInRoundRobinOrder[_currentSupplierAddress]
        .previousSupplierAddress = supplierAddress;
    }
  }

  /**
   * @notice Removes a supplier to the active supplier queue
   *
   * @dev Called when a supplier's last removal is used for an order or reserved. If the last supplier,
   * resets the pointer for \_currentSupplierAddress. Otherwise, from the position of the supplier to be
   * removed, update the previous supplier to point to the next of the removed supplier, and the next of
   * the removed supplier to point to the previous of the remove supplier. Then, set the next and previous
   * pointers of the removed supplier to the 0x address.
   */
  function _removeActiveSupplier(address addressToRemove) private {
    // If this is the last supplier, clear all current tracked addresses.
    if (
      addressToRemove ==
      _suppliersInRoundRobinOrder[addressToRemove].nextSupplierAddress
    ) {
      _currentSupplierAddress = address(0);
    } else {
      // Set the next of the previous supplier to point to the removed supplier's next.
      _suppliersInRoundRobinOrder[
        _suppliersInRoundRobinOrder[addressToRemove].previousSupplierAddress
      ].nextSupplierAddress = _suppliersInRoundRobinOrder[addressToRemove]
        .nextSupplierAddress;
      // Set the previous of the next supplier to point to the removed supplier's previous.
      _suppliersInRoundRobinOrder[
        _suppliersInRoundRobinOrder[addressToRemove].nextSupplierAddress
      ].previousSupplierAddress = _suppliersInRoundRobinOrder[addressToRemove]
        .previousSupplierAddress;
      // If the supplier is the current supplier, update that address to the next supplier.
      if (addressToRemove == _currentSupplierAddress) {
        _incrementCurrentSupplierAddress();
      }
    }
    // Remove RoundRobinOrder Data from supplier
    _suppliersInRoundRobinOrder[addressToRemove] = RoundRobinOrder({
      nextSupplierAddress: address(0),
      previousSupplierAddress: address(0)
    });
  }
}