// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "./Certificate.sol";
import "./RestrictedNORI.sol";
import {RemovalQueue, RemovalQueueByVintage} from "./RemovalQueue.sol";
import {RemovalIdLib} from "./RemovalIdLib.sol";
import "./Errors.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

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
 * todo Emit events when state mutates and other existing events aren't capturing that change
 * todo Consider adding MARKET_ADMIN_ROLE (sets thresholds, etc, so they can be done from admin ui without super admin)
 * todo Consider adding getters for number of active suppliers
 * todo consider globally renaming "active"/"reserved" to names that better describe "(un)available" (e.g., "listed"?)
 * todo consistency in variables/fns that use "supply" vs "removal" nomenclature (which means what?)
 */
contract Market is PausableAccessPreset {
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using RemovalQueue for RemovalQueueByVintage;

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
  mapping(address => RoundRobinOrder) internal _suppliersInRoundRobinOrder;
  mapping(address => RemovalQueueByVintage) internal _activeSupply;

  /**
   * @notice Role conferring the ability to purchase supply when inventory is below the priority restricted threshold.
   */
  bytes32 public constant ALLOWLIST_ROLE = keccak256("ALLOWLIST_ROLE");

  /**
   * @notice Emitted on setting of `_priorityRestrictedThreshold`.
   * @param threshold The updated threshold for priority restricted supply.
   */
  event PriorityRestrictedThresholdSet(uint256 threshold);

  /**
   * @notice Emitted on setting of `_noriFeeWalletAddress`.
   * @param updatedWalletAddress The updated address of the Nori fee wallet.
   */
  event NoriFeeWalletAddressUpdated(address updatedWalletAddress);

  /**
   * @notice Emitted on setting of `_noriFeePercentage`.
   * @param updatedFeePercentage The updated fee percentage for Nori.
   */
  event NoriFeePercentageUpdated(uint256 updatedFeePercentage);

  /**
   * @notice Emitted when adding a supplier to `_activeSupply`.
   * @param addedSupplierAddress The supplier that was added.
   * @param nextSupplierAddress The next of the supplier that was added, updated to point to `addedSupplierAddress` as previous.
   * @param previousSupplierAddress The previous of the supplier that was added, updated to point to `addedSupplierAddress` as next.
   */
  event SupplierAdded(
    address indexed addedSupplierAddress,
    address indexed nextSupplierAddress,
    address indexed previousSupplierAddress
  );

  /**
   * @notice Emitted when removing a supplier from `_activeSupply`.
   * @param removedSupplierAddress The supplier that was removed.
   * @param nextSupplierAddress The next of the supplier that was removed, updated to point to `previousSupplierAddress` as previous.
   * @param previousSupplierAddress The previous of the supplier that was removed, updated to point to `nextSupplierAddress` as next.
   */
  event SupplierRemoved(
    address indexed removedSupplierAddress,
    address indexed nextSupplierAddress,
    address indexed previousSupplierAddress
  );

  /**
   * @notice Emitted when a removal is added to `_activeSupply`.
   * @param removalId The removal that was added.
   * @param supplierAddress The address of the supplier for the removal.
   */
  event RemovalAdded(
    uint256 indexed removalId,
    address indexed supplierAddress
  );

  /**
   * @notice Emitted when a Removal is removed from `_activeSupply`.
   * @param removalId The removal that was added.
   * @param supplierAddress The address of the supplier for the removal.
   */
  event RemovalRemoved(
    uint256 indexed removalId,
    address indexed supplierAddress
  );

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
    uint256 noriFeePercentage_
  ) public initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    _removal = removal;
    _bridgedPolygonNori = bridgedPolygonNori;
    _certificate = certificate;
    _restrictedNori = restrictedNori;
    _noriFeePercentage = noriFeePercentage_;
    _noriFeeWallet = noriFeeWalletAddress;
    _priorityRestrictedThreshold = 0;
    _currentSupplierAddress = address(0);
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(ALLOWLIST_ROLE, _msgSender());
  }

  /**
   * @notice Returns the current value of the priority restricted threshold, which is the amount of inventory
   * that will always be reserved to sell only to buyers with the ALLOWLIST_ROLE.
   */
  function priorityRestrictedThreshold() external view returns (uint256) {
    return _priorityRestrictedThreshold;
  }

  /**
   * @notice Returns the current value of the priority restricted threshold, which is the amount of inventory
   * that will always be reserved to sell only to buyers with the ALLOWLIST_ROLE.
   */
  function restrictedNoriAddress() external view returns (address) {
    return address(_restrictedNori);
  }

  /**
   * @notice Returns the current value of the Nori fee percentage, as an integer, which is the percentage of
   * each purchase that will be paid to Nori as the marketplace operator.
   */
  function noriFeePercentage() external view returns (uint256) {
    return _noriFeePercentage;
  }

  /**
   * @notice Calculates the Nori fee required for a purchase of `amount` tonnes of carbon removals.
   * todo consider renaming getNoriFee to something like `calculateNoriFee`
   */
  function getNoriFee(uint256 amount) external view returns (uint256) {
    return (amount * _noriFeePercentage) / 100;
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
  function noriFeeWallet() external view returns (address) {
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
   * @notice Sets the current value of the priority restricted threshold, which is the amount of inventory
   * that will always be reserved to sell only to buyers with the `ALLOWLIST_ROLE`.
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
   * @notice Handles the receipt of a multiple ERC1155 token types. This function is called at the end of a
   * `safeBatchTransferFrom` after the balances have been updated. To accept the transfer(s), this must return
   * `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`
   * (i.e. 0xbc197c81, or its own function selector).
   *
   * @dev
   * See (IERC1155Receiver)[https://docs.openzeppelin.com/contracts/3.x/api/token/erc1155#IERC1155Receiver] for more.
   *
   * @param ids An array containing ids of each token being transferred (order and length must match values array)
   * @return bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
   * if transfer is allowed
   */
  function onERC1155BatchReceived(
    address,
    address,
    uint256[] memory ids, // todo calldata?
    uint256[] memory,
    bytes memory
  ) external returns (bytes4) {
    // todo revert if Market.onERC1155BatchReceived sender is not the removal contract
    for (uint256 i = 0; i < ids.length; i++) {
      _addActiveRemoval(ids[i]);
    }
    return this.onERC1155BatchReceived.selector;
  }

  function onERC1155Received(
    address,
    address,
    uint256 id,
    uint256,
    bytes calldata
  ) external returns (bytes4) {
    // todo revert if Market.onERC1155Received sender is not the removal contract
    _addActiveRemoval({removalId: id});
    return this.onERC1155Received.selector;
  }

  /**
   * @notice Exchanges NORI for carbon removals and issues a certificate to `recipient`.
   *
   * @dev See [https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Permit](ERC20Permit) for more.
   * The message sender must present a valid permit to this contract to temporarily authorize this market
   * to transfer the sender's NORI to complete the purchase. A certificate is issued by Certificate.sol
   * to the specified recipient and NORI is distributed to the supplier of the carbon removal,
   * to the RestrictedNORI.sol contract that controls any restricted NORI owed to the supplier, and finally
   * to Nori Inc. as a market operator fee.
   *
   * @param recipient The address to which the certificate will be issued.
   * @param amount The total purchase amount in NORI. This is the combined total of the number of removals being
   * purchased and the fee paid to Nori.
   * @param deadline The EIP2612 permit deadline in Unix time.
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
    uint256 activeSupply = _removal.getMarketBalance();
    _validateSupply({
      certificateAmount: certificateAmount,
      activeSupply: activeSupply
    });
    _validatePrioritySupply({
      certificateAmount: certificateAmount,
      activeSupply: activeSupply
    });
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
    );
    this.fulfillOrder({
      certificateAmount: certificateAmount,
      operator: _msgSender(),
      recipient: recipient,
      numberOfRemovals: numberOfRemovals,
      ids: ids,
      amounts: amounts,
      suppliers: suppliers
    });
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
   * @param deadline The EIP2612 permit deadline in Unix time.
   * @param v The recovery identifier for the permit's secp256k1 signature
   * @param r The r value for the permit's secp256k1 signature
   * @param s The s value for the permit's secp256k1 signature
   *
   * todo make `swapFromSpecificSupplier` and `swap` re-use more of the same logic to de-dupe code
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
    uint256 certificateAmount = this.certificateAmountFromPurchaseTotal(amount);
    _validateSuppliersSupply({
      certificateAmount: certificateAmount,
      activeSupplyOfSupplier: _activeSupply[supplierToBuyFrom]
        .getTotalBalanceFromRemovalQueue(_removal)
    });
    _validatePrioritySupply({
      certificateAmount: certificateAmount,
      activeSupply: _removal.getMarketBalance()
    });
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
    this.fulfillOrder({
      certificateAmount: certificateAmount,
      operator: _msgSender(),
      recipient: recipient,
      numberOfRemovals: numberOfRemovals,
      ids: ids,
      amounts: amounts,
      suppliers: suppliers
    });
  }

  /**
   * @dev Reverts if total available supply in the market is not enough to fulfill the purchase.
   *
   * @param certificateAmount The number of carbon removals being purchased
   * @param activeSupply The amount of active supply in the market
   */
  function _validateSupply(uint256 certificateAmount, uint256 activeSupply)
    internal
    pure
  {
    if (certificateAmount > activeSupply) {
      revert InsufficientSupply();
    }
  }

  /**
   * @dev Reverts if supplier does not have enough supply to fulfill the supplier-specific purchase.
   *
   * @param certificateAmount The number of carbon removals being purchased
   * @param activeSupplyOfSupplier The amount of supply held by the supplier
   */
  function _validateSuppliersSupply(
    uint256 certificateAmount,
    uint256 activeSupplyOfSupplier
  ) internal pure {
    if (certificateAmount > activeSupplyOfSupplier) {
      revert InsufficientSupply();
    }
  }

  /**
   * @dev Reverts if available stock is being reserved for priority buyers and buyer is not priority.
   *
   * @param certificateAmount The number of carbon removals being purchased.
   * @param activeSupply The amount of active supply in the market.
   */
  function _validatePrioritySupply(
    uint256 certificateAmount,
    uint256 activeSupply
  ) internal view {
    (, uint256 supplyAfterPurchase) = SafeMathUpgradeable.trySub(
      activeSupply,
      certificateAmount
    );
    if (supplyAfterPurchase < _priorityRestrictedThreshold) {
      if (!hasRole(ALLOWLIST_ROLE, _msgSender())) {
        revert LowSupplyAllowlistRequired();
      }
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
        address(this) // todo are we making external calls throughout the contract? if so can we pass values down?
      );
    uint256[] memory ids = new uint256[](numberOfActiveRemovalsInMarket);
    uint256[] memory amounts = new uint256[](numberOfActiveRemovalsInMarket);
    address[] memory suppliers = new address[](numberOfActiveRemovalsInMarket);
    uint256 numberOfRemovalsForOrder = 0;
    for (uint256 i = 0; i < numberOfActiveRemovalsInMarket; i++) {
      uint256 removalId = _activeSupply[_currentSupplierAddress]
        .getNextRemovalForSale();
      // todo retrieve balances in a single batch call
      uint256 removalAmount = _removal.balanceOf(address(this), removalId);
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
        _removeActiveRemoval(removalId, _currentSupplierAddress);
        if (
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
    // todo revert single-supplier supply allocation if the total from suppliers != certificate amount
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
    // todo address code-complexity solhint issue
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
    // todo revert multi-supplier supply allocation if the total from suppliers != certificate amount
    return (numberOfRemovals, ids, amounts);
  }

  /**
   * @notice Sets the Nori fee percentage (as an integer) which is the percentage of
   * each purchase that will be paid to Nori as the marketplace operator.
   *
   * @dev
   *
   * ##### Requirements:
   * - Can only be used when the caller has the DEFAULT_ADMIN_ROLE
   * - Can only be used when this contract is not paused
   *
   * @param noriFeePercentage_ The new fee percentage as an integer.
   */
  function setNoriFeePercentage(uint256 noriFeePercentage_)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
    whenNotPaused
  {
    _noriFeePercentage = noriFeePercentage_;
    emit NoriFeePercentageUpdated(noriFeePercentage_);
  }

  /**
   * @notice Sets the Nori fee wallet address (as an integer) which is the address to which the
   * marketplace operator fee will be routed during each purchase.
   *
   * @dev
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
    emit NoriFeeWalletAddressUpdated(noriFeeWalletAddress);
  }

  /**
   * @notice Completes order fulfillment for specified supply allocation. Pays suppliers, routes tokens to the
   * `RestrictedNORI` contract, pays Nori the order fee, updates accounting, and mints the `Certificate`.
   *
   * @param certificateAmount The total amount for the certificate.
   * @param operator The message sender.
   * @param recipient The recipient of the certificate.
   * @param numberOfRemovals The number of distinct removal token ids that are involved in fulfilling this order.
   * @param ids An array of removal token ids involved in fulfilling this order.
   * @param amounts An array of amounts being allocated from each corresponding removal token.
   * @param suppliers An array of suppliers
   *
   * todo permission `fulfillOrder` now that it is external (or figure out how to use calldata with internal fns)
   * todo use correct check-effects pattern in `fulfillOrder`
   */
  function fulfillOrder(
    uint256 certificateAmount,
    address operator,
    address recipient,
    uint256 numberOfRemovals,
    uint256[] calldata ids,
    uint256[] calldata amounts,
    address[] memory suppliers
  ) external {
    // todo verify changes to `fulfillOrder` (memory->calldata arr args) that enabled [:index] arr slicing syntax is ok
    uint256[] memory batchedIds = ids[:numberOfRemovals];
    uint256[] memory batchedAmounts = amounts[:numberOfRemovals];
    uint8[] memory holdbackPercentages = _removal.batchGetHoldbackPercentages({
      ids: batchedIds
    });
    for (uint256 i = 0; i < numberOfRemovals; i++) {
      uint256 restrictedSupplierFee = 0;
      uint256 unrestrictedSupplierFee = batchedAmounts[i];
      if (holdbackPercentages[i] > 0) {
        restrictedSupplierFee =
          (unrestrictedSupplierFee * holdbackPercentages[i]) /
          100;
        unrestrictedSupplierFee -= restrictedSupplierFee;
        _restrictedNori.mint(restrictedSupplierFee, batchedIds[i]); // todo mint rNori in a single batch call
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
      ); // todo use MultiCall to batch transfer bpNori in `fulfillOrder`
      _bridgedPolygonNori.transferFrom(
        operator,
        suppliers[i],
        unrestrictedSupplierFee
      );
    }
    bytes memory data = abi.encode(recipient, certificateAmount);
    _removal.safeBatchTransferFrom(
      address(this),
      address(_certificate),
      batchedIds,
      batchedAmounts,
      data
    );
  }

  /**
   * @notice Withdraws a removal to the supplier.
   * @dev Withdraws a removal to the supplier address encoded in the removal ID.
   */
  function withdraw(uint256 removalId) external whenNotPaused {
    address supplierAddress = RemovalIdLib.supplierAddress(removalId);
    if (_isAuthorizedWithdrawal({owner: supplierAddress})) {
      _removeActiveRemoval(removalId, supplierAddress);
      _removal.safeTransferFrom({
        from: address(this),
        to: supplierAddress,
        id: removalId,
        amount: _removal.balanceOf(address(this), removalId),
        data: ""
      });
    } else {
      revert UnauthorizedWithdrawal();
    }
  }

  function _isAuthorizedWithdrawal(address owner) internal view returns (bool) {
    return (_msgSender() == owner ||
      hasRole({role: DEFAULT_ADMIN_ROLE, account: _msgSender()}) ||
      _removal.isApprovedForAll({account: owner, operator: _msgSender()}));
  }

  function _addActiveRemoval(uint256 removalId) internal {
    address supplierAddress = RemovalIdLib.supplierAddress(removalId);
    _activeSupply[supplierAddress].insertRemovalByVintage(removalId);
    if (
      _suppliersInRoundRobinOrder[supplierAddress].nextSupplierAddress ==
      address(0) // If a new supplier has been added, or if the supplier had previously sold out
    ) {
      _addActiveSupplier(supplierAddress);
    }
  }

  /**
   * @notice Removes the specified removal id from the active supply data structure.
   * @dev If this is the supplier's last active removal, the supplier is also removed from the active supplier queue.
   */
  function _removeActiveRemoval(uint256 removalId, address supplierAddress)
    internal
  {
    _activeSupply[supplierAddress].removeRemoval(removalId);
    if (_activeSupply[supplierAddress].isRemovalQueueEmpty()) {
      _removeActiveSupplier(supplierAddress); // todo can this be combined inside .removeRemoval?
    }
    emit RemovalRemoved(removalId, supplierAddress);
  }

  /**
   * @notice Adds the specified removal id from the active supply data structure.
   * @dev If this is the supplier's first active removal, the supplier is also added to the active supplier queue.
   */
  function _addActiveRemoval(uint256 removalId, address supplierAddress)
    internal
  {
    _activeSupply[supplierAddress].insertRemovalByVintage(removalId);
    if (
      _suppliersInRoundRobinOrder[supplierAddress].nextSupplierAddress ==
      address(0) // If a new supplier has been added, or if the supplier had previously sold out
    ) {
      _addActiveSupplier(supplierAddress);
    }
    emit RemovalAdded(removalId, supplierAddress);
  }

  /**
   *
   * @dev
   *
   * ##### Requirements:
   *
   * - The contract must not be paused. This is enforced by `Removal._beforeTokenTransfer`.
   *
   * todo Add the rest of the requirements
   * todo is `whenNotPaused` modifier redundant since it's only invoked from `Removal.release` calls?
   */
  function release(uint256 removalId, uint256 amount) external whenNotPaused {
    if (_msgSender() != address(_removal)) {
      revert SenderNotRemovalContract();
    }
    address supplierAddress = RemovalIdLib.supplierAddress(removalId);
    uint256 removalBalance = _removal.balanceOf(address(this), removalId);
    if (amount == removalBalance) {
      _removeActiveRemoval(removalId, supplierAddress);
    }
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
   * @dev Called when a new supplier is added to the marketplace. If the first supplier, initializes a cicularly
   * doubly-linked list, where initially the first supplier points to itself as next and previous. When a new supplier
   * is added, at the position of the current supplier, update the previous pointer of the current supplier to point to
   * the new supplier, and update the next pointer of the previous supplier to the new supplier.
   */
  function _addActiveSupplier(address newSupplierAddress) private {
    // If this is the first supplier to be added, update the intialized addresses.
    if (_currentSupplierAddress == address(0)) {
      _currentSupplierAddress = newSupplierAddress;
      _suppliersInRoundRobinOrder[newSupplierAddress] = RoundRobinOrder({
        previousSupplierAddress: newSupplierAddress,
        nextSupplierAddress: newSupplierAddress
      });
      emit SupplierAdded(
        newSupplierAddress,
        newSupplierAddress,
        newSupplierAddress
      );
    } else {
      address previousOfCurrentSupplierAddress = _suppliersInRoundRobinOrder[
        _currentSupplierAddress
      ].previousSupplierAddress;
      /**
       * Add the new supplier to the round robin order, with the current supplier as next and the current supplier's
       * previous supplier as previous.
       */
      _suppliersInRoundRobinOrder[newSupplierAddress] = RoundRobinOrder({
        nextSupplierAddress: _currentSupplierAddress,
        previousSupplierAddress: previousOfCurrentSupplierAddress
      });
      /**
       * Update the previous supplier from the current supplier to point to the new supplier as next.
       */
      _suppliersInRoundRobinOrder[previousOfCurrentSupplierAddress]
        .nextSupplierAddress = newSupplierAddress;
      /**
       * Update the current supplier to point to the new supplier as previous.
       */
      _suppliersInRoundRobinOrder[_currentSupplierAddress]
        .previousSupplierAddress = newSupplierAddress;
      emit SupplierAdded(
        newSupplierAddress,
        _currentSupplierAddress,
        previousOfCurrentSupplierAddress
      );
    }
  }

  /**
   * @notice Removes a supplier from the active supplier queue.
   *
   * @dev Called when a supplier's last removal is used for an order. If the last supplier,
   * resets the pointer for the currentSupplierAddress. Otherwise, from the position of the supplier to be
   * removed, update the previous supplier to point to the next of the removed supplier, and the next of
   * the removed supplier to point to the previous of the remove supplier. Then, set the next and previous
   * pointers of the removed supplier to the 0x address.
   */
  function _removeActiveSupplier(address addressToRemove) private {
    address previousOfRemovedSupplierAddress = _suppliersInRoundRobinOrder[
      addressToRemove
    ].previousSupplierAddress;
    address nextOfRemovedSupplierAddress = _suppliersInRoundRobinOrder[
      addressToRemove
    ].nextSupplierAddress;

    /**
     * If this is the last supplier, clear all current tracked addresses.
     */
    if (addressToRemove == nextOfRemovedSupplierAddress) {
      _currentSupplierAddress = address(0);
    } else {
      /**
       * Set the next of the previous supplier to point to the removed supplier's next.
       */
      _suppliersInRoundRobinOrder[previousOfRemovedSupplierAddress]
        .nextSupplierAddress = nextOfRemovedSupplierAddress;

      /**
       * Set the previous of the next supplier to point to the removed supplier's previous.
       */
      _suppliersInRoundRobinOrder[nextOfRemovedSupplierAddress]
        .previousSupplierAddress = previousOfRemovedSupplierAddress;

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

    emit SupplierRemoved(
      addressToRemove,
      nextOfRemovedSupplierAddress,
      previousOfRemovedSupplierAddress
    );
  }
}
