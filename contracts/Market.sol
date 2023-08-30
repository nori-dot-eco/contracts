// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/MulticallUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "./AccessPresetPausable.sol";
import "./Certificate.sol";
import "./Errors.sol";
import "./IERC20WithPermit.sol";
import "./IMarket.sol";
import "./Removal.sol";
import "./RestrictedNORI.sol";

import {RemovalsByYearLib, RemovalsByYear} from "./RemovalsByYearLib.sol";
import {RemovalIdLib} from "./RemovalIdLib.sol";
import {UInt256ArrayLib, AddressArrayLib} from "./ArrayLib.sol";

/**
 * @title Nori Inc.'s carbon removal marketplace.
 * @author Nori Inc.
 * @notice Facilitates the exchange of ERC20 with permit tokens for a non-transferrable certificate of carbon removal.
 * @dev Carbon removals are represented by ERC1155 tokens in the Removal contract, where the balance of a
 * given token represents the number of tonnes of carbon that were removed from the atmosphere for that specific
 * removal (different token IDs are used to represent different slices of carbon removal projects and years).
 * This contract facilitates the exchange of ERC20 tokens for ERC721 tokens managed by the Certificate contract.
 * Each of these certificates is a non-transferrable, non-fungible token that owns the specific removal tokens
 * and token balances that comprise the specific certificate for the amount purchased.
 *
 * The market maintains a "priority restricted threshold", which is a configurable threshold of supply that is
 * always reserved to sell only to buyers who have the `ALLOWLIST_ROLE`.  Purchases that would drop supply below
 * this threshold will revert without the correct role.
 *
 * ###### Additional behaviors and features
 *
 * - [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
 * - [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all external functions that mutate
 * state are pausable.
 * - [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
 * - `MARKET_ADMIN_ROLE`: Can set the fee percentage, fee wallet address, and priority restricted threshold.
 * - `ALLOWLIST_ROLE`: Can purchase from priority restricted supply.
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
   * @param chargeFee Whether or not to charge the Nori fee.
   * @param feePercentage The fee percentage.
   * @param certificateAmount The total amount for the certificate.
   * @param from The message sender.
   * @param recipient The recipient of the certificate.
   * @param allocationData The removals, amounts, suppliers and count data returned
   * from the supply allocation algorithm.
   */
  struct FulfillOrderData {
    bool chargeFee;
    uint256 feePercentage;
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
   * @notice The IERC20WithPermit token used to purchase from this market.
   */
  IERC20WithPermit private _purchasingToken;

  /**
   * @notice The RestrictedNORI contract.
   */
  RestrictedNORI private _restrictedNORI;

  /**
   * @notice The number of base tokens required to purchase one NRT.
   * @dev This value is scaled by 100 to allow for decimal precision. For example, a value of 100 means
   * that 1 base token is required to purchase 1 NRT, while a value of 1995 means that 19.95 base tokens
   * purchase 1 NRT.
   */
  uint256 private _priceMultiple;

  /**
   * @notice Wallet address used for Nori's transaction fees.
   */
  address private _noriFeeWallet;

  /**
   * @notice Percentage of the base NRT cost that is additionally sent to Nori from every transaction.
   */
  uint256 private _noriFeePercentage;

  /**
   * @notice Amount of supply withheld for customers with a priority role.
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
   * @notice Role conferring the ability to configure Nori's fee wallet, the fee percentage, and the priority
   * restricted threshold.
   */
  bytes32 public constant MARKET_ADMIN_ROLE = keccak256("MARKET_ADMIN_ROLE");

  /**
   * @notice Role conferring the ability to purchase supply when inventory is below the priority restricted threshold.
   */
  bytes32 public constant ALLOWLIST_ROLE = keccak256("ALLOWLIST_ROLE");

  /**
   * @notice Emitted on setting of `_priorityRestrictedThreshold`.
   * @param threshold The updated threshold for priority restricted supply.
   */
  event SetPriorityRestrictedThreshold(uint256 threshold);

  /**
   * @notice Emitted on setting of `_purchasingToken`.
   * @param purchasingToken The updated address of the IERC20WithPermit token used to purchase from this market.
   */
  event SetPurchasingToken(IERC20WithPermit purchasingToken);

  /**
   * @notice Emitted on setting of `_priceMultiple`.
   * @param priceMultiple The updated price multiple.
   */
  event SetPriceMultiple(uint256 priceMultiple);

  /**
   * @notice Emitted on updating the addresses for contracts.
   * @param removal The address of the new Removal contract.
   * @param certificate The address of the new Certificate contract.
   * @param purchasingToken The address of the new IERC20WithPermit contract.
   * @param restrictedNORI The address of the new RestrictedNORI contract.
   */
  event RegisterContractAddresses(
    Removal removal,
    Certificate certificate,
    IERC20WithPermit purchasingToken,
    RestrictedNORI restrictedNORI
  );

  /**
   * @notice Emitted on setting of `_noriFeeWalletAddress`.
   * @param updatedWalletAddress The updated address of Nori's fee wallet.
   */
  event UpdateNoriFeeWalletAddress(address updatedWalletAddress);

  /**
   * @notice Emitted on setting of `_noriFeePercentage`.
   * @param updatedFeePercentage The updated fee percentage for Nori.
   */
  event UpdateNoriFeePercentage(uint256 updatedFeePercentage);

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
   * @notice Emitted when the call to RestrictedNORI.mint fails during a purchase.
   * For example, due to sending to a contract address that is not an ERC1155Receiver.
   * @param amount The amount of RestrictedNORI in the mint attempt.
   * @param removalId The removal id in the mint attempt.
   */
  event RestrictedNORIMintFailure(
    uint256 indexed amount,
    uint256 indexed removalId
  );

  /**
   * @notice Emitted when the ERC20 token that would be transferred to the RestrictedNORI contract is not the token
   * address that RestrictedNORI was configured to wrap.
   * @param amount The amount of _purchasingToken currency in the failed transfer attempt.
   * @param currentHoldbackPercentage The holdback percentage for this removal id's project at the time of this event
   * emission.
   * @param removalId The removal id being processed during the transfer attempt.
   * @param rNoriUnderlyingToken The address of the token contract that RestrictedNORI was configured to wrap.
   * @param purchasingTokenAddress The address of the ERC20 token that would have been transferred to RestrictedNORI.
   */
  event SkipRestrictedNORIERC20Transfer(
    uint256 indexed amount,
    uint256 indexed removalId,
    uint256 currentHoldbackPercentage,
    address rNoriUnderlyingToken,
    address purchasingTokenAddress
  );

  /**
   * @notice Emitted when replacement removals are sent to this contract on behalf of an existing certificate.
   * @param certificateId The certificate id that was updated.
   * @param removalIds The removal ids that were added to the certificate.
   * @param amounts The amount of each removal id that were added to the certificate.
   * @param removalIdsBeingReplaced The removal ids that were released from the certificate.
   * @param amountsBeingReplaced The amount of each removal id that was released from the certificate.
   * @param purchasingTokenAddress The address of the token used to purchase the replacement removals.
   * @param priceMultiple The number of purchasing tokens required to buy one NRT.
   */
  event UpdateCertificate(
    uint256 indexed certificateId,
    uint256[] removalIds,
    uint256[] amounts,
    uint256[] removalIdsBeingReplaced,
    uint256[] amountsBeingReplaced,
    address indexed purchasingTokenAddress,
    uint256 priceMultiple
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
   * @dev Reverts if `_noriFeeWallet` is not set.
   * @param removal The address of the Removal contract.
   * @param purchasingToken The address of the IERC20WithPermit token used to purchase from this market.
   * @param certificate The address of the Certificate contract.
   * @param restrictedNori The address of the RestrictedNORI contract.
   * @param noriFeeWalletAddress The address for Nori's fee wallet.
   * @param noriFeePercentage_ The percentage to take from every transaction. This fee is sent to the address
   * specified by `noriFeeWalletAddress`.
   * @param priceMultiple_ The number of base tokens required to purchase one NRT.
   */
  function initialize(
    Removal removal,
    IERC20WithPermit purchasingToken,
    Certificate certificate,
    RestrictedNORI restrictedNori,
    address noriFeeWalletAddress,
    uint256 noriFeePercentage_,
    uint256 priceMultiple_
  ) external initializer {
    if (noriFeeWalletAddress == address(0)) {
      revert NoriFeeWalletZeroAddress();
    }
    __Context_init_unchained();
    __ERC165_init_unchained();
    __Pausable_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    __Multicall_init_unchained();
    _removal = removal;
    _certificate = certificate;
    _restrictedNORI = restrictedNori;
    _noriFeePercentage = noriFeePercentage_;
    _noriFeeWallet = noriFeeWalletAddress;
    _priorityRestrictedThreshold = 0;
    _currentSupplierAddress = address(0);
    _setPurchasingToken({purchasingToken: purchasingToken});
    _setPriceMultiple({priceMultiple: priceMultiple_});
    _grantRole({role: DEFAULT_ADMIN_ROLE, account: _msgSender()});
    _grantRole({role: ALLOWLIST_ROLE, account: _msgSender()});
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
    uint256[] memory removalIds = allocationData.ids.slice({
      from: 0,
      to: countOfRemovalsAllocated
    });
    uint256[] memory removalAmounts = allocationData.amounts.slice({
      from: 0,
      to: countOfRemovalsAllocated
    });
    _validateReplacementAmounts({
      totalAmountToReplace: totalAmountToReplace,
      removalAmounts: removalAmounts,
      removalAmountsBeingReplaced: amountsBeingReplaced
    });
    _transferFunds({
      chargeFee: false,
      from: treasury,
      countOfRemovalsAllocated: countOfRemovalsAllocated,
      ids: removalIds,
      amounts: removalAmounts,
      suppliers: allocationData.suppliers
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
      amountsBeingReplaced: amountsBeingReplaced,
      purchasingTokenAddress: address(_purchasingToken),
      priceMultiple: _priceMultiple
    });
  }

  /**
   * @notice Register the market contract's asset addresses.
   * @dev Register the Removal, Certificate, IERC20WithPermit, and RestrictedNORI contracts so that they
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
   * @param purchasingToken The address of the IERC20WithPermit token used to purchase from this market.
   * @param restrictedNORI The address of the market contract.
   */
  function registerContractAddresses(
    Removal removal,
    Certificate certificate,
    IERC20WithPermit purchasingToken,
    RestrictedNORI restrictedNORI
  ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
    _removal = removal;
    _certificate = certificate;
    _purchasingToken = purchasingToken;
    _restrictedNORI = restrictedNORI;
    emit RegisterContractAddresses({
      removal: _removal,
      certificate: _certificate,
      purchasingToken: _purchasingToken,
      restrictedNORI: _restrictedNORI
    });
  }

  /**
   * @notice Set the purchasing token contract address, an IERC20WithPermit token used to purchase from this market,
   * and the price multiple, which is the number of tokens required to purchase one NRT.
   * @dev Emits a `SetPurchasingToken` event and a `SetPriceMultiple` event.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
   * - Can only be used when this contract is not paused.
   * @param purchasingToken The new purchasing token contract address.
   * @param priceMultiple The new price multiple.
   */
  function setPurchasingTokenAndPriceMultiple(
    IERC20WithPermit purchasingToken,
    uint256 priceMultiple
  ) external whenNotPaused onlyRole(MARKET_ADMIN_ROLE) {
    _setPurchasingToken({purchasingToken: purchasingToken});
    _setPriceMultiple({priceMultiple: priceMultiple});
  }

  /**
   * @notice Sets the current value of the priority restricted threshold, which is the amount of inventory
   * that will always be reserved to sell only to buyers with the `ALLOWLIST_ROLE` role.
   * @dev Emits a `SetPriorityRestrictedThreshold` event.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
   * - Can only be used when this contract is not paused.
   * @param threshold The updated priority restricted threshold
   */
  function setPriorityRestrictedThreshold(
    uint256 threshold
  ) external whenNotPaused onlyRole(MARKET_ADMIN_ROLE) {
    _priorityRestrictedThreshold = threshold;
    emit SetPriorityRestrictedThreshold({threshold: threshold});
  }

  /**
   * @notice Sets the fee percentage (as an integer) which is the percentage of each purchase that will be paid to Nori
   * as the marketplace operator.
   * @dev Emits a `UpdateNoriFeePercentage` event.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
   * - Can only be used when this contract is not paused.
   * @param noriFeePercentage_ The new fee percentage as an integer.
   */
  function setNoriFeePercentage(
    uint256 noriFeePercentage_
  ) external onlyRole(MARKET_ADMIN_ROLE) whenNotPaused {
    if (noriFeePercentage_ > 100) {
      revert InvalidNoriFeePercentage();
    }
    _noriFeePercentage = noriFeePercentage_;
    emit UpdateNoriFeePercentage({updatedFeePercentage: noriFeePercentage_});
  }

  /**
   * @notice Sets Nori's fee wallet address (as an integer) which is the address to which the
   * marketplace operator fee will be routed during each purchase.
   * @dev Emits a `UpdateNoriFeeWalletAddress` event.
   *
   * ##### Requirements:
   *
   * - Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
   * - Can only be used when this contract is not paused.
   * @param noriFeeWalletAddress The wallet address where Nori collects market fees.
   */
  function setNoriFeeWallet(
    address noriFeeWalletAddress
  ) external onlyRole(MARKET_ADMIN_ROLE) whenNotPaused {
    if (noriFeeWalletAddress == address(0)) {
      revert NoriFeeWalletZeroAddress();
    }
    _noriFeeWallet = noriFeeWalletAddress;
    emit UpdateNoriFeeWalletAddress({
      updatedWalletAddress: noriFeeWalletAddress
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
   * certificate. Relies on the EIP-2612 permit extension to facilitate ERC20 token transfer.
   * @dev See [ERC20Permit](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Permit) for more.
   * The message sender must present a valid permit to this contract to temporarily authorize this market
   * to transfer the permit owner's ERC20 to complete the purchase. A certificate is minted in the Certificate contract
   * to the specified recipient and the ERC20 is distributed to the suppliers of the carbon removals,
   * to the RestrictedNORI contract that controls any restricted tokens owed to the suppliers, and finally
   * to Nori Inc. as a market operator fee.
   *
   * ##### Requirements:
   *
   * - Can only be used when this contract is not paused.
   * @param recipient The address to which the certificate will be issued.
   * @param permitOwner The address that signed the EIP2612 permit and will pay for the removals.
   * @param amount The total amount of Removals being purchased.
   * @param deadline The EIP2612 permit deadline in Unix time.
   * @param v The recovery identifier for the permit's secp256k1 signature.
   * @param r The r value for the permit's secp256k1 signature.
   * @param s The s value for the permit's secp256k1 signature.
   */
  function swap(
    address recipient,
    address permitOwner,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external whenNotPaused {
    _validateCertificateAmount({amount: amount});
    SupplyAllocationData memory allocationData = _allocateRemovals({
      purchaser: _msgSender(),
      certificateAmount: amount
    });
    _permit({
      owner: permitOwner,
      amount: this.calculateCheckoutTotal({amount: amount}),
      deadline: deadline,
      v: v,
      r: r,
      s: s
    });
    _fulfillOrder({
      orderData: FulfillOrderData({
        chargeFee: true,
        feePercentage: _noriFeePercentage,
        certificateAmount: amount,
        from: permitOwner,
        recipient: recipient,
        allocationData: allocationData
      })
    });
  }

  /**
   * @notice Exchange ERC20 tokens for an ERC721 certificate by transferring ownership of the removals to the
   * certificate. Relies on pre-approval of this market by the transaction sender to transfer the sender's tokens.
   * @dev See [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20-approve-address-uint256-)
   * for more.
   * The sender must have granted approval to this contract to authorize this market to transfer their
   * supported ERC20 to complete the purchase. A certificate is minted in the Certificate contract
   * to the specified recipient and the ERC20 tokens are distributed to the supplier(s) of the carbon removals,
   * to the RestrictedNORI contract that controls any restricted tokens owed to the suppliers, and finally
   * to Nori Inc. as a market operator fee.
   *
   * ##### Requirements:
   *
   * - Can only be used when this contract is not paused.
   * - Can only be used if this contract has been granted approval to transfer the sender's ERC20 tokens.
   * @param recipient The address to which the certificate will be issued.
   * @param amount The total amount of Removals to purchase.
   */
  function swap(address recipient, uint256 amount) external whenNotPaused {
    _validateCertificateAmount({amount: amount});
    SupplyAllocationData memory allocationData = _allocateRemovals({
      purchaser: _msgSender(),
      certificateAmount: amount
    });
    _fulfillOrder({
      orderData: FulfillOrderData({
        chargeFee: true,
        feePercentage: _noriFeePercentage,
        certificateAmount: amount,
        from: _msgSender(),
        recipient: recipient,
        allocationData: allocationData
      })
    });
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
   * @param customFee The fee percentage that was paid to Nori off chain, as an integer, specified here
   * for inclusion in emitted events.
   * @param customPriceMultiple The price that will be charged for this transaction.
   * @param supplier The only supplier address from which to purchase carbon removals in this transaction, or
   * zero address if any supplier is valid.
   * @param vintages The valid set of vintages from which to fulfill this order, empty if any vintage is valid.
   */
  function swapWithoutFeeSpecialOrder(
    address recipient,
    address purchaser,
    uint256 amount,
    uint256 customFee,
    uint256 customPriceMultiple,
    address supplier,
    uint256[] memory vintages
  ) external whenNotPaused onlyRole(MARKET_ADMIN_ROLE) {
    uint256 currentPrice = _priceMultiple;
    _priceMultiple = customPriceMultiple;
    _validateCertificateAmount({amount: amount});
    SupplyAllocationData memory allocationData = _allocateRemovalsSpecialOrder({
      certificateAmount: amount,
      supplier: supplier,
      vintages: vintages
    });
    _fulfillOrder({
      orderData: FulfillOrderData({
        chargeFee: false,
        feePercentage: customFee,
        certificateAmount: amount,
        from: purchaser,
        recipient: recipient,
        allocationData: allocationData
      })
    });
    _priceMultiple = currentPrice;
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
   * @notice Get the current value of the price multiple, which is the number of base tokens required to
   * purchase one NRT.
   */
  function getPriceMultiple() external view returns (uint256) {
    return _priceMultiple;
  }

  /**
   * @notice Returns the current value of the priority restricted threshold, which is the amount of inventory
   * that will always be reserved to sell only to buyers with the `ALLOWLIST_ROLE` role.
   * @return The threshold of supply allowed for priority customers only.
   */
  function getPriorityRestrictedThreshold() external view returns (uint256) {
    return _priorityRestrictedThreshold;
  }

  /**
   * @notice Returns the current value of the fee percentage, as an integer, which is the percentage of
   * each purchase that will be paid to Nori as the marketplace operator.
   * @return The percentage of each purchase that will be paid to Nori as the marketplace operator.
   */
  function getNoriFeePercentage() external view returns (uint256) {
    return _noriFeePercentage;
  }

  /**
   * @notice Returns the address to which the marketplace operator fee will be routed during each purchase.
   * @return The wallet address used for Nori's fees.
   */
  function getNoriFeeWallet() external view returns (address) {
    return _noriFeeWallet;
  }

  /**
   * @notice Calculates the Nori fee required for a purchase of `amount` tonnes of carbon removals.
   * @param amount The amount of carbon removals for the purchase.
   * @return The amount of the fee charged by Nori in `_purchasingToken`.
   */
  function calculateNoriFee(uint256 amount) external view returns (uint256) {
    return
      this.convertRemovalDecimalsToPurchasingTokenDecimals(
        amount.mulDiv({
          y: _priceMultiple * _noriFeePercentage,
          denominator: 10_000
        })
      );
  }

  /**
   * @notice Convert an amount of removals into an equivalent amount expressed in the purchasing token's decimals.
   * @dev If the purchasing token's decimals is not 18, we need to convert the `removalAmount` (which is expressed with
   * 18 decimals) to a unit that is expressed in the purchasing token's decimals. For example, if `removalAmount` is
   * 1 ether (18 decimals) and the purchasing token's decimals is 6, the return value would be 1,000,000.
   * @param removalAmount The amount of removals to express in the purchasing token's decimals.
   * @return The amount of purchasing tokens required to purchase the specified amount of removals.
   */
  function convertRemovalDecimalsToPurchasingTokenDecimals(
    uint256 removalAmount
  ) external view returns (uint256) {
    uint256 decimals = _purchasingToken.decimals();
    if (decimals == 18) {
      return removalAmount;
    }
    uint256 decimalDelta = 18 - decimals;
    return removalAmount / 10 ** decimalDelta;
  }

  /**
   * @notice Convert an amount of purchasing tokens into an equivalent amount expressed with 18 decimals.
   * @dev If the purchasing token's decimal precision is different from 18, we need to perform a conversion to match the
   * precision of the removal token, which has 18 decimal places. For instance, if the `purchasingTokenAmount` is
   * 1,000,000 (expressed with 6 decimals), the return value would be 1 ether (expressed with 18 decimals).
   * @param purchasingTokenAmount The amount of purchasing tokens to express in the removal's decimals.
   * @return The amount of purchasing tokens required to purchase the specified amount of removals.
   */
  function convertPurchasingTokenDecimalsToRemovalDecimals(
    uint256 purchasingTokenAmount
  ) external view returns (uint256) {
    uint256 decimals = _purchasingToken.decimals();
    if (decimals == 18) {
      return purchasingTokenAmount;
    }
    uint256 decimalDelta = 18 - decimals;
    return purchasingTokenAmount * 10 ** decimalDelta;
  }

  /**
   * @notice Calculates the total quantity of ERC20 tokens required to make a purchase of the specified `amount` (in
   * tonnes of carbon removals).
   * @param amount The amount of carbon removals for the purchase.
   * @return The total quantity of the `_purchaseToken` required to make the purchase.
   */
  function calculateCheckoutTotal(
    uint256 amount
  ) external view returns (uint256) {
    _validateCertificateAmount({amount: amount});
    return
      this.convertRemovalDecimalsToPurchasingTokenDecimals(
        amount.mulDiv({y: _priceMultiple, denominator: 100})
      ) + this.calculateNoriFee({amount: amount});
  }

  /**
   * @notice Calculates the total quantity of ERC20 tokens required to make a purchase of the specified `amount` (in
   * tonnes of carbon removals) without a transaction fee.
   * @param amount The amount of carbon removals for the purchase.
   * @param priceMultiple The price multiple to use for the calculation.
   * @return The total quantity of ERC20 tokens required to make the purchase, excluding the fee.
   */
  function calculateCheckoutTotalWithoutFee(
    uint256 amount,
    uint256 priceMultiple
  ) external view returns (uint256) {
    _validateCertificateAmount({amount: amount});
    return
      this.convertRemovalDecimalsToPurchasingTokenDecimals(
        amount.mulDiv({y: priceMultiple, denominator: 100})
      );
  }

  /**
   * @notice Calculates the quantity of carbon removals that can be purchased given some payment amount taking into
   * account NRT price and fees (i.e., I have $100 (100_000_000 USDC), how many NRTs can I buy?).
   * @param purchaseTotal The total number of `_purchasingToken`s used for a purchase.
   * @return Amount for the certificate, excluding the transaction fee.
   */
  function calculateCertificateAmountFromPurchaseTotal(
    uint256 purchaseTotal
  ) external view returns (uint256) {
    return
      this
        .convertPurchasingTokenDecimalsToRemovalDecimals({
          purchasingTokenAmount: purchaseTotal
        })
        .mulDiv({
          y: 10_000,
          denominator: (100 + _noriFeePercentage) * _priceMultiple
        });
  }

  /**
   * @notice Calculates the quantity of carbon removals that can be purchased given some payment amount taking into
   * account NRT price but excluding fees (i.e., I have $100 (100_000_000 USDC), how many NRTs can I buy?).
   * @param purchaseTotal The total number of `_purchasingToken`s used for a purchase.
   * @return Amount for the certificate.
   */
  function calculateCertificateAmountFromPurchaseTotalWithoutFee(
    uint256 purchaseTotal
  ) external view returns (uint256) {
    return
      this
        .convertPurchasingTokenDecimalsToRemovalDecimals({
          purchasingTokenAmount: purchaseTotal
        })
        .mulDiv({y: 10_000, denominator: 100 * _priceMultiple});
  }

  /**
   * @notice Get the Removal contract address.
   * @return Returns the address of the Removal contract.
   */
  function getRemovalAddress() external view returns (address) {
    return address(_removal);
  }

  /**
   * @notice Get the RestrictedNORI contract address.
   * @return Returns the address of the RestrictedNORI contract.
   */
  function getRestrictedNoriAddress() external view override returns (address) {
    return address(_restrictedNORI);
  }

  /**
   * @notice Get the Certificate contract address.
   * @return Returns the address of the Certificate contract.
   */
  function getCertificateAddress() external view returns (address) {
    return address(_certificate);
  }

  /**
   * @notice Get the contract address of the IERC20WithPermit token used to purchase from this market.
   * @return Returns the address of the IERC20WithPermit contract.
   */
  function getPurchasingTokenAddress() external view returns (address) {
    return address(_purchasingToken);
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
   * @notice Set the purchasing token contract address, an IERC20WithPermit token used to purchase from this market.
   * @param purchasingToken The new purchasing token contract address.
   */
  function _setPurchasingToken(IERC20WithPermit purchasingToken) internal {
    uint8 decimals = purchasingToken.decimals();
    if (decimals > 18 || decimals < 6) {
      revert InvalidPurchasingTokenDecimals({decimals: decimals});
    }
    _purchasingToken = IERC20WithPermit(purchasingToken);
    emit SetPurchasingToken({purchasingToken: purchasingToken});
  }

  /**
   * @notice Set the price multiple, which is the number of base tokens required to purchase one NRT.
   * @dev This value is scaled by 100 to allow for decimal precision. For example, a value of 100 means
   * that 1 base token is required to purchase 1 NRT, while a value of 1995 means that 19.95 base tokens
   * purchase 1 NRT.
   * @param priceMultiple The new price multiple.
   */
  function _setPriceMultiple(uint256 priceMultiple) internal {
    _priceMultiple = priceMultiple;
    emit SetPriceMultiple({priceMultiple: priceMultiple});
  }

  /**
   * @notice Pays the suppliers for the removals being purchased, routes funds to the RestrictedNORI contract if
   * necessary, and pays a fee to Nori if `chargeFee` is true.
   * @param chargeFee Whether to charge a transaction fee for Nori.
   * @param from The address of the spender.
   * @param countOfRemovalsAllocated The number of removals being purchased.
   * @param ids The IDs of the removals being purchased.
   * @param amounts The amounts of each removal being purchased.
   * @param suppliers The suppliers who own each removal being purchased.
   */
  function _transferFunds(
    bool chargeFee,
    address from,
    uint256 countOfRemovalsAllocated,
    uint256[] memory ids,
    uint256[] memory amounts,
    address[] memory suppliers
  ) internal {
    bool isTransferSuccessful;
    uint8 holdbackPercentage;
    uint256 restrictedSupplierFee;
    uint256 unrestrictedSupplierFee;
    for (uint256 i = 0; i < countOfRemovalsAllocated; ++i) {
      holdbackPercentage = _removal.getHoldbackPercentage({id: ids[i]});
      unrestrictedSupplierFee = this
        .convertRemovalDecimalsToPurchasingTokenDecimals(
          amounts[i].mulDiv({y: _priceMultiple, denominator: 100})
        );
      if (holdbackPercentage > 0) {
        restrictedSupplierFee = this
          .convertRemovalDecimalsToPurchasingTokenDecimals(
            amounts[i].mulDiv({
              y: _priceMultiple * holdbackPercentage,
              denominator: 10_000
            })
          );
        unrestrictedSupplierFee -= restrictedSupplierFee;
        if (
          _restrictedNORI.getUnderlyingTokenAddress() !=
          address(_purchasingToken)
        ) {
          emit SkipRestrictedNORIERC20Transfer({
            amount: restrictedSupplierFee,
            removalId: ids[i],
            currentHoldbackPercentage: holdbackPercentage,
            rNoriUnderlyingToken: _restrictedNORI.getUnderlyingTokenAddress(),
            purchasingTokenAddress: address(_purchasingToken)
          });
          unrestrictedSupplierFee =
            unrestrictedSupplierFee +
            restrictedSupplierFee; // transfer all purchasing token to supplier
        } else {
          try
            _restrictedNORI.mint({
              amount: restrictedSupplierFee,
              removalId: ids[i]
            })
          {
            {
              // solhint-disable-previous-line no-empty-blocks, Nothing should happen here.
            }
          } catch {
            emit RestrictedNORIMintFailure({
              amount: restrictedSupplierFee,
              removalId: ids[i]
            });
            _restrictedNORI.incrementDeficitForSupplier({
              amount: restrictedSupplierFee,
              originalSupplier: suppliers[i]
            });
          }
          isTransferSuccessful = _purchasingToken.transferFrom({
            from: from,
            to: address(_restrictedNORI),
            amount: restrictedSupplierFee
          });
          if (!isTransferSuccessful) {
            revert ERC20TransferFailed();
          }
        }
      }
      if (chargeFee) {
        isTransferSuccessful = _purchasingToken.transferFrom({
          from: from,
          to: _noriFeeWallet,
          amount: this.calculateNoriFee({amount: amounts[i]})
        });
        if (!isTransferSuccessful) {
          revert ERC20TransferFailed();
        }
      }
      isTransferSuccessful = _purchasingToken.transferFrom({
        from: from,
        to: suppliers[i],
        amount: unrestrictedSupplierFee
      });
      if (!isTransferSuccessful) {
        revert ERC20TransferFailed();
      }
    }
  }

  /**
   * @notice Fulfill an order.
   * @dev This function is responsible for paying suppliers, routing tokens to the RestrictedNORI contract, paying Nori
   * the order fee, updating accounting, and minting the Certificate.
   * @param orderData The order fulfillment data.
   */
  function _fulfillOrder(FulfillOrderData memory orderData) internal {
    uint256[] memory removalIds = orderData.allocationData.ids.slice({
      from: 0,
      to: orderData.allocationData.countOfRemovalsAllocated
    });
    uint256[] memory removalAmounts = orderData.allocationData.amounts.slice({
      from: 0,
      to: orderData.allocationData.countOfRemovalsAllocated
    });
    _transferFunds({
      chargeFee: orderData.chargeFee,
      from: orderData.from,
      countOfRemovalsAllocated: orderData
        .allocationData
        .countOfRemovalsAllocated,
      ids: removalIds,
      amounts: removalAmounts,
      suppliers: orderData.allocationData.suppliers
    });
    bytes memory data = abi.encode(
      false,
      orderData.recipient,
      orderData.certificateAmount,
      address(_purchasingToken),
      _priceMultiple,
      orderData.feePercentage
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
   * or zero address if any supplier is valid.
   * @param vintages A set of valid vintages from which to allocate removals, empty if any vintage is valid.
   * @return SupplyAllocationData The removals, amounts, suppliers and count data returned
   * from the supply allocation algorithm.
   */
  function _allocateRemovalsSpecialOrder(
    uint256 certificateAmount,
    address supplier,
    uint256[] memory vintages
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
   * @param purchaser The address of the purchaser.
   * @param certificateAmount The total amount for the certificate.
   * @return SupplyAllocationData The removals, amounts, suppliers and count data returned
   * from the supply allocation algorithm.
   */
  function _allocateRemovals(
    address purchaser,
    uint256 certificateAmount
  ) internal returns (SupplyAllocationData memory) {
    uint256 availableSupply = _removal.getMarketBalance();
    _validateSupply({
      certificateAmount: certificateAmount,
      availableSupply: availableSupply
    });
    _validatePrioritySupply({
      purchaser: purchaser,
      certificateAmount: certificateAmount,
      availableSupply: availableSupply
    });
    SupplyAllocationData memory allocationData = _allocateSupply({
      amount: certificateAmount
    });
    return allocationData;
  }

  /**
   * @notice Permits the transfer of an amount of tokens.
   * @dev This function is responsible permitting the transfer of ERC20 tokens.
   * @param owner The owner of the tokens being transferred.
   * @param amount The total purchase amount in ERC20 tokens. This is the combined total price of the removals being
   * purchased and the fee paid to Nori.
   * @param deadline The EIP2612 permit deadline in Unix time.
   * @param v The recovery identifier for the permit's secp256k1 signature.
   * @param r The r value for the permit's secp256k1 signature.
   * @param s The s value for the permit's secp256k1 signature.
   */
  function _permit(
    address owner,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal {
    _purchasingToken.permit({
      owner: owner,
      spender: address(this),
      value: amount,
      deadline: deadline,
      v: v,
      r: r,
      s: s
    });
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
   * @notice Validates the certificate purchase amount.
   * @dev Check if a certificate amount is valid according to the requirements criteria.
   *
   * ##### Requirements:
   *
   * - Amount is not zero.
   * - Amount is divisible by 10^(18 - `_purchasingToken.decimals()` + 2). This requirement means that the smallest
   * purchase amount for a token with 18 decimals (e.g., NORI) is 100, whilst the smallest purchase amount for a token
   * with 6 decimals (e.g., USDC) is 100,000,000,000,000.
   * @param amount The proposed certificate purchase amount.
   */
  function _validateCertificateAmount(uint256 amount) internal view {
    uint256 feeDecimals = 2;
    uint256 safeDecimals = 18 - _purchasingToken.decimals() + feeDecimals;
    if (amount == 0 || (amount % (10 ** (safeDecimals))) != 0) {
      revert InvalidCertificateAmount({amount: amount});
    }
  }

  /**
   * @notice Validates that the listed supply is enough to fulfill the purchase given the priority restricted threshold.
   * @dev Reverts if available stock is being reserved for priority buyers and buyer is not priority.
   * @param purchaser The address of the buyer.
   * @param certificateAmount The number of carbon removals being purchased.
   * @param availableSupply The amount of listed supply in the market.
   */
  function _validatePrioritySupply(
    address purchaser,
    uint256 certificateAmount,
    uint256 availableSupply
  ) internal view {
    (, uint256 supplyAfterPurchase) = SafeMathUpgradeable.trySub({
      a: availableSupply,
      b: certificateAmount
    });
    if (supplyAfterPurchase < _priorityRestrictedThreshold) {
      if (!hasRole({role: ALLOWLIST_ROLE, account: purchaser})) {
        revert LowSupplyAllowlistRequired();
      }
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
    uint256 latestYear = supplierRemovalQueue.latestYear;
    for (
      uint256 vintage = supplierRemovalQueue.earliestYear;
      vintage <= latestYear;
      ++vintage
    ) {
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
      remainingAmountToFill -= amountUsedFromRemoval;
      if (amountUsedFromRemoval == removalAmount) {
        if (
          allocationData.countOfRemovalsAllocated ==
          countOfListedRemovals - 1 &&
          remainingAmountToFill > removalAmount
        ) {
          revert InsufficientSupply();
        }
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
    uint256[] memory vintages
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
    uint256[] memory vintages
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
