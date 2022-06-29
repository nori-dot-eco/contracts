// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC1820RegistryUpgradeable.sol";

import "./Removal.sol";
import "./Certificate.sol";
import "./BridgedPolygonNORI.sol";
import "./RestrictedNORI.sol";
import {RemovalQueue, RemovalQueueByVintage} from "./RemovalQueue.sol";
import {RemovalUtils} from "./RemovalUtils.sol";

// todo emit events

/**
 * @title FIFOMarket
 * // todo documentation
 */
contract FIFOMarket is
  Initializable,
  ContextUpgradeable,
  AccessControlEnumerableUpgradeable,
  ERC1155HolderUpgradeable,
  IERC777RecipientUpgradeable
{
  using RemovalUtils for uint256;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using RemovalQueue for RemovalQueueByVintage;

  /**
   * @notice Keeps track of order of suppliers by address using a circularly doubly linked list.
   */
  struct RoundRobinOrder {
    address previousSupplierAddress;
    address nextSupplierAddress;
  }

  IERC1820RegistryUpgradeable private _erc1820;
  Removal private _removal;
  Certificate private _certificate;
  BridgedPolygonNORI private _bridgedPolygonNori;
  RestrictedNORI private _restrictedNori;
  address private _noriFeeWallet;
  uint256 private _noriFee;
  uint256 public priorityRestrictedThreshold;
  uint256 public totalNumberActiveRemovals;
  uint256 public totalActiveSupply;
  uint256 public totalReservedSupply;
  uint256 public activeSupplierCount;
  address private _currentSupplierAddress;
  mapping(address => RoundRobinOrder) private _suppliersInRoundRobinOrder;
  mapping(address => RemovalQueueByVintage) private _activeSupply;
  EnumerableSetUpgradeable.UintSet private _reservedSupply;

  /**
   * @notice Role allowing the purchase of supply when inventory is below the priority restricted threshold.
   */
  bytes32 public constant ALLOWLIST_ROLE = keccak256("ALLOWLIST_ROLE");

  /**
   * @notice Emitted on setting of priorityRestrictedThreshold.
   */
  event PriorityRestrictedThresholdSet(uint256 threshold);

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
    _erc1820 = IERC1820RegistryUpgradeable(
      0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24
    ); // todo
    _erc1820.setInterfaceImplementer(
      address(this),
      keccak256("ERC777TokensRecipient"),
      address(this)
    );
    priorityRestrictedThreshold = 0;
    totalActiveSupply = 0;
    totalReservedSupply = 0;
    totalNumberActiveRemovals = 0;
    _currentSupplierAddress = address(0);
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(ALLOWLIST_ROLE, _msgSender());
  }

  function setPriorityRestrictedThreshold(uint256 threshold)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    priorityRestrictedThreshold = threshold;
    emit PriorityRestrictedThresholdSet(threshold);
  }

  /**
   * @notice The amount of supply as computed by iterating through all removals.
   */
  function numberOfActiveNrtsInMarketComputed()
    external
    view
    returns (uint256)
  {
    uint256 total = 0;
    address supplierAddress = _currentSupplierAddress;
    for (uint256 i = 0; i < activeSupplierCount; i++) {
      total += _activeSupply[supplierAddress].getTotalBalanceFromRemovalQueue(
        _removal
      );
      supplierAddress = _suppliersInRoundRobinOrder[supplierAddress]
        .nextSupplierAddress;
    }
    return total;
  }

  /**
   * @notice The amount of supply available for anyone to buy.
   */
  function totalUnrestrictedSupply() public view returns (uint256) {
    if (totalActiveSupply < priorityRestrictedThreshold) {
      return 0;
    }
    return totalActiveSupply - priorityRestrictedThreshold;
  }

  // TODO: this function no longer makes sense to exist based on how the market now works (less deterministic)
  // function nextRemovalForSale(bool includePriorityRestrictedSupply)
  //   public
  //   view
  //   returns (uint256)
  // {
  //   uint256 nextRemovalId = 0;
  //   if (totalActiveSupply > 0) {
  //     address activeSupplierAddress = _suppliersInRoundRobinOrderOrdered[
  //       _currentSupplierIndex
  //     ];
  //     nextRemovalId = _activeSupply[activeSupplierAddress].at(0);
  //   }
  //   if (
  //     !includePriorityRestrictedSupply &&
  //     totalActiveSupply <= priorityRestrictedThreshold
  //   ) {
  //     nextRemovalId = 0;
  //   }
  //   return nextRemovalId;
  // }

  function onERC1155BatchReceived(
    address,
    address,
    uint256[] memory ids,
    uint256[] memory,
    bytes memory data
  ) public override returns (bytes4) {
    uint256[] memory batchedAmounts = _removal.balanceOfIds(address(this), ids);
    // TODO (Gas Optimization): Declare variables outside of loop
    uint256 localActiveSupplyIncrease = 0;
    uint256 localTotalNumberActiveRemovalsIncrease = 0;
    for (uint256 i = 0; i < ids.length; i++) {
      uint256 removalToAdd = ids[i];
      address supplierAddress = removalToAdd.supplierAddress();
      uint256 removalAmount = batchedAmounts[i];
      require(
        _activeSupply[supplierAddress].insertRemovalByVintage(removalToAdd),
        "Market: Unable to add removal by vintage" // TODO (Gas Optimization): Use custom error
      );
      // If a new supplier has been added, or if the supplier had previously sold out
      if (
        _suppliersInRoundRobinOrder[supplierAddress].nextSupplierAddress ==
        address(0)
      ) {
        _addActiveSupplier(supplierAddress);
      }
      localActiveSupplyIncrease += removalAmount;
      localTotalNumberActiveRemovalsIncrease += 1;
    }
    totalActiveSupply += localActiveSupplyIncrease;
    totalNumberActiveRemovals += localTotalNumberActiveRemovalsIncrease;
    uint256 projectId = abi.decode(data, (uint256));
    _restrictedNori.createSchedule(projectId);
    return this.onERC1155BatchReceived.selector;
  }

  // todo optimize gas (perhaps consider setting the last sold id instead of looping -- not sure if it's possible to reduce array size yet or not)
  /**
   * @dev Called automatically by the ERC777 (nori) contract when a batch of tokens are transferred to the contract.
   */
  function tokensReceived(
    address,
    address from,
    address,
    uint256 amount,
    bytes calldata userData,
    bytes calldata
  ) external override {
    // todo we need to treat totalActiveSupply in a more nuanced way when reservation of removals is implemented
    // potentialy creating more endpoints to understand how many are reserved v.s. actually available v.s. priority reserved etc.
    if (totalActiveSupply == 0) {
      revert("Market: Out of stock");
    }
    if (totalActiveSupply <= priorityRestrictedThreshold) {
      require(
        hasRole(ALLOWLIST_ROLE, from),
        "Low supply and buyer not on allowlist" // TODO (Gas Optimization): Use custom error
      );
    }
    uint256 certificateAmount = (amount * 100) / (100 + _noriFee);
    uint256 remainingAmountToFill = certificateAmount;

    address recipient = abi.decode(userData, (address)); // todo handle the case where someone invokes this function without operatorData
    require(recipient == address(recipient), "Market: Invalid address"); // TODO (Gas Optimization): Use custom error
    require(recipient != address(0), "Market: Cannot mint to the 0 address"); // TODO (Gas Optimization): Use custom error
    // todo verify this can only be invoked by the nori contract
    require(
      msg.sender == address(_bridgedPolygonNori),
      "Market: This contract can only receive BridgedPolygonNORI"
    ); // TODO (Gas Optimization): Use custom error

    uint256[] memory ids = new uint256[](totalNumberActiveRemovals);
    uint256[] memory amounts = new uint256[](totalNumberActiveRemovals);
    address[] memory suppliers = new address[](totalNumberActiveRemovals);
    uint256 numberOfRemovals = 0;
    // TODO (Gas Optimization): Declare variables outside of loop
    for (uint256 i = 0; i < totalNumberActiveRemovals; i++) {
      uint256 removalId = _activeSupply[_currentSupplierAddress]
        .getNextRemovalForSale();
      uint256 removalAmount = _removal.balanceOf(address(this), removalId);
      // order complete, not fully using up this removal, don't increment currentSupplierAddress, don't check about removing active supplier
      if (remainingAmountToFill < removalAmount) {
        ids[numberOfRemovals] = removalId;
        amounts[numberOfRemovals] = remainingAmountToFill;
        suppliers[numberOfRemovals] = _currentSupplierAddress;
        remainingAmountToFill = 0;
        // we will use up this removal while completing the order, move on to next one
      } else {
        if (
          i == totalNumberActiveRemovals - 1 &&
          remainingAmountToFill > removalAmount
        ) {
          revert("Market: Not enough supply");
        }
        ids[numberOfRemovals] = removalId;
        amounts[numberOfRemovals] = removalAmount; // this removal is getting used up
        suppliers[numberOfRemovals] = _currentSupplierAddress;
        remainingAmountToFill -= removalAmount;

        require(
          _activeSupply[_currentSupplierAddress].removeRemoval(removalId),
          "Market: Failed to remove removal from supply"
        ); // TODO (Gas Optimization): Use custom error
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
      numberOfRemovals++;
      if (remainingAmountToFill == 0) {
        break;
      }
    }

    uint256[] memory batchedIds = new uint256[](numberOfRemovals);
    uint256[] memory batchedAmounts = new uint256[](numberOfRemovals);

    for (uint256 i = 0; i < numberOfRemovals; i++) {
      batchedIds[i] = ids[i];
      batchedAmounts[i] = amounts[i];
    }
    bytes memory encodedCertificateAmount = abi.encode(certificateAmount);
    _certificate.mintBatch(
      recipient,
      batchedIds,
      batchedAmounts,
      encodedCertificateAmount
    );
    uint256[] memory batchedBalances = _removal.balanceOfIds(
      address(this),
      batchedIds
    );
    // TODO (Gas Optimization): Declare variables outside of loop
    for (uint256 i = 0; i < batchedIds.length; i++) {
      if (batchedAmounts[i] == batchedBalances[i]) {
        totalNumberActiveRemovals -= 1; // removal used up
      }
      totalActiveSupply -= batchedAmounts[i];
      uint256 noriFee = (batchedAmounts[i] / 100) * _noriFee;
      uint256 supplierFee = batchedAmounts[i];
      _bridgedPolygonNori.transfer(_noriFeeWallet, noriFee);
      _bridgedPolygonNori.transfer(suppliers[i], supplierFee);
    }
    _removal.burnBatch(address(this), batchedIds, batchedAmounts);
  }

  // TODO batch version of this?
  /**
   * @notice Removes removal from active supply and inserts it into the reserved supply, where it cannot be used to
   * fill orders.
   *
   * @dev If the removal is the last for the supplier, removes the supplier from the active supplier queue.
   *
   */
  function reserveRemoval(uint256 removalId) external returns (bool) {
    address supplierAddress = removalId.supplierAddress();
    require(
      _activeSupply[supplierAddress].removeRemoval(removalId),
      "Market: removal not in active supply"
    ); // TODO (Gas Optimization): Use custom error
    uint256 removalBalance = _removal.balanceOf(address(this), removalId);
    totalActiveSupply -= removalBalance;
    totalReservedSupply += removalBalance;
    totalNumberActiveRemovals -= 1;
    // If this is the last removal for the supplier, remove them from active suppliers
    if (_activeSupply[supplierAddress].isRemovalQueueEmpty()) {
      _removeActiveSupplier(supplierAddress);
    }
    // todo any checks on whether this id was already in there?
    require(_reservedSupply.add(removalId), "Market: Removal already reserved"); // TODO (Gas Optimization): Use custom error
    return true; // returns true if the value was added to the set, that is, if it was not already present
  }

  // TODO batch version of this?
  /**
   * @notice Adds the removal back to active supply to be sold.
   *
   * @dev Removes removal from reserved supply and re-inserts it into the active supply, where it can be used to
   * fill orders again. If the supplier's other removals have all been sold, adds the supplier back to the
   * list of active suppliers
   */
  function unreserveRemoval(uint256 removalId) external returns (bool) {
    address supplierAddress = removalId.supplierAddress();

    require(
      _reservedSupply.remove(removalId),
      "Market: removal not in reserved supply"
    ); // TODO (Gas Optimization): Use custom error
    totalNumberActiveRemovals += 1;
    uint256 removalBalance = _removal.balanceOf(address(this), removalId);
    totalActiveSupply += removalBalance;
    totalReservedSupply -= removalBalance;
    // If the supplier has previously been removed from the active suppliers, add them back
    if (_activeSupply[supplierAddress].isRemovalQueueEmpty()) {
      _addActiveSupplier(supplierAddress);
    }
    require(
      _activeSupply[supplierAddress].insertRemovalByVintage(removalId),
      "Market: Unable to unreserve removal" // TODO (Gas Optimization): Use custom error
    ); // returns true if the value was added to the set, that is, if it was not already present
    return true;
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(AccessControlEnumerableUpgradeable, ERC1155ReceiverUpgradeable)
    returns (bool)
  {
    return
      AccessControlEnumerableUpgradeable.supportsInterface(interfaceId) ||
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
    activeSupplierCount += 1;
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
    // Decrement the total count of active suppliers.
    activeSupplierCount -= 1;
  }
}
