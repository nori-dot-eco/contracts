// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "./Removal.sol";
import "./Certificate.sol";
import "./BridgedPolygonNORI.sol";
import "./RestrictedNORI.sol";
import {RemovalQueue, RemovalQueueByVintage} from "./RemovalQueue.sol";
import {RemovalUtils} from "./RemovalUtils.sol";

// import "hardhat/console.sol"; // todo

// todo emit events

// todo pausable
/**
 * @title Market
 * // todo documentation
 */
contract Market is
  ContextUpgradeable,
  AccessControlEnumerableUpgradeable,
  ERC1155HolderUpgradeable
{
  using RemovalUtils for uint256; // todo is this using RemovalUtils for ALL uint256s?
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
  uint256 private _noriFee;
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
    uint256 noriFee
  ) public initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __ERC1155Receiver_init_unchained();
    _removal = Removal(removalAddress);
    _bridgedPolygonNori = BridgedPolygonNORI(bridgedPolygonNoriAddress);
    _certificate = Certificate(certificateAddress);
    _restrictedNori = RestrictedNORI(restrictedNoriAddress);
    _noriFeeWallet = noriFeeWalletAddress;
    _noriFee = noriFee;
    _priorityRestrictedThreshold = 0;
    _currentSupplierAddress = address(0);
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(ALLOWLIST_ROLE, _msgSender());
  }

  function priorityRestrictedThreshold() external view returns (uint256) {
    return _priorityRestrictedThreshold;
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
    uint256 activeSupply = this.totalActiveSupply();
    return
      activeSupply < _priorityRestrictedThreshold
        ? 0
        : activeSupply - _priorityRestrictedThreshold; // todo compare this against trySub?
  }

  // todo we need to also implement onERC1155Received
  function onERC1155BatchReceived(
    address,
    address,
    uint256[] memory ids,
    uint256[] memory,
    bytes memory data
  ) public override returns (bytes4) {
    for (uint256 i = 0; i < ids.length; i++) {
      uint256 removalToAdd = ids[i];
      address supplierAddress = removalToAdd.supplierAddress();
      _activeSupply[supplierAddress].insertRemovalByVintage(removalToAdd);
      // If a new supplier has been added, or if the supplier had previously sold out
      if (
        _suppliersInRoundRobinOrder[supplierAddress].nextSupplierAddress ==
        address(0)
      ) {
        _addActiveSupplier(supplierAddress);
      }
    }
    uint256 projectId = abi.decode(data, (uint256));
    _restrictedNori.createSchedule(projectId); // todo move to removal minting logic if possible
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
    // todo we need to treat totalActiveSupply in a more nuanced way when reservation of removals is implemented
    // potentialy creating more endpoints to understand how many are reserved v.s. actually available v.s.
    // priority reserved etc.
    // _checkSupply();
    uint256 certificateAmount = _certificateAmountFromPurchaseTotal(amount);
    (
      uint256 numberOfRemovals,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    ) = _allocateSupplyRoundRobin(certificateAmount);
    // _bridgedPolygonNori.permit( // temporary to avoid needing to stub this in foundry
    //   _msgSender(),
    //   address(this),
    //   amount,
    //   deadline,
    //   v,
    //   r,
    //   s
    // );
    _fulfillOrder(
      certificateAmount,
      recipient,
      numberOfRemovals,
      ids,
      amounts,
      suppliers
    );
  }

  /**
   * Overloaded version of swap that additionally accepts a supplier address and will fulfill an order using
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
    uint256 certificateAmount = _certificateAmountFromPurchaseTotal(amount);
    (
      uint256 numberOfRemovals,
      uint256[] memory ids,
      uint256[] memory amounts
    ) = _allocateSupplySingleSupplier(certificateAmount, supplierToBuyFrom);
    address[] memory suppliers = new address[](numberOfRemovals);
    for (uint256 i = 0; i < numberOfRemovals; i++) {
      suppliers[i] = supplierToBuyFrom;
    }
    _bridgedPolygonNori.permit(
      _msgSender(),
      address(this),
      amount,
      deadline,
      v,
      r,
      s
    );
    _fulfillOrder(
      certificateAmount,
      recipient,
      numberOfRemovals,
      ids,
      amounts,
      suppliers
    );
  }

  function totalReservedSupply() external view returns (uint256) {
    uint256 totalReserved = 0;
    uint256 numberOfRemovalsReserved = _reservedSupply.length();
    for (uint256 i = 0; i < numberOfRemovalsReserved; ++i) {
      totalReserved += _reservedSupply.at(i);
    }
    return totalReserved;
  }

  function totalUnreservedSupply() external view returns (uint256) {
    return
      _removal.cumulativeBalanceOf(address(this)) - this.totalReservedSupply();
  }

  function totalActiveSupply() external view returns (uint256) {
    return _removal.cumulativeBalanceOf(address(this));
  }

  /**
   * Reverts if market is out of stock or if available stock is being reserved for priority buyers
   * and buyer is not priority.
   */
  function _checkSupply() private view {
    uint256 activeSupply = this.totalActiveSupply();
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
   * Calculates the quantity of carbon removals being purchased given the purchase total and the
   * percentage of that purchase total that is due to Nori as a transaction fee.
   */
  function _certificateAmountFromPurchaseTotal(uint256 purchaseTotal)
    private
    view
    returns (uint256)
  {
    return purchaseTotal; // todo re-enable (temp workaround for poc) // (purchaseTotal * 100) / (100 + _noriFee);
  }

  /**
   * Determines the removal ids, amounts, and suppliers to fill the given purchase quantity in
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
    for (uint256 i = 0; i < numberOfActiveRemovalsInMarket; i++) {
      uint256 removalId = _activeSupply[_currentSupplierAddress]
        .getNextRemovalForSale();
      uint256 removalAmount = _removal.balanceOf(address(this), removalId);
      // order complete, not fully using up this removal, don't increment currentSupplierAddress,
      // don't check about removing active supplier
      if (remainingAmountToFill < removalAmount) {
        ids[numberOfRemovalsForOrder] = removalId;
        amounts[numberOfRemovalsForOrder] = remainingAmountToFill;
        suppliers[numberOfRemovalsForOrder] = _currentSupplierAddress;
        remainingAmountToFill = 0;
        // we will use up this removal while completing the order, move on to next one
      } else {
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
          revert InsufficientSupply();
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

  /**
   * Completes order fulfillment for specified supply allocation. Pays suppliers, routes tokens to the
   * RestrictedNORI contract, pays Nori the order fee, updates accounting, and mints the certificate.
   *
   */
  function _fulfillOrder(
    uint256 certificateAmount,
    address recipient,
    uint256 numberOfRemovals,
    uint256[] memory ids,
    uint256[] memory amounts,
    address[] memory suppliers
  ) internal {
    uint256[] memory batchedIds = new uint256[](numberOfRemovals);
    uint256[] memory batchedAmounts = new uint256[](numberOfRemovals);
    for (uint256 i = 0; i < numberOfRemovals; i++) {
      batchedIds[i] = ids[i];
      batchedAmounts[i] = amounts[i];
    }
    uint256[] memory holdbackPercentages = _removal.batchGetHoldbackPercentages(
      batchedIds
    );
    address owner = address(this); // todo temporary workaround to avoid needing to use erc20 permit in foundry
    // TODO (Gas Optimization): Declare variables outside of loop
    for (uint256 i = 0; i < batchedIds.length; i++) {
      uint256 noriFee = (batchedAmounts[i] * _noriFee) / 100;
      uint256 restrictedSupplierFee = 0;
      uint256 unrestrictedSupplierFee = batchedAmounts[i];
      if (holdbackPercentages[i] > 0) {
        restrictedSupplierFee =
          (unrestrictedSupplierFee * holdbackPercentages[i]) /
          100;
        unrestrictedSupplierFee -= restrictedSupplierFee;
        // _restrictedNori.mint(restrictedSupplierFee, batchedIds[i]); // todo use single batch call, check effects pattern
        // _bridgedPolygonNori.transferFrom(
        //   owner,
        //   address(_restrictedNori),
        //   restrictedSupplierFee
        // );
      }
      // _bridgedPolygonNori.transferFrom(owner, _noriFeeWallet, noriFee); // todo temporary workaround to avoid needing to use erc20 permit in foundry // todo use multicall to batch transfer
      // _bridgedPolygonNori.transferFrom( // todo batch, check effects pattern
      //   owner,
      //   suppliers[i],
      //   unrestrictedSupplierFee
      // );
    }
    _removal.safeTransferFrom( // todo temporary non-batch POC
      owner,
      address(_certificate),
      batchedIds[0],
      certificateAmount,
      abi.encode(batchedIds[0]) // todo this is the token ID of the certificate which is the token ID that owns the underlying token id (perhaps just use a OZ counter and increment)
    );
  }

  /** The distinct number of removal token ids owned by the Market. */
  function numberOfActiveRemovals() external view returns (uint256) {
    return
      _removal.numberOfTokensOwnedByAddress(address(this)) -
      _reservedSupply.length(); // todo store reserved amount in removal data instead
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
    address supplierAddress = removalId.supplierAddress();
    _removeActiveRemoval(supplierAddress, removalId);
    if (!_reservedSupply.add(removalId)) {
      revert RemovalAlreadyReserved({removalId: removalId});
    }
  }

  function _removeActiveRemoval(address supplierAddress, uint256 removalId)
    internal
  {
    _activeSupply[supplierAddress].removeRemoval(removalId);
    if (_activeSupply[supplierAddress].isRemovalQueueEmpty()) {
      _removeActiveSupplier(supplierAddress);
    }
  }

  // todo consider making this a generalized `withdrawRemoval`?
  // todo RESERVER_ROLE? or require sender is Removal address
  // todo whenNotPaused
  function release(uint256 removalId, uint256 amount) external whenNotPaused {
    address supplierAddress = removalId.supplierAddress();
    uint256 removalBalance = _removal.balanceOf(address(this), removalId);
    if (amount == removalBalance) {
      _unreserveRemoval(removalId);
      _removeActiveRemoval(supplierAddress, removalId);
    }
  }

  function _unreserveRemoval(uint256 removalId) internal {
    if (!_reservedSupply.add(removalId)) {
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
    address supplierAddress = removalId.supplierAddress();
    _unreserveRemoval(removalId);
    if (_activeSupply[supplierAddress].isRemovalQueueEmpty()) {
      _addActiveSupplier(supplierAddress);
    }
    _activeSupply[supplierAddress].insertRemovalByVintage(removalId);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(AccessControlEnumerableUpgradeable, ERC1155ReceiverUpgradeable)
    returns (bool)
  {
    return
      AccessControlEnumerableUpgradeable.supportsInterface(interfaceId) || // todo why is this using || ?
      ERC1155ReceiverUpgradeable.supportsInterface(interfaceId);
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
