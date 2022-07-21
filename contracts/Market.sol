// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "./Certificate.sol";
import "./RestrictedNORI.sol";
import {RemovalQueue, RemovalQueueByVintage} from "./RemovalQueue.sol";
import {RemovalIdLib} from "./RemovalIdLib.sol";
import {SenderNotRemovalContract} from "./Errors.sol";

/**
 * @title Nori Inc.'s carbon removal marketplace.
 *
 * @author Nori Inc.
 *
 * @notice Facilitates the exchange of NORI tokens for a non-transferrable certificate of carbon removal.
 *
 * @dev Carbon removals are represented by ERC1155 tokens in the Removal.sol contract, where the balance of a
 * given token represents the number of tonnes of carbon that were removed from the atmosphere for that specific
 * removal (different token ids are used to represent different slices of carbon removal projects and years).
 * This contract facilitates the exchange of NORI tokens for ERC721 tokens managed by the Certificate.sol contract.
 * Each of these certificates is a non-transferrable, non-fungible token that owns the specific removal tokens
 * and token balances that comprise the specific certificate for the amount purchased.
 *
 * todo more documentation
 * todo emit events
 * todo MARKET_ADMIN_ROLE (reserving, setting thresholds etc so they can be done from admin ui without super admin)
 * todo pausable
 * todo getters for number of active/reserved/unreserved suppliers?
 * todo consider global rename of active to name that better describes "available + reserved
 * todo consistency in naming of cummulative vs total (perhaps use count vs total)
 * todo consistency in naming of supply vs removals
 * todo consider withrawing when reserving instead of adding it to the _reservedSupply set
 * todo multicall?
 * todo consider using named args for functions globlaly (e.g., fn({argName: 1})). Not sure what tradeoffs are
 */
contract Market is PausableAccessPreset {
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
   * @notice Role allowing the purchase to reserve listed supply.
   */
  bytes32 public constant RESERVER_ROLE = keccak256("RESERVER_ROLE");

  /**
   * @notice Emitted on setting of `_priorityRestrictedThreshold`.
   */
  event PriorityRestrictedThresholdSet(uint256 threshold);

  /**
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  function initialize(
    Removal removal,
    BridgedPolygonNORI bridgedPolygonNori,
    Certificate certificate,
    RestrictedNORI restrictedNori,
    address noriFeeWalletAddress,
    uint256 noriFeePercentage
  ) public initializer {
    // todo verify all initializers are called
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    _removal = removal;
    _bridgedPolygonNori = bridgedPolygonNori;
    _certificate = certificate;
    _restrictedNori = restrictedNori;
    _noriFeePercentage = noriFeePercentage;
    _noriFeeWallet = noriFeeWalletAddress;
    _priorityRestrictedThreshold = 0;
    _currentSupplierAddress = address(0);
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(ALLOWLIST_ROLE, _msgSender());
    _grantRole(RESERVER_ROLE, _msgSender());
  }

  /**
   * @notice Returns the current value of the priority restricted threshold, which is the amount of inventory
   * that will always be reserved to sell only to buyers with the ALLOWLIST_ROLE.
   */
  function priorityRestrictedThreshold() external view returns (uint256) {
    return _priorityRestrictedThreshold;
  }

  /**
   * @notice Returns the current value of the Nori fee percentage, as an integer, which is the percentage of
   * each purchase that will be paid to Nori as the marketplace operator.
   */
  function getNoriFeePercentage() external view returns (uint256) {
    // todo getX vs X naming convention + consistency
    return _noriFeePercentage;
  }

  /**
   * @notice Calculates the Nori fee required for a purchase of `amount` tonnes of carbon removals.
   */
  function getNoriFee(uint256 amount) external view returns (uint256) {
    return (amount * _noriFeePercentage) / 100; // todo muldiv from OZ?;
  }

  /**
   * @notice Calculates the total quantity of NORI required to make a purchase of `amount` tonnes of carbon removals.
   */
  function getCheckoutTotal(uint256 amount) external view returns (uint256) {
    return amount + this.getNoriFee(amount);
  }

  /**
   * @notice Returns the address to which the marketplace operator fee will be routed during each purchase.
   */
  function getNoriFeeWallet() external view returns (address) {
    return _noriFeeWallet;
  }

  /**
   * @notice Calculates the quantity of carbon removals being purchased given the purchase total and the
   * percentage of that purchase total that is due to Nori as a transaction fee.
   */
  function certificateAmountFromPurchaseTotal(uint256 purchaseTotal)
    external
    view
    returns (uint256)
  {
    return (purchaseTotal * 100) / (100 + _noriFeePercentage);
  }

  /**
   * Sets the current value of the priority restricted threshold, which is the amount of inventory
   * that will always be reserved to sell only to buyers with the ALLOWLIST_ROLE.
   */
  function setPriorityRestrictedThreshold(uint256 threshold)
    external
    whenNotPaused
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _priorityRestrictedThreshold = threshold;
    emit PriorityRestrictedThresholdSet(threshold);
  }

  /**
   * The amount of supply available for anyone to buy.
   */
  function totalUnrestrictedSupply() external view returns (uint256) {
    uint256 activeSupply = _removal.cumulativeBalanceOf(address(this));
    return
      activeSupply < _priorityRestrictedThreshold
        ? 0
        : activeSupply - _priorityRestrictedThreshold; // todo compare this against trySub?
  }

  /**
   * @notice Handles the receipt of a multiple ERC1155 token types. This function is called at the end of a
   * `safeBatchTransferFrom` after the balances have been updated. To accept the transfer(s), this must return
   * `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`
   * (i.e. 0xbc197c81, or its own function selector).
   *
   * @dev See {https://docs.openzeppelin.com/contracts/3.x/api/token/erc1155#IERC1155Receiver}
   *
   * @param ids An array containing ids of each token being transferred (order and length must match values array)
   * @return bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
   * if transfer is allowed
   */
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
      address supplierAddress = RemovalIdLib.supplierAddress(removalToAdd);
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
   * @notice Exchanges NORI for carbon removals and issues a certificate to `recipient`.
   *
   * @dev See {https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Permit}
   * The message sender must present a valid permit to this contract to temporarily authorize this market
   * to transfer the sender's NORI to complete the purchase. A certificate is issued by Certificate.sol
   * to the specified recipient and NORI is distributed to the supplier of the carbon removal,
   * to the RestrictedNORI.sol contract that controls any restricted NORI owed to the supplier, and finally
   * to Nori Inc. as a market operator fee.
   *
   * @param recipient The address to which the certificate will be issued.
   * @param amount The total purchase amount in NORI. This is the combined total of the number of removals being
   * purchased and the fee paid to Nori.
   * @param deadline The EIP2612 permit deadline in unixtime.
   * @param v The recovery identifier for the permit's secp256k1 signature
   * @param r The r value for the permit's secp256k1 signature
   * @param s The s value for the permit's secp256k1 signature
   */
  function swap(
    address recipient,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external whenNotPaused {
    uint256 certificateAmount = this.certificateAmountFromPurchaseTotal(amount);
    _checkSupply({purchaseAmount: certificateAmount});
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
   * @notice An overloaded version of `swap` that additionally accepts a supplier address and will exchange NORI for
   * carbon removals supplied only from the specified supplier and issue a certificate to `recipient`.
   * If the specified supplier does not have enough carbon removals for sale to fulfill the order the transaction
   * will revert.
   *
   * @dev See {https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Permit}
   * The message sender must present a valid permit to this contract to temporarily authorize this market
   * to transfer the sender's NORI to complete the purchase. A certificate is issued by Certificate.sol
   * to the specified recipient and NORI is distributed to the supplier of the carbon removal,
   * to the RestrictedNORI.sol contract that controls any restricted NORI owed to the supplier, and finally
   * to Nori Inc. as a market operator fee.
   *
   * @param recipient The address to which the certificate will be issued.
   * @param amount The total purchase amount in NORI. This is the combined total of the number of removals being
   * purchased and the fee paid to Nori.
   * @param supplierToBuyFrom The only supplier address from which to purchase carbon removals in this transaction.
   * @param deadline The EIP2612 permit deadline in unixtime.
   * @param v The recovery identifier for the permit's secp256k1 signature
   * @param r The r value for the permit's secp256k1 signature
   * @param s The s value for the permit's secp256k1 signature
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
    uint256 purchaseAmount = this.certificateAmountFromPurchaseTotal(amount);
    _checkSupply({purchaseAmount: purchaseAmount});
    (
      uint256 numberOfRemovals,
      uint256[] memory ids,
      uint256[] memory amounts
    ) = _allocateSupplySingleSupplier(purchaseAmount, supplierToBuyFrom);
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

  /**
   * @dev The number of distinct removal token ids listed in the market that are not reserved.
   */
  function numberOfUnreservedRemovals() external view returns (uint256) {
    return
      _removal.numberOfTokensOwnedByAddress(address(this)) -
      this.numberOfReservedRemovals(); // todo gas vs _reservedSupply.length() ?
  }

  /**
   * @dev The number of distinct removal token ids listed in the market that are reserved.
   */
  function numberOfReservedRemovals() external view returns (uint256) {
    return _reservedSupply.length();
  }

  /**
   * @dev Reverts if market is out of stock or if available stock is being reserved for priority buyers
   * and buyer is not priority.
   *
   * @param purchaseAmount The number of carbon removals being purchased.
   */
  function _checkSupply(uint256 purchaseAmount) private view {
    // TODO: BUG: when using swap from single supplier, this function should check against the suppliers active balance,
    //not the markets total active balance!
    uint256 activeSupply = _removal.cumulativeBalanceOf(address(this));
    if (activeSupply == 0) {
      revert OutOfStock();
    }
    if (activeSupply <= _priorityRestrictedThreshold) {
      if (!hasRole(ALLOWLIST_ROLE, _msgSender())) {
        revert LowSupplyAllowlistRequired();
      }
    }
    if (purchaseAmount > activeSupply) {
      revert InsufficientSupply(); // todo test the logic for these checks is correct for all states
    }
  }

  /**
   * @dev Determines the removal ids, amounts, and suppliers to fill the given purchase quantity in
   * a round-robin order.
   *
   * @param certificateAmount The number of carbon removals to purchase.
   * @return numberOfRemovalForOrder The number of distinct removal token ids used to fulfill this order.
   * @return ids An array of the removal token ids being drawn from to fulfill this order.
   * @return amounts An array of amounts being allocated from each corresponding removal token.
   * @return suppliers The address of the supplier who owns each corresponding removal token.
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
    uint256 numberOfActiveRemovalsInMarket = _removal
      .numberOfTokensOwnedByAddress(
        address(this) // todo are we making calls like this throughout the contract flow? if so can we pass values down?
      );
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
      if (remainingAmountToFill < removalAmount) {
        /**
         * The order is complete, not fully using up this removal, don't increment currentSupplierAddress,
         * don't check about removing active supplier.
         */
        ids[numberOfRemovalsForOrder] = removalId;
        amounts[numberOfRemovalsForOrder] = remainingAmountToFill;
        suppliers[numberOfRemovalsForOrder] = _currentSupplierAddress;
        remainingAmountToFill = 0;
      } else {
        /**
         * We will use up this removal while completing the order, move on to next one.
         */
        ids[numberOfRemovalsForOrder] = removalId;
        amounts[numberOfRemovalsForOrder] = removalAmount; // this removal is getting used up
        suppliers[numberOfRemovalsForOrder] = _currentSupplierAddress;
        remainingAmountToFill -= removalAmount;
        _activeSupply[_currentSupplierAddress].removeRemoval(removalId);
        if (_activeSupply[_currentSupplierAddress].isRemovalQueueEmpty()) {
          /**
           * If the supplier is out of supply, remove them from the active suppliers.
           */
          _removeActiveSupplier(_currentSupplierAddress);
        } else if (
          /**
           *  If the supplier is the only supplier remaining with supply, don't bother incrementing.
           */
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
   * @dev Determines the removal ids and amounts to fill the given purchase quantity, sourcing only
   * from a single supplier.
   *
   * @param certificateAmount The number of carbon removals to purchase.
   * @param supplier The supplier from which to purchase carbon removals.
   * @return numberOfRemovalForOrder The number of distinct removal token ids used to fulfill this order.
   * @return ids An array of the removal token ids being drawn from to fulfill this order.
   * @return amounts An array of amounts being allocated from each corresponding removal token.
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
    uint256 latestYear = supplierRemovalQueue.latestYear;
    for (
      uint256 vintage = supplierRemovalQueue.earliestYear;
      vintage <= latestYear;
      vintage++
    ) {
      totalNumberOfRemovalsForSupplier += supplierRemovalQueue
        .queueByVintage[vintage]
        .length();
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
      /**
       * Order complete, not fully using up this removal.
       */
      if (remainingAmountToFill < removalAmount) {
        ids[numberOfRemovals] = removalId;
        amounts[numberOfRemovals] = remainingAmountToFill;
        remainingAmountToFill = 0;
        /**
         * We will use up this removal while completing the order, move on to next one.
         */
      } else {
        if (
          numberOfRemovals == totalNumberOfRemovalsForSupplier - 1 &&
          remainingAmountToFill > removalAmount
        ) {
          revert InsufficientSupply();
        }
        ids[numberOfRemovals] = removalId;
        amounts[numberOfRemovals] = removalAmount; // This removal is getting used up.
        remainingAmountToFill -= removalAmount;
        supplierRemovalQueue.removeRemoval(removalId);
        /**
         * If the supplier is out of supply, remove them from the active suppliers.
         */
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
   * @notice Sets the Nori fee percentage (as an integer) which is the percentage of
   * each purchase that will be paid to Nori as the marketplace operator.
   *
   * ##### Requirements:
   * - Can only be used when the caller has the DEFAULT_ADMIN_ROLE
   * - Can only be used when this contract is not paused
   *
   * @param noriFeePercentage The new fee percentage as an integer.
   */
  function setNoriFeePercentage(uint256 noriFeePercentage)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
    whenNotPaused
  {
    _noriFeePercentage = noriFeePercentage;
  }

  /**
   * @notice Sets the Nori fee wallet address (as an integer) which is the address to which the
   * marketplace operator fee will be routed during each purchase.
   *
   * ##### Requirements:
   * - Can only be used when the caller has the DEFAULT_ADMIN_ROLE
   * - Can only be used when this contract is not paused
   *
   * @param noriFeeWalletAddress The wallet address where Nori collects market fees.
   */
  function setNoriFeeWallet(address noriFeeWalletAddress)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
    whenNotPaused
  {
    _noriFeeWallet = noriFeeWalletAddress;
  }

  /**
   * @notice Completes order fulfillment for specified supply allocation. Pays suppliers, routes tokens to the
   * `RestrictedNORI` contract, pays Nori the order fee, updates accounting, and mints the `Certificate`.
   *
   * @param operator The message sender.
   * @param recipient The recipient of the certificate.
   * @param numberOfRemovals The number of distinct removal token ids that are involved in fulfilling this order.
   * @param ids An array of removal token ids involved in fulfilling this order.
   * @param amounts An array of amounts being allocated from each corresponding removal token.
   * @param suppliers An array of suppliers

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
    // todo might need to undo this `[:numberOfRemovals]` change (not sure if slice includes correct values)
    uint256[] memory batchedIds = ids[:numberOfRemovals];
    uint256[] memory batchedAmounts = amounts[:numberOfRemovals];
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

  /**
   * @notice Removes the removal from active supply and inserts it into the reserved supply,
   * where it cannot be used to fill orders.
   *
   * @dev If the removal is the last for the supplier, removes the supplier from the active supplier queue.
   */
  function reserveRemoval(uint256 removalId)
    external
    whenNotPaused
    onlyRole(RESERVER_ROLE)
  {
    address supplierAddress = RemovalIdLib.supplierAddress(removalId);
    _removeActiveRemoval(supplierAddress, removalId);
    if (!_reservedSupply.add(removalId)) {
      revert RemovalAlreadyReserved({removalId: removalId});
    }
  }

  /**
   * @notice Removes the specified removal id from the active supply data structure.
   * If this is the supplier's last active removal, the supplier is also removed from the active supplier queue.
   */
  function _removeActiveRemoval(
    address supplierAddress,
    uint256 removalId // todo flip param order
  ) internal {
    _activeSupply[supplierAddress].removeRemoval(removalId);
    if (_activeSupply[supplierAddress].isRemovalQueueEmpty()) {
      _removeActiveSupplier(supplierAddress); // todo can this be combined inside .removeRemoval?
    }
  }

  /**
   *
   * @dev
   *
   * ##### Requirements:
   *
   * - The contract must not be paused. This is enforced by `Removal._beforeTokenTransfer`.
   *
   * todo rest of requirements (waiting on docs)
   */
  function release(uint256 removalId, uint256 amount) external {
    // todo consider making this a generalized `withdrawRemoval`?
    // todo emit event?
    // todo is whenNotPaused redundant (called from removal contract)?
    if (_msgSender() != address(_removal)) {
      revert SenderNotRemovalContract();
    }
    address supplierAddress = RemovalIdLib.supplierAddress(removalId);
    uint256 removalBalance = _removal.balanceOf(address(this), removalId);
    if (amount == removalBalance) {
      _unreserveRemoval(removalId, false);
      _removeActiveRemoval(supplierAddress, removalId);
    }
    // todo what do we do when amount != removalBalance?
  }

  /**
   * @notice Removes a removal from the reserved supply.
   */
  function _unreserveRemoval(uint256 removalId, bool throwIfMissing) internal {
    if (!_reservedSupply.remove(removalId) && throwIfMissing) {
      revert RemovalNotInReservedSupply({removalId: removalId});
    }
  }

  /**
   * @notice Adds the removal back to active supply to be sold.
   *
   * @dev Removes removal from reserved supply and re-inserts it into the active supply, where it can be used to
   * fill orders again. If the supplier's other removals have all been sold, adds the supplier back to the
   * list of active suppliers
   */
  function unreserveRemoval(uint256 removalId)
    external
    whenNotPaused // todo whenNotPaused best practice? Public funcs vs internal
    onlyRole(RESERVER_ROLE)
  {
    address supplierAddress = RemovalIdLib.supplierAddress(removalId);
    _unreserveRemoval(removalId, true);
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
   * @dev Updates `_currentSupplierAddress` to the next of whatever is the current supplier.
   * Used to iterate in a round-robin way through the linked list of active suppliers.
   */
  function _incrementCurrentSupplierAddress() private {
    _currentSupplierAddress = _suppliersInRoundRobinOrder[
      _currentSupplierAddress
    ].nextSupplierAddress;
  }

  /**
   * @notice Adds a supplier to the active supplier queue.
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
      /**
       * Add the new supplier to the round robin order, with the current supplier as next and the current supplier's
       * previous supplier as previous.
       */
      _suppliersInRoundRobinOrder[supplierAddress] = RoundRobinOrder({
        previousSupplierAddress: _suppliersInRoundRobinOrder[
          _currentSupplierAddress
        ].previousSupplierAddress,
        nextSupplierAddress: _currentSupplierAddress
      });
      /**
       * Update the previous supplier to point to the new supplier as next.
       */
      _suppliersInRoundRobinOrder[
        _suppliersInRoundRobinOrder[_currentSupplierAddress]
          .previousSupplierAddress
      ].nextSupplierAddress = supplierAddress;
      /**
       * Update the current supplier to point to the new supplier as previous.
       */
      _suppliersInRoundRobinOrder[_currentSupplierAddress]
        .previousSupplierAddress = supplierAddress;
    }
  }

  /**
   * @notice Removes a supplier from the active supplier queue.
   *
   * @dev Called when a supplier's last removal is used for an order or reserved. If the last supplier,
   * resets the pointer for the currentSupplierAddress. Otherwise, from the position of the supplier to be
   * removed, update the previous supplier to point to the next of the removed supplier, and the next of
   * the removed supplier to point to the previous of the remove supplier. Then, set the next and previous
   * pointers of the removed supplier to the 0x address.
   */
  function _removeActiveSupplier(address addressToRemove) private {
    /**
     * If this is the last supplier, clear all current tracked addresses.
     */
    if (
      addressToRemove ==
      _suppliersInRoundRobinOrder[addressToRemove].nextSupplierAddress
    ) {
      _currentSupplierAddress = address(0);
    } else {
      /**
       * Set the next of the previous supplier to point to the removed supplier's next.
       */
      _suppliersInRoundRobinOrder[
        _suppliersInRoundRobinOrder[addressToRemove].previousSupplierAddress
      ].nextSupplierAddress = _suppliersInRoundRobinOrder[addressToRemove]
        .nextSupplierAddress;
      /**
       * Set the previous of the next supplier to point to the removed supplier's previous.
       */
      _suppliersInRoundRobinOrder[
        _suppliersInRoundRobinOrder[addressToRemove].nextSupplierAddress
      ].previousSupplierAddress = _suppliersInRoundRobinOrder[addressToRemove]
        .previousSupplierAddress;
      /**
       * If the supplier is the current supplier, update that address to the next supplier.
       */
      if (addressToRemove == _currentSupplierAddress) {
        _incrementCurrentSupplierAddress();
      }
    }
    /**
     * Remove `RoundRobinOrder` data from supplier.
     */
    _suppliersInRoundRobinOrder[addressToRemove] = RoundRobinOrder({
      nextSupplierAddress: address(0),
      previousSupplierAddress: address(0)
    });
  }
}
