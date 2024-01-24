// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "./AccessPresetPausable.sol";
import "./Certificate.sol";
import "./Errors.sol";
import "./IMarket.sol";
import "./Removal.sol";

import {RemovalsByYearLib, RemovalsByYear} from "./RemovalsByYearLib.sol";
import {RemovalIdLib} from "./RemovalIdLib.sol";
import {UInt256ArrayLib, AddressArrayLib} from "./ArrayLib.sol";

/**
 * @title Nori Inc.'s carbon removal marketplace.
 * @author Nori Inc.
 * @notice Facilitates the creation of a non-transferrable certificate of carbon removal.
 * @dev Carbon removals are represented by ERC1155 tokens in the Removal contract, where the balance of a
 * given token represents the number of tonnes of carbon that were removed from the atmosphere for that specific
 * removal (different token IDs are used to represent different slices of carbon removal projects and years).
 * This contract facilitates the creation of ERC721 tokens managed by the Certificate contract.
 * Each of these certificates is a non-transferrable, non-fungible token that owns the specific removal tokens
 * and token balances that comprise the specific certificate for the amount purchased.
 *
 *
 * ###### Additional behaviors and features
 *
 * - [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
 * - [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all external functions that mutate
 * state are pausable.
 * - [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
 * - `MARKET_ADMIN_ROLE`: Can set the value of market configuration variables. Can execute replacement operations through
 *    the `replace` function. Can submit special orders through `swapWithoutFeeSpecialOrder`.
 * - `PRIORITY_ALLOWLIST_ROLE`: Deprecated.
 * - `SWAP_ALLOWLIST_ROLE`: Deprecated.
 * - [Can receive ERC1155 tokens](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155Receiver)
 *
 * ##### Inherits:
 *
 * - [IERC1155ReceiverUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155Receiver)
 * - [MulticallUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Multicall)
 * - [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
 * - [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
 * - [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
 * - [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
 * - [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)
 *
 * ##### Implements:
 *
 * - [IERC1155](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155)
 * - [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
 * - [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)
 *
 * ##### Uses:
 *
 * - [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet)
 * for `EnumerableSetUpgradeable.UintSet`
 * - [SafeMathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#SafeMath)
 * - `UInt256ArrayLib` for `uint256[]`
 * - `AddressArrayLib` for `address[]`
 */
contract Market is
  IMarket,
  AccessPresetPausable,
  IERC1155ReceiverUpgradeable,
  MulticallUpgradeable
{
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using RemovalsByYearLib for RemovalsByYear;
  using UInt256ArrayLib for uint256[];
  using AddressArrayLib for address[];
  using MathUpgradeable for uint256;

  /**
   * @notice Keeps track of order of suppliers by address using a circularly doubly linked list.
   * @param previous The address of the previous supplier in the linked list.
   * @param next The address of the next supplier in the linked list.
   */
  struct LinkedListNode {
    address previous;
    address next;
  }

  /**
   * @notice The data required to pass to the `_fulfillOrder` function.
   * @dev This is packaged as a struct to avoid stack too deep errors.
   * @param certificateAmount The total amount for the certificate.
   * @param from The message sender.
   * @param recipient The recipient of the certificate.
   * @param allocationData The removals, amounts, suppliers and count data returned
   * from the supply allocation algorithm.
   */
  struct FulfillOrderData {
    uint256 certificateAmount;
    address from;
    address recipient;
    SupplyAllocationData allocationData;
  }

  /**
   * @notice The removals, amounts, suppliers and count data returned from the supply allocation algorithm.
   * @param countOfRemovalsAllocated The number of distinct removal IDs used to fulfill an order.
   * @param ids An array of the removal IDs being drawn from to fulfill an order.
   * @param amounts An array of amounts being allocated from each corresponding removal token.
   * @param suppliers The address of the supplier who owns each corresponding removal token.
   */
  struct SupplyAllocationData {
    uint256 countOfRemovalsAllocated;
    uint256[] ids;
    uint256[] amounts;
    address[] suppliers;
  }

  /**
   * @notice The Removal contract.
   */
  Removal private _removal;

  /**
   * @notice The Certificate contract.
   */
  Certificate private _certificate;

  /**
   * @notice Deprecated.
   */
  address private _purchasingToken;

  /**
   * @notice Deprecated.
   */
  address private _restrictedNORI;

  /**
   * @notice Deprecated.
   */
  uint256 private _priceMultiple;

  /**
   * @notice Deprecated.
   */
  address private _noriFeeWallet;

  /**
   * @notice Deprecated.
   */
  uint256 private _noriFeePercentage;

  /**
   * @notice Deprecated.
   */
  uint256 private _priorityRestrictedThreshold;

  /**
   * @notice Address of the supplier currently selling in the queue.
   */
  address private _currentSupplierAddress;

  /**
   * @notice Linked list of active suppliers.
   */
  mapping(address => LinkedListNode) internal _suppliers;

  /**
   * @notice All listed removal tokens in the market.
   * @dev Top-level keys are supplier addresses, `RemovalsByYear` further organizes removals by vintage.
   */
  mapping(address => RemovalsByYear) internal _listedSupply;

  /**
   * @notice Role conferring the ability to configure the market.
   */
  bytes32 public constant MARKET_ADMIN_ROLE = keccak256("MARKET_ADMIN_ROLE");

  /**
   * @notice Deprecated.
   */
  bytes32 public constant PRIORITY_ALLOWLIST_ROLE =
    keccak256("PRIORITY_ALLOWLIST_ROLE");

  /**
   * @notice Deprecated.
   */
  bytes32 public constant SWAP_ALLOWLIST_ROLE =
    keccak256("SWAP_ALLOWLIST_ROLE");

  /**
   * @notice Deprecated.
   */
  uint256 constant FEE_DECIMALS = 2;

  /**
   * @notice Emitted on updating the addresses for contracts.
   * @param removal The address of the new Removal contract.
   * @param certificate The address of the new Certificate contract.
   */
  event RegisterContractAddresses(Removal removal, Certificate certificate);

  /**
   * @notice Emitted when adding a supplier to `_listedSupply`.
   * @param added The supplier that was added.
   * @param next The next of the supplier that was added, updated to point to `addedSupplierAddress` as previous.
   * @param previous the previous address of the supplier that was added, updated to point to `addedSupplierAddress`
   * as next.
   */
  event AddSupplier(
    address indexed added,
    address indexed next,
    address indexed previous
  );

  /**
   * @notice Emitted when removing a supplier from `_listedSupply`.
   * @param removed The supplier that was removed.
   * @param next The next of the supplier that was removed, updated to point to `previous` as previous.
   * @param previous the previous address of the supplier that was removed, updated to point to `next` as next.
   */
  event RemoveSupplier(
    address indexed removed,
    address indexed next,
    address indexed previous
  );

  /**
   * @notice Emitted when a removal is added to `_listedSupply`.
   * @param id The removal that was added.
   * @param supplierAddress The address of the supplier for the removal.
   */
  event AddRemoval(uint256 indexed id, address indexed supplierAddress);

  /**
   * @notice Emitted when replacement removals are sent to this contract on behalf of an existing certificate.
   * @param certificateId The certificate id that was updated.
   * @param removalIds The removal ids that were added to the certificate.
   * @param amounts The amount of each removal id that were added to the certificate.
   * @param removalIdsBeingReplaced The removal ids that were released from the certificate.
   * @param amountsBeingReplaced The amount of each removal id that was released from the certificate.
   */
  event UpdateCertificate(
    uint256 indexed certificateId,
    uint256[] removalIds,
    uint256[] amounts,
    uint256[] removalIdsBeingReplaced,
    uint256[] amountsBeingReplaced
  );

  /**
   * @notice Locks the contract, preventing any future re-initialization.
   * @dev See more [here](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable-_disableInitializers--).
   * @custom:oz-upgrades-unsafe-allow constructor
   */
  constructor() {
    _disableInitializers();
  }

  /**
   * @notice Initializes the Market contract.
   * @param removal The address of the Removal contract.
   * @param certificate The address of the Certificate contract.
   */
  function initialize(
    Removal removal,
    Certificate certificate
  ) external initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __Pausable_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Multicall_init_unchained();
    _removal = removal;
    _certificate = certificate;
    _currentSupplierAddress = address(0);
    _grantRole({role: DEFAULT_ADMIN_ROLE, account: _msgSender()});
    _grantRole({role: MARKET_ADMIN_ROLE, account: _msgSender()});
  }

  /**
   * @notice Releases a removal from the market.
   * @dev This function is called by the Removal contract when releasing removals.
   *
   * ##### Requirements:
   *
   * - Can only be used when this contract is not paused.
   * - The caller must be the Removal contract.
   * @param removalId The ID of the removal to release.
   */
  function release(uint256 removalId) external override whenNotPaused {
    if (_msgSender() != address(_removal)) {
      revert SenderNotRemovalContract();
    }
    address supplierAddress = RemovalIdLib.supplierAddress({
      removalId: removalId
    });
    uint256 removalBalance = _removal.balanceOf({
      account: address(this),
      id: removalId
    });
    if (removalBalance == 0) {
      _removeActiveRemoval({
        removalId: removalId,
        supplierAddress: supplierAddress
      });
    }
  }

  /**
   * @notice Purchases removals on behalf of the Certificate contract in order to replace removals that have been
   * released from an existing certificate.
   * @dev Replacement removals are sent to the Certificate contract and an event is emitted by the Certificate contract
   * to indicate the specific certificate on behalf of which removals are being replaced, as well as the IDs and amounts
   * of the replacement removals.
   *
   * ##### Requirements:
   *
   * - Can only be used when this contract is not paused.
   * - The caller must have the MARKET_ADMIN_ROLE.
   * - The amount of removals to purchase must be less than or equal to the amount of removals available in the
   * market.
   * @param treasury The address of the treasury that will fund the replacement purchase.
   * @param certificateId The ID of the certificate on behalf of which removals are being replaced.
   * @param totalAmountToReplace The total amount of replacement removals to purchase.
   * @param removalIdsBeingReplaced The removal ids that are being replaced.
   * @param amountsBeingReplaced The amount of each removal id that is being replaced.
   */
  function replace(
    address treasury,
    uint256 certificateId,
    uint256 totalAmountToReplace,
    uint256[] memory removalIdsBeingReplaced,
    uint256[] memory amountsBeingReplaced
  ) external whenNotPaused onlyRole(MARKET_ADMIN_ROLE) {
    if (_certificate.getPurchaseAmount({certificateId: certificateId}) == 0) {
      revert CertificateNotYetMinted({tokenId: certificateId});
    }
    uint256 nrtDeficit = _certificate.getNrtDeficit();
    if (totalAmountToReplace > nrtDeficit) {
      revert ReplacementAmountExceedsNrtDeficit();
    }
    uint256 availableSupply = _removal.getMarketBalance();
    _validateSupply({
      certificateAmount: totalAmountToReplace,
      availableSupply: availableSupply
    });
    SupplyAllocationData memory allocationData = _allocateSupply({
      amount: totalAmountToReplace
    });
    uint256 countOfRemovalsAllocated = allocationData.countOfRemovalsAllocated;
    uint256[] memory removalIds = allocationData.ids.shrink({
      length: countOfRemovalsAllocated
    });
    uint256[] memory removalAmounts = allocationData.amounts.shrink({
      length: countOfRemovalsAllocated
    });
    _validateReplacementAmounts({
      totalAmountToReplace: totalAmountToReplace,
      removalAmounts: removalAmounts,
      removalAmountsBeingReplaced: amountsBeingReplaced
    });
    _removal.safeBatchTransferFrom({
      from: address(this),
      to: address(_certificate),
      ids: removalIds,
      amounts: removalAmounts,
      data: abi.encode(
        true // isReplacement
      )
    });
    emit UpdateCertificate({
      certificateId: certificateId,
      removalIds: removalIds,
      amounts: removalAmounts,
      removalIdsBeingReplaced: removalIdsBeingReplaced,
      amountsBeingReplaced: amountsBeingReplaced
    });
  }

  /**
   * @notice Register the market contract's asset addresses.
   * @dev Register the Removal and Certificate contracts so that they
   * can be referenced in this contract. Called as part of the market contract system deployment process.
   *
   * Emits a `RegisterContractAddresses` event.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `DEFAULT_ADMIN_ROLE` role.
   * - Can only be used when this contract is not paused.
   * @param removal The address of the Removal contract.
   * @param certificate The address of the Certificate contract.
   */
  function registerContractAddresses(
    Removal removal,
    Certificate certificate
  ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
    _removal = removal;
    _certificate = certificate;
    emit RegisterContractAddresses({
      removal: _removal,
      certificate: _certificate
    });
  }

  /**
   * @notice Handles the receipt of multiple ERC1155 token types. This function is called at the end of a
   * `safeBatchTransferFrom` after the balances have been updated. To accept the transfer(s), this must return
   * `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`
   * (i.e., 0xbc197c81, or its own function selector).
   * @dev See [IERC1155Receiver](
   * https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#ERC1155Receiver) for more.
   *
   * ##### Requirements:
   *
   * - Can only receive ERC1155 tokens from the Removal contract.
   * - Can only be used when this contract is not paused.
   * @param ids An array containing the IDs of each removal being transferred (order and length must match values
   * array).
   * @return Returns `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))` if the
   * transfer is allowed.
   */
  function onERC1155BatchReceived(
    address,
    address,
    uint256[] calldata ids,
    uint256[] calldata,
    bytes calldata
  ) external whenNotPaused returns (bytes4) {
    require(_msgSender() == address(_removal), "Market: Sender not Removal");
    for (uint256 i = 0; i < ids.length; ++i) {
      _addActiveRemoval({removalId: ids[i]});
    }
    return this.onERC1155BatchReceived.selector;
  }

  /**
   * @notice Handles the receipt of an ERC1155 token. This function is called at the end of a
   * `safeTransferFrom` after the balances have been updated. To accept the transfer(s), this must return
   * `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`
   * (i.e., 0xf23a6e61, or its own function selector).
   * @dev See [IERC1155Receiver](
   * https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#ERC1155Receiver) for more.
   *
   * ##### Requirements:
   *
   * - Can only receive an ERC1155 token from the Removal contract.
   * - Can only be used when this contract is not paused.
   * @param id The ID of the received removal.
   * @return `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))` if the transfer is allowed.
   */
  function onERC1155Received(
    address,
    address,
    uint256 id,
    uint256,
    bytes calldata
  ) external whenNotPaused returns (bytes4) {
    require(_msgSender() == address(_removal), "Market: Sender not Removal");
    _addActiveRemoval({removalId: id});
    return this.onERC1155Received.selector;
  }

  /**
   * @notice Exchange ERC20 tokens for an ERC721 certificate by transferring ownership of the removals to the
   * certificate without charging a transaction fee, but allowing specification of the fee percentage that was paid
   * off-chain.
   * @dev See [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20-approve-address-uint256-)
   * for more.
   * The purchaser must have granted approval to this contract to authorize this market to transfer their
   * supported ERC20 to complete the purchase. A certificate is minted in the Certificate
   * contract to the specified recipient and the ERC20 is distributed to the suppliers of the carbon removals, and
   * potentially to the RestrictedNORI contract that controls any restricted portion of the ERC20 owed to each supplier.
   *
   * ##### Requirements:
   *
   * - Can only be used when this contract is not paused.
   * - Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
   * - Can only be used if this contract has been granted approval to spend the purchaser's ERC20 tokens.
   * @param recipient The address to which the certificate will be issued.
   * @param purchaser The address that will pay for the removals and has granted approval to this contract
   * to transfer their ERC20 tokens.
   * @param amount The total purchase amount in ERC20 tokens. This is the total number of removals being
   * purchased, scaled by the price multiple.
   * @param supplier The only supplier address from which to purchase carbon removals in this transaction, or
   * the zero address if any supplier is valid.
   * @param vintages The valid set of vintages from which to fulfill this order, or an empty array if any
   * vintage is valid.
   */
  function swapWithoutFeeSpecialOrder(
    address recipient,
    address purchaser,
    uint256 amount,
    address supplier,
    uint256[] calldata vintages
  ) external whenNotPaused onlyRole(MARKET_ADMIN_ROLE) {
    SupplyAllocationData memory allocationData = _allocateRemovalsSpecialOrder({
      certificateAmount: amount,
      supplier: supplier,
      vintages: vintages
    });
    _fulfillOrder({
      orderData: FulfillOrderData({
        certificateAmount: amount,
        from: purchaser,
        recipient: recipient,
        allocationData: allocationData
      })
    });
  }

  /**
   * @notice Withdraws a removal to the supplier.
   * @dev Withdraws a removal to the supplier address encoded in the removal ID.
   *
   * ##### Requirements:
   *
   * - Can only be used when this contract is not paused.
   * @param removalId The ID of the removal to withdraw from the market.
   */
  function withdraw(uint256 removalId) external whenNotPaused {
    address supplierAddress = RemovalIdLib.supplierAddress({
      removalId: removalId
    });
    if (_isAuthorizedWithdrawal({owner: supplierAddress})) {
      _removeActiveRemoval({
        removalId: removalId,
        supplierAddress: supplierAddress
      });
      _removal.safeTransferFrom({
        from: address(this),
        to: supplierAddress,
        id: removalId,
        amount: _removal.balanceOf({account: address(this), id: removalId}),
        data: ""
      });
    } else {
      revert UnauthorizedWithdrawal();
    }
  }

  /**
   * @notice Get the Removal contract address.
   * @return Returns the address of the Removal contract.
   */
  function getRemovalAddress() external view returns (address) {
    return address(_removal);
  }

  /**
   * @notice Get the Certificate contract address.
   * @return Returns the address of the Certificate contract.
   */
  function getCertificateAddress() external view returns (address) {
    return address(_certificate);
  }

  /**
   * @notice Get a list of all suppliers which have listed removals in the marketplace.
   * @return suppliers Returns an array of all suppliers that currently have removals listed in the market.
   */
  function getActiveSuppliers()
    external
    view
    returns (address[] memory suppliers)
  {
    uint256 supplierCount;
    if (_suppliers[_currentSupplierAddress].next != address(0)) {
      supplierCount = 1;
      address nextSupplier = _suppliers[_currentSupplierAddress].next;
      while (nextSupplier != _currentSupplierAddress) {
        nextSupplier = _suppliers[nextSupplier].next;
        ++supplierCount;
      }
    }
    address[] memory supplierArray = new address[](supplierCount);
    address currentSupplier = _currentSupplierAddress;
    LinkedListNode memory currentSupplierNode = _suppliers[currentSupplier];
    for (uint256 i = 0; i < supplierCount; ++i) {
      supplierArray[i] = currentSupplier;
      currentSupplier = currentSupplierNode.next;
      currentSupplierNode = _suppliers[currentSupplier];
    }
    return supplierArray;
  }

  /**
   * @notice Get all listed removal IDs for a given supplier.
   * @param supplier The supplier for which to return listed removal IDs.
   * @return removalIds The listed removal IDs for this supplier.
   */
  function getRemovalIdsForSupplier(
    address supplier
  ) external view returns (uint256[] memory removalIds) {
    RemovalsByYear storage removalsByYear = _listedSupply[supplier];
    return removalsByYear.getAllRemovalIds();
  }

  /**
   * @notice Check whether this contract supports an interface.
   * @dev See [IERC165.supportsInterface](
   * https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.
   * @param interfaceId The interface ID to check for support.
   * @return Returns true if the interface is supported, false otherwise.
   */
  function supportsInterface(
    bytes4 interfaceId
  )
    public
    view
    virtual
    override(AccessControlEnumerableUpgradeable, IERC165Upgradeable)
    returns (bool)
  {
    return super.supportsInterface({interfaceId: interfaceId});
  }

  /**
   * @notice Fulfill an order.
   * @dev This function is responsible for paying suppliers, routing tokens to the RestrictedNORI contract, paying Nori
   * the order fee, updating accounting, and minting the Certificate.
   * @param orderData The order fulfillment data.
   */
  function _fulfillOrder(FulfillOrderData memory orderData) internal {
    uint256[] memory removalIds = orderData.allocationData.ids.shrink({
      length: orderData.allocationData.countOfRemovalsAllocated
    });
    uint256[] memory removalAmounts = orderData.allocationData.amounts.shrink({
      length: orderData.allocationData.countOfRemovalsAllocated
    });
    bytes memory data = abi.encode(
      false,
      orderData.recipient,
      orderData.certificateAmount
    );
    _removal.safeBatchTransferFrom({
      from: address(this),
      to: address(_certificate),
      ids: removalIds,
      amounts: removalAmounts,
      data: data
    });
  }

  /**
   * @notice Allocates removals to fulfill an order.
   * @dev This function is responsible for validating and allocating the supply to fulfill an order.
   * @param certificateAmount The total amount for the certificate.
   * @param supplier The only supplier address from which to purchase carbon removals in this transaction,
   * or the zero address if any supplier is valid.
   * @param vintages A set of valid vintages from which to allocate removals, or an empty array if any vintage is valid.
   * @return SupplyAllocationData The removals, amounts, suppliers and count data returned
   * from the supply allocation algorithm.
   */
  function _allocateRemovalsSpecialOrder(
    uint256 certificateAmount,
    address supplier,
    uint256[] calldata vintages
  ) internal returns (SupplyAllocationData memory) {
    SupplyAllocationData memory allocationData;
    if (vintages.length == 0) {
      if (supplier == address(0)) {
        // case no restrictions on fulfillment
        uint256 availableSupply = _removal.getMarketBalance();
        _validateSupply({
          certificateAmount: certificateAmount,
          availableSupply: availableSupply
        });
        allocationData = _allocateSupply({amount: certificateAmount});
      } else {
        // case supplier-specific fulfillment only
        allocationData = _allocateSupplySingleSupplier({
          certificateAmount: certificateAmount,
          supplier: supplier
        });
      }
    } else {
      if (supplier == address(0)) {
        // case vintage-specific fulfillment only
        allocationData = _allocateSupplySpecificVintages({
          amount: certificateAmount,
          vintages: vintages
        });
      } else {
        // case vintage-specific fulfillment and supplier-specific fulfillment
        allocationData = _allocateSupplySingleSupplierSpecificVintages({
          amount: certificateAmount,
          supplier: supplier,
          vintages: vintages
        });
      }
    }
    return allocationData;
  }

  /**
   * @notice Allocates removals to fulfill an order.
   * @dev This function is responsible for validating and allocating the supply to fulfill an order.
   * @param certificateAmount The total amount for the certificate.
   * @return SupplyAllocationData The removals, amounts, suppliers and count data returned
   * from the supply allocation algorithm.
   */
  function _allocateRemovals(
    uint256 certificateAmount
  ) internal returns (SupplyAllocationData memory) {
    uint256 availableSupply = _removal.getMarketBalance();
    _validateSupply({
      certificateAmount: certificateAmount,
      availableSupply: availableSupply
    });
    SupplyAllocationData memory allocationData = _allocateSupply({
      amount: certificateAmount
    });
    return allocationData;
  }

  /**
   * @notice Add a removal to the list of active supply.
   * @dev Adds the specified removal ID to the `_listedSupply` data structure. If this is the supplier's
   * first listed removal, the supplier is also added to the active supplier queue.
   *
   * Emits a `AddRemoval` event.
   * @param removalId The ID of the removal to add.
   */
  function _addActiveRemoval(uint256 removalId) internal {
    address supplierAddress = RemovalIdLib.supplierAddress({
      removalId: removalId
    });
    _listedSupply[supplierAddress].insert({removalId: removalId});
    if (
      _suppliers[supplierAddress].next == address(0) // If the supplier has sold out our a new supplier has been added
    ) {
      _addActiveSupplier({newSupplierAddress: supplierAddress});
    }
    emit AddRemoval({id: removalId, supplierAddress: supplierAddress});
  }

  /**
   * @notice Remove a removal from the list of active supply.
   * @dev Removes the specified removal ID from the listed supply data structure. If this is the supplier's last
   * listed removal, the supplier is also removed from the active supplier queue.
   * @param removalId The ID of the removal to remove.
   * @param supplierAddress The address of the supplier of the removal.
   */
  function _removeActiveRemoval(
    uint256 removalId,
    address supplierAddress
  ) internal {
    _listedSupply[supplierAddress].remove({removalId: removalId});
    if (_listedSupply[supplierAddress].isEmpty()) {
      _removeActiveSupplier({supplierToRemove: supplierAddress});
    }
  }

  /**
   * @dev Authorizes withdrawal for the removal. Reverts if the caller is not the owner of the removal and
   * does not have the role `MARKET_ADMIN_ROLE`.
   * @param owner The owner of the removal.
   * @return Returns true if the caller is the owner, an approved spender, or has the role `MARKET_ADMIN_ROLE`,
   * false otherwise.
   */
  function _isAuthorizedWithdrawal(address owner) internal view returns (bool) {
    return (_msgSender() == owner ||
      hasRole({role: MARKET_ADMIN_ROLE, account: _msgSender()}) ||
      _removal.isApprovedForAll({account: owner, operator: _msgSender()}));
  }

  /**
   * @notice Validates that the removal amounts being sent for replacement sum to the same amount as the removals
   * being replaced.
   * @dev Reverts if the sum of the removal amounts being sent for replacement does not equal the sum of the removals
   * being replaced.
   * @param totalAmountToReplace The total amount of removals being replaced.
   * @param removalAmounts The amounts of removals being sent for replacement.
   * @param removalAmountsBeingReplaced The amounts of removals being replaced.
   */
  function _validateReplacementAmounts(
    uint256 totalAmountToReplace,
    uint256[] memory removalAmounts,
    uint256[] memory removalAmountsBeingReplaced
  ) internal pure {
    uint256 totalAmountSentForReplacement = removalAmounts.sum();
    uint256 totalAmountBeingReplaced = removalAmountsBeingReplaced.sum();
    if (
      totalAmountSentForReplacement != totalAmountBeingReplaced ||
      totalAmountSentForReplacement != totalAmountToReplace
    ) {
      revert ReplacementAmountMismatch();
    }
  }

  /**
   * @notice Validates if there is enough supply to fulfill the order.
   * @dev Reverts if total available supply in the market is not enough to fulfill the purchase.
   * @param certificateAmount The number of carbon removals being purchased.
   * @param availableSupply The amount of listed supply in the market.
   */
  function _validateSupply(
    uint256 certificateAmount,
    uint256 availableSupply
  ) internal pure {
    if (certificateAmount > availableSupply) {
      revert InsufficientSupply();
    }
  }

  /**
   * @notice Allocates the removals, amounts, and suppliers needed to fulfill the purchase.
   * @param amount The number of carbon removals to purchase.
   * @return SupplyAllocationData The removals, amounts, suppliers and count data returned
   * from the supply allocation algorithm.
   */
  function _allocateSupply(
    uint256 amount
  ) internal returns (SupplyAllocationData memory) {
    uint256 countOfListedRemovals = _removal.numberOfTokensOwnedByAddress({
      account: address(this)
    });
    SupplyAllocationData memory allocationData = SupplyAllocationData({
      countOfRemovalsAllocated: 0,
      ids: new uint256[](countOfListedRemovals),
      amounts: new uint256[](countOfListedRemovals),
      suppliers: new address[](countOfListedRemovals)
    });
    uint256 remainingAmountToFill = amount;
    uint256 amountUsedFromRemoval = 0;
    for (uint256 i = 0; i < countOfListedRemovals; ++i) {
      uint256 removalId = _listedSupply[_currentSupplierAddress]
        .getNextRemovalForSale();
      uint256 removalAmount = _removal.balanceOf({
        account: address(this),
        id: removalId
      });
      allocationData.ids[allocationData.countOfRemovalsAllocated] = removalId;
      allocationData.suppliers[
        allocationData.countOfRemovalsAllocated
      ] = _currentSupplierAddress;
      amountUsedFromRemoval = MathUpgradeable.min({
        a: remainingAmountToFill,
        b: removalAmount
      });
      allocationData.amounts[
        allocationData.countOfRemovalsAllocated
      ] = amountUsedFromRemoval;
      remainingAmountToFill -= amountUsedFromRemoval;
      if (amountUsedFromRemoval == removalAmount) {
        /**
         * We will use up this removal while completing the order, move on to next one.
         */
        address currentSupplierBeforeRemovingActiveRemoval = _currentSupplierAddress;
        _removeActiveRemoval({
          removalId: removalId,
          supplierAddress: _currentSupplierAddress
        });
        if (
          /**
           * Only if the current supplier address was not already incremented via removing that supplier's last active
           * removal, and there is more than one remaining supplier with supply, increment the current supplier address.
           */
          currentSupplierBeforeRemovingActiveRemoval ==
          _currentSupplierAddress &&
          _suppliers[_currentSupplierAddress].next != _currentSupplierAddress
        ) {
          _incrementCurrentSupplierAddress();
        }
      }
      ++allocationData.countOfRemovalsAllocated;
      if (remainingAmountToFill == 0) {
        break;
      }
    }
    return allocationData;
  }

  /**
   * @notice Allocates supply for an amount using only a single supplier's removals.
   * @param certificateAmount The number of carbon removals to purchase.
   * @param supplier The supplier from which to purchase carbon removals.
   * @return SupplyAllocationData The removals, amounts, suppliers and count data returned
   * from the supply allocation algorithm.
   */
  function _allocateSupplySingleSupplier(
    uint256 certificateAmount,
    address supplier
  ) internal returns (SupplyAllocationData memory) {
    RemovalsByYear storage supplierRemovalQueue = _listedSupply[supplier];
    uint256 countOfListedRemovals;
    uint256 vintage = supplierRemovalQueue.earliestYear;
    uint256 latestYear = supplierRemovalQueue.latestYear;
    for (; vintage <= latestYear; ++vintage) {
      countOfListedRemovals += supplierRemovalQueue
        .yearToRemovals[vintage]
        .length();
    }
    if (countOfListedRemovals == 0) {
      revert InsufficientSupply();
    }
    SupplyAllocationData memory allocationData = SupplyAllocationData({
      countOfRemovalsAllocated: 0,
      ids: new uint256[](countOfListedRemovals),
      amounts: new uint256[](countOfListedRemovals),
      suppliers: new address[](0) // populated later
    });
    uint256 remainingAmountToFill = certificateAmount;
    uint256 amountUsedFromRemoval = 0;
    for (uint256 i = 0; i < countOfListedRemovals; ++i) {
      uint256 removalId = supplierRemovalQueue.getNextRemovalForSale();
      uint256 removalAmount = _removal.balanceOf({
        account: address(this),
        id: removalId
      });
      amountUsedFromRemoval = MathUpgradeable.min({
        a: remainingAmountToFill,
        b: removalAmount
      });
      allocationData.ids[allocationData.countOfRemovalsAllocated] = removalId;
      allocationData.amounts[
        allocationData.countOfRemovalsAllocated
      ] = amountUsedFromRemoval;
      if (
        allocationData.countOfRemovalsAllocated == countOfListedRemovals - 1 &&
        remainingAmountToFill > removalAmount
      ) {
        revert InsufficientSupply();
      }
      remainingAmountToFill -= amountUsedFromRemoval;
      if (amountUsedFromRemoval == removalAmount) {
        supplierRemovalQueue.remove({removalId: removalId});
        /**
         * If the supplier is out of supply, remove them from the active suppliers.
         */
        if (supplierRemovalQueue.isEmpty()) {
          _removeActiveSupplier({supplierToRemove: supplier});
        }
      }
      ++allocationData.countOfRemovalsAllocated;
      if (remainingAmountToFill == 0) {
        break;
      }
    }
    allocationData.suppliers = new address[](
      allocationData.countOfRemovalsAllocated
    ).fill({value: supplier});
    return allocationData;
  }

  /**
   * @notice Allocates the removals, amounts and suppliers needed to fulfill the purchase, drawing only from
   * the vintages specified.
   * @param amount The number of carbon removals to purchase.
   * @param vintages The vintages from which to purchase carbon removals.
   * @return SupplyAllocationData The removals, amounts, suppliers and count data returned
   * from the supply allocation algorithm.
   */
  function _allocateSupplySpecificVintages(
    uint256 amount,
    uint256[] calldata vintages
  ) internal returns (SupplyAllocationData memory) {
    uint256 countOfListedRemovals = _removal.numberOfTokensOwnedByAddress({
      account: address(this)
    });
    SupplyAllocationData memory allocationData = SupplyAllocationData({
      countOfRemovalsAllocated: 0,
      ids: new uint256[](countOfListedRemovals),
      amounts: new uint256[](countOfListedRemovals),
      suppliers: new address[](countOfListedRemovals)
    });
    uint256 remainingAmountToFill = amount;
    address localCurrentSupplier = _currentSupplierAddress;
    uint256 amountUsedFromRemoval = 0;
    for (uint256 i = 0; i < countOfListedRemovals; ++i) {
      uint256 removalId = _listedSupply[localCurrentSupplier]
        .getNextRemovalForSaleFromVintages({vintages: vintages});
      if (removalId == 0) {
        localCurrentSupplier = _suppliers[localCurrentSupplier].next;
        continue;
      }
      uint256 removalAmount = _removal.balanceOf({
        account: address(this),
        id: removalId
      });
      allocationData.ids[allocationData.countOfRemovalsAllocated] = removalId;
      allocationData.suppliers[
        allocationData.countOfRemovalsAllocated
      ] = localCurrentSupplier;
      amountUsedFromRemoval = MathUpgradeable.min({
        a: remainingAmountToFill,
        b: removalAmount
      });
      allocationData.amounts[
        allocationData.countOfRemovalsAllocated
      ] = amountUsedFromRemoval;
      remainingAmountToFill -= amountUsedFromRemoval;
      if (amountUsedFromRemoval == removalAmount) {
        /**
         * We will use up this removal while fulfilling this order and need to remove it from the data structure.
         * This may remove the supplier from the active suppliers and increment the current supplier address
         * which is behavior we want in the case that the supplier is fully out of supply, but otherwise we do not
         * interact with the global _currentSupplierAddress in this special order fulfillment flow.
         */
        address successorInCaseSupplierIsRemoved = _suppliers[
          localCurrentSupplier
        ].next;
        _removeActiveRemoval({
          removalId: removalId,
          supplierAddress: localCurrentSupplier
        });
        // if the local current supplier was removed we need to move to the next one
        if (_listedSupply[localCurrentSupplier].isEmpty()) {
          localCurrentSupplier = successorInCaseSupplierIsRemoved;
        }
      }
      ++allocationData.countOfRemovalsAllocated;
      if (remainingAmountToFill == 0) {
        break;
      }
    }
    if (remainingAmountToFill > 0) {
      revert InsufficientSupply();
    }
    return allocationData;
  }

  /**
   * @notice Allocates the removals, amounts, and suppliers needed to fulfill the purchase drawing only from
   * the specific supplier and vintages specified.
   * @param amount The number of carbon removals to purchase.
   * @param supplier The supplier from which to purchase carbon removals.
   * @param vintages The vintages from which to purchase carbon removals.
   * @return SupplyAllocationData The removals, amounts, suppliers and count data returned
   * from the supply allocation algorithm.
   */
  function _allocateSupplySingleSupplierSpecificVintages(
    uint256 amount,
    address supplier,
    uint256[] calldata vintages
  ) internal returns (SupplyAllocationData memory) {
    RemovalsByYear storage supplierRemovalQueue = _listedSupply[supplier];
    uint256 countOfSuppliersListedRemovals = 0;
    uint256 vintage = supplierRemovalQueue.earliestYear;
    uint256 latestYear = supplierRemovalQueue.latestYear;
    for (; vintage <= latestYear; ++vintage) {
      countOfSuppliersListedRemovals += supplierRemovalQueue
        .yearToRemovals[vintage]
        .length();
    }
    if (countOfSuppliersListedRemovals == 0) {
      revert InsufficientSupply();
    }
    SupplyAllocationData memory allocationData = SupplyAllocationData({
      countOfRemovalsAllocated: 0,
      ids: new uint256[](countOfSuppliersListedRemovals),
      amounts: new uint256[](countOfSuppliersListedRemovals),
      suppliers: new address[](0) // populated later
    });
    uint256 remainingAmountToFill = amount;
    uint256 amountUsedFromRemoval = 0;
    for (uint256 i = 0; i < countOfSuppliersListedRemovals; ++i) {
      uint256 removalId = supplierRemovalQueue
        .getNextRemovalForSaleFromVintages({vintages: vintages});
      // if removalId is 0 here, this supplier doesn't have any more removals from the valid vintages requested,
      // so we can end the loop
      if (removalId == 0) {
        break;
      }
      uint256 removalAmount = _removal.balanceOf({
        account: address(this),
        id: removalId
      });
      allocationData.ids[allocationData.countOfRemovalsAllocated] = removalId;
      amountUsedFromRemoval = MathUpgradeable.min({
        a: remainingAmountToFill,
        b: removalAmount
      });
      allocationData.amounts[
        allocationData.countOfRemovalsAllocated
      ] = amountUsedFromRemoval;
      remainingAmountToFill -= amountUsedFromRemoval;
      if (amountUsedFromRemoval == removalAmount) {
        /**
         * We will use up this removal while completing the order, move on to next one.
         */
        supplierRemovalQueue.remove({removalId: removalId});
        /**
         * If the supplier is out of supply, remove them from the active suppliers.
         */
        if (supplierRemovalQueue.isEmpty()) {
          _removeActiveSupplier({supplierToRemove: supplier});
        }
      }
      ++allocationData.countOfRemovalsAllocated;
      if (remainingAmountToFill == 0) {
        break;
      }
    }
    if (remainingAmountToFill > 0) {
      revert InsufficientSupply();
    }
    allocationData.suppliers = new address[](
      allocationData.countOfRemovalsAllocated
    ).fill({value: supplier});
    return allocationData;
  }

  /**
   * @dev Updates `_currentSupplierAddress` to the next of whatever is the current supplier.
   * Used to iterate in a round-robin way through the linked list of active suppliers.
   */
  function _incrementCurrentSupplierAddress() private {
    _currentSupplierAddress = _suppliers[_currentSupplierAddress].next;
  }

  /**
   * @dev Adds a supplier to the active supplier queue. Called when a new supplier is added to the marketplace.
   * If the first supplier, initializes a circularly doubly-linked list, where initially the first supplier points
   * to itself as next and previous. When a new supplier is added, at the position of the current supplier, update
   * the previous pointer of the current supplier to point to the new supplier, and update the next pointer of the
   * previous supplier to the new supplier.
   *
   * Emits a `AddSupplier` event.
   * @param newSupplierAddress the address of the new supplier to add
   */
  function _addActiveSupplier(address newSupplierAddress) private {
    // If this is the first supplier to be added, update the initialized addresses.
    if (_currentSupplierAddress == address(0)) {
      _currentSupplierAddress = newSupplierAddress;
      _suppliers[newSupplierAddress] = LinkedListNode({
        previous: newSupplierAddress,
        next: newSupplierAddress
      });
      emit AddSupplier({
        added: newSupplierAddress,
        next: newSupplierAddress,
        previous: newSupplierAddress
      });
    } else {
      address previousOfCurrentSupplierAddress = _suppliers[
        _currentSupplierAddress
      ].previous;
      /**
       * Add the new supplier to the round robin order, with the current supplier as next and the current supplier's
       * previous supplier as previous.
       */
      _suppliers[newSupplierAddress] = LinkedListNode({
        next: _currentSupplierAddress,
        previous: previousOfCurrentSupplierAddress
      });
      /**
       * Update the previous supplier from the current supplier to point to the new supplier as next.
       */
      _suppliers[previousOfCurrentSupplierAddress].next = newSupplierAddress;
      /**
       * Update the current supplier to point to the new supplier as previous.
       */
      _suppliers[_currentSupplierAddress].previous = newSupplierAddress;
      emit AddSupplier({
        added: newSupplierAddress,
        next: _currentSupplierAddress,
        previous: previousOfCurrentSupplierAddress
      });
    }
  }

  /**
   * @dev Removes a supplier from the active supplier queue. Called when a supplier's last removal is used for an order.
   * If the last supplier, resets the pointer for the `_currentSupplierAddress`. Otherwise, from the position of the
   * supplier to be removed, update the previous supplier to point to the next of the removed supplier, and the next of
   * the removed supplier to point to the previous address of the removed supplier. Then, set the next and previous
   * pointers of the removed supplier to the 0x address.
   *
   * Emits a `RemoveSupplier` event.
   * @param supplierToRemove the address of the supplier to remove
   */
  function _removeActiveSupplier(address supplierToRemove) private {
    address previousOfRemovedSupplierAddress = _suppliers[supplierToRemove]
      .previous;
    address nextOfRemovedSupplierAddress = _suppliers[supplierToRemove].next;
    /**
     * If this is the last supplier, clear all current tracked addresses.
     */
    if (supplierToRemove == nextOfRemovedSupplierAddress) {
      _currentSupplierAddress = address(0);
    } else {
      /**
       * Set the next of the previous supplier to point to the removed supplier's next.
       */
      _suppliers[previousOfRemovedSupplierAddress]
        .next = nextOfRemovedSupplierAddress;
      /**
       * Set the previous address of the next supplier to point to the removed supplier's previous.
       */
      _suppliers[nextOfRemovedSupplierAddress]
        .previous = previousOfRemovedSupplierAddress;
      /**
       * If the supplier is the current supplier, update that address to the next supplier.
       */
      if (supplierToRemove == _currentSupplierAddress) {
        _incrementCurrentSupplierAddress();
      }
    }
    /**
     * Remove `LinkedListNode` data from supplier.
     */
    _suppliers[supplierToRemove] = LinkedListNode({
      next: address(0),
      previous: address(0)
    });
    emit RemoveSupplier({
      removed: supplierToRemove,
      next: nextOfRemovedSupplierAddress,
      previous: previousOfRemovedSupplierAddress
    });
  }
}
