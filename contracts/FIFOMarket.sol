// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC1820RegistryUpgradeable.sol";
import "./Removal.sol";
import "./Certificate.sol";
import "./BridgedPolygonNORI.sol";
import {RemovalUtils} from "./RemovalUtils.sol";

import "hardhat/console.sol"; // todo

// todo emit events

/**
 * @title FIFOMarket
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

  /**
   * @notice Keeps track of order of suppliers by address using a circularly doubly linked list.
   */
  struct RoundRobinOrder {
    address previousSupplierAddress;
    address nextSupplierAddress;
  }

  struct ActiveRemoval {
    uint256 tokenId;
    uint256 amount;
  }

  struct ActiveSupplier {
    address supplier;
    uint256 amount;
    ActiveRemoval[] removals;
  }

  struct ActiveSupply {
    uint256 amount;
    ActiveSupplier[] suppliers;
  }

  IERC1820RegistryUpgradeable private _erc1820;
  Removal private _removal;
  Certificate private _certificate;
  BridgedPolygonNORI private _bridgedPolygonNori;
  address private _noriFeeWallet;
  uint256 private _noriFee;
  uint256 public priorityRestrictedThreshold;
  uint256 public totalNumberActiveRemovals;
  uint256 private _totalActiveSupply;
  uint256 public totalReservedSupply;
  uint256 public activeSupplierCount;
  address private _currentSupplierAddress;
  mapping(address => RoundRobinOrder) private _suppliersInRoundRobinOrder;
  EnumerableSetUpgradeable.UintSet private _reservedSupply;
  mapping(address => EnumerableSetUpgradeable.UintSet) private _activeSupply;

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
    _totalActiveSupply = 0;
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

  // todo Is this redundant of `_totalActiveSupply` ?
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
      EnumerableSetUpgradeable.UintSet storage supplierSet = _activeSupply[
        supplierAddress
      ];
      for (uint256 j = 0; j < supplierSet.length(); j++) {
        uint256 removalBalance = _removal.balanceOf(
          address(this),
          supplierSet.at(j)
        );
        total += removalBalance;
      }
      supplierAddress = _suppliersInRoundRobinOrder[supplierAddress]
        .nextSupplierAddress;
    }
    return total;
  }

  /**
   * @notice Gets the active restricted or unrestricted supply currently listed for sale in the market.
   */
  function activeSupply(bool includeRestricted)
    external
    view
    returns (ActiveSupply memory)
  {
    uint256 total = 0;
    address supplierAddress = _currentSupplierAddress;
    uint256 totalSupplyToCheck = totalActiveSupply(includeRestricted);
    ActiveSupplier[] memory suppliers = new ActiveSupplier[](
      activeSupplierCount
    );
    for (uint256 i = 0; i < activeSupplierCount; i++) {
      uint256 totalForSupplier = 0;
      EnumerableSetUpgradeable.UintSet storage supplierSet = _activeSupply[
        supplierAddress
      ];
      ActiveRemoval[] memory removals = new ActiveRemoval[](
        supplierSet.length()
      );
      for (
        uint256 j = 0;
        j < supplierSet.length() && total < totalSupplyToCheck;
        j++
      ) {
        uint256 removalBalance = _removal.balanceOf(
          address(this),
          supplierSet.at(j)
        );
        total += removalBalance;
        totalForSupplier += removalBalance;
        removals[j] = ActiveRemoval({
          tokenId: supplierSet.at(j),
          amount: removals[j].amount += removalBalance
        });
      }
      suppliers[i] = ActiveSupplier({
        supplier: supplierAddress,
        removals: removals,
        amount: totalForSupplier
      });
      supplierAddress = _suppliersInRoundRobinOrder[supplierAddress]
        .nextSupplierAddress;
    }
    ActiveSupply memory supply = ActiveSupply({
      suppliers: suppliers,
      amount: total
    });
    return supply;
  }

  /**
   * @notice The amount of supply available to buy.
   *
   * todo document params
   */
  function totalActiveSupply(bool includeRestricted)
    public
    view
    returns (uint256)
  {
    uint256 total = _totalActiveSupply;
    if (includeRestricted) {
      (, total) = SafeMathUpgradeable.trySub(
        total,
        priorityRestrictedThreshold
      ); // equivalent to max(0, _totalActiveSupply - priorityRestrictedThreshold)
    }
    return total;
  }

  // TODO: this function no longer makes sense to exist based on how the market now works (less deterministic)
  // function nextRemovalForSale(bool includePriorityRestrictedSupply)
  //   public
  //   view
  //   returns (uint256)
  // {
  //   uint256 nextRemovalId = 0;
  //   if (_totalActiveSupply > 0) {
  //     address activeSupplierAddress = _suppliersInRoundRobinOrderOrdered[
  //       _currentSupplierIndex
  //     ];
  //     nextRemovalId = _activeSupply[activeSupplierAddress].at(0);
  //   }
  //   if (
  //     !includePriorityRestrictedSupply &&
  //     _totalActiveSupply <= priorityRestrictedThreshold
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
    bytes memory
  ) public override returns (bytes4) {
    for (uint256 i = 0; i < ids.length; i++) {
      uint256 removalAmount = _removal.balanceOf(address(this), ids[i]);
      _totalActiveSupply += removalAmount;
      totalNumberActiveRemovals += 1;
      address supplierAddress = ids[i].supplierAddress();
      require(
        _activeSupply[supplierAddress].add(ids[i]),
        "Market: Removal already in active supply"
      );
      // If a new supplier has been added, or if the supplier had previously sold out
      if (
        _suppliersInRoundRobinOrder[supplierAddress].nextSupplierAddress ==
        address(0)
      ) {
        _addActiveSupplier(supplierAddress);
      }
    }
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
    // todo we need to treat _totalActiveSupply in a more nuanced way when reservation of removals is implemented
    // potentialy creating more endpoints to understand how many are reserved v.s. actually available v.s. priority reserved etc.
    if (_totalActiveSupply == 0) {
      revert("Market: Out of stock");
    }
    if (_totalActiveSupply <= priorityRestrictedThreshold) {
      require(
        hasRole(ALLOWLIST_ROLE, from),
        "Low supply and buyer not on allowlist"
      );
    }
    uint256 certificateAmount = (amount * 100) / (100 + _noriFee);
    uint256 remainingAmountToFill = certificateAmount;

    address recipient = abi.decode(userData, (address)); // todo handle the case where someone invokes this function without operatorData
    require(recipient == address(recipient), "Market: Invalid address");
    require(recipient != address(0), "Market: Cannot mint to the 0 address");
    // todo verify this can only be invoked by the nori contract
    require(
      msg.sender == address(_bridgedPolygonNori),
      "Market: This contract can only receive BridgedPolygonNORI"
    );

    uint256[] memory ids = new uint256[](totalNumberActiveRemovals);
    uint256[] memory amounts = new uint256[](totalNumberActiveRemovals);
    address[] memory suppliers = new address[](totalNumberActiveRemovals);
    uint256 numberOfRemovals = 0;
    for (uint256 i = 0; i < totalNumberActiveRemovals; i++) {
      uint256 removalId = _activeSupply[_currentSupplierAddress].at(0); // grab head of this supplier's queue
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
          _activeSupply[_currentSupplierAddress].remove(removalId),
          "Market: Removal not in active supply"
        ); // pull it out of the supplier's queue
        // If the supplier is out of supply, remove them from the active suppliers
        if (_activeSupply[_currentSupplierAddress].length() == 0) {
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
    for (uint256 i = 0; i < batchedIds.length; i++) {
      if (
        batchedAmounts[i] == _removal.balanceOf(address(this), batchedIds[i])
      ) {
        totalNumberActiveRemovals -= 1; // removal used up
      }
      _totalActiveSupply -= batchedAmounts[i];
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
    EnumerableSetUpgradeable.UintSet storage supplierSet = _activeSupply[
      supplierAddress
    ];
    require(
      supplierSet.remove(removalId) == true,
      "Market: removal not in active supply"
    );
    totalNumberActiveRemovals -= 1;
    uint256 removalBalance = _removal.balanceOf(address(this), removalId);
    _totalActiveSupply -= removalBalance;
    totalReservedSupply += removalBalance;
    // If this is the last removal for the supplier, remove them from active suppliers
    if (supplierSet.length() == 0) {
      _removeActiveSupplier(supplierAddress);
    }
    // todo any checks on whether this id was already in there?
    require(_reservedSupply.add(removalId), "Market: Removal already reserved");
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
    EnumerableSetUpgradeable.UintSet storage supplierSet = _activeSupply[
      supplierAddress
    ];
    require(
      _reservedSupply.remove(removalId) == true,
      "Market: removal not in reserved supply"
    );
    totalNumberActiveRemovals += 1;
    uint256 removalBalance = _removal.balanceOf(address(this), removalId);
    _totalActiveSupply += removalBalance;
    totalReservedSupply -= removalBalance;
    // If the supplier has previously been removed from the active suppliers, add them back
    if (supplierSet.length() == 0) {
      _addActiveSupplier(supplierAddress);
    }
    require(
      supplierSet.add(removalId),
      "Market: Removal already in active supply"
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
