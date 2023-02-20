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
   * @param certificateAmount The total amount for the certificate.
   * @param from The message sender.
   * @param recipient The recipient of the certificate.
   * @param countOfRemovalsAllocated The number of distinct removal IDs that are involved in fulfilling this order.
   * @param ids An array of removal IDs involved in fulfilling this order.
   * @param amounts An array of amounts being allocated from each corresponding removal token.
   * @param suppliers An array of suppliers.
   */
  struct FulfillOrderData {
    bool chargeFee;
    uint256 certificateAmount;
    address from;
    address recipient;
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
   * @notice The number of decimals configure on the _purchasingToken contract.
   * Used to adapt between Removal amounts and payment token amounts.
   */
  uint8 private _purchasingTokenDecimals;

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
  event SetPurchasingToken(IERC20WithPermit purchasingToken, uint8 decimals);

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
    uint8 purchasingTokenDecimals,
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
   * @param amount The amount of RestrictedNORI in the transfer attempt.
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
    uint8 purchasingTokenDecimals,
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
    _setPurchasingToken({
      purchasingToken: purchasingToken,
      decimals: purchasingTokenDecimals
    });
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
   *
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
    if (_certificate.getPurchaseAmount(certificateId) == 0) {
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
    (
      uint256 countOfRemovalsAllocated,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    ) = _allocateSupply({amount: totalAmountToReplace});

    uint256[] memory removalIds = ids.slice({
      from: 0,
      to: countOfRemovalsAllocated
    });
    uint256[] memory removalAmounts = amounts.slice({
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
      suppliers: suppliers
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
    uint8 purchasingTokenDecimals,
    RestrictedNORI restrictedNORI
  ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
    _removal = removal;
    _certificate = certificate;
    _purchasingToken = purchasingToken;
    _purchasingTokenDecimals = purchasingTokenDecimals;
    _restrictedNORI = restrictedNORI;
    emit RegisterContractAddresses({
      removal: _removal,
      certificate: _certificate,
      purchasingToken: _purchasingToken,
      purchasingTokenDecimals: _purchasingTokenDecimals,
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
    uint8 purchasingTokenDecimals,
    uint256 priceMultiple
  ) external whenNotPaused onlyRole(MARKET_ADMIN_ROLE) {
    _setPurchasingToken({
      purchasingToken: purchasingToken,
      decimals: purchasingTokenDecimals
    });
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
  function setPriorityRestrictedThreshold(uint256 threshold)
    external
    whenNotPaused
    onlyRole(MARKET_ADMIN_ROLE)
  {
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
  function setNoriFeePercentage(uint256 noriFeePercentage_)
    external
    onlyRole(MARKET_ADMIN_ROLE)
    whenNotPaused
  {
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
  function setNoriFeeWallet(address noriFeeWalletAddress)
    external
    onlyRole(MARKET_ADMIN_ROLE)
    whenNotPaused
  {
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
   * @param amount The total amount iof Removals being purchased. This is the combined total price of the removals being
   * purchased and the fee paid to Nori. (See calculateCheckoutTotal())
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
    uint256 certificateAmount = amount;
    (
      uint256 countOfRemovalsAllocated,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    ) = _allocateRemovals({
        purchaser: _msgSender(),
        certificateAmount: certificateAmount
      });
    _permit({
      owner: permitOwner,
      amount: calculateCheckoutTotal(amount),
      deadline: deadline,
      v: v,
      r: r,
      s: s
    });
    _fulfillOrder({
      params: FulfillOrderData({
        chargeFee: true,
        certificateAmount: certificateAmount,
        from: permitOwner,
        recipient: recipient,
        countOfRemovalsAllocated: countOfRemovalsAllocated,
        ids: ids,
        amounts: amounts,
        suppliers: suppliers
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
   * @param amount The total amount of Removals to purchase. This is the combined total price of the removals being
   * purchased and the fee paid to Nori.
   */
  function swap(address recipient, uint256 amount) external whenNotPaused {
    uint256 certificateAmount = amount;
    (
      uint256 countOfRemovalsAllocated,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    ) = _allocateRemovals({
        purchaser: _msgSender(),
        certificateAmount: certificateAmount
      });
    _fulfillOrder({
      params: FulfillOrderData({
        chargeFee: true,
        certificateAmount: certificateAmount,
        from: _msgSender(),
        recipient: recipient,
        countOfRemovalsAllocated: countOfRemovalsAllocated,
        ids: ids,
        amounts: amounts,
        suppliers: suppliers
      })
    });
  }

  /**
   * @notice An overloaded version of `swap` that additionally accepts a supplier address and will exchange
   * IERC20WithPermit tokens for an ERC721 certificate token and transfers ownership of removal tokens supplied only
   * from the specified supplier to that certificate. If the specified supplier does not have enough carbon removals
   * for sale to fulfill the order the transaction will revert.
   * @dev See [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Permit) for more.
   * The message sender must present a valid permit to this contract to temporarily authorize this market
   * to transfer the sender's IERC20WithPermit to complete the purchase. A certificate is issued by the Certificate
   * contract to the specified recipient and the ERC20 is distributed to the supplier of the carbon removal,
   * to the RestrictedNORI contract that controls any restricted ERC20 owed to the supplier, and finally
   * to Nori Inc. as a market operator fee.
   *
   * ##### Requirements:
   *
   * - Can only be used when this contract is not paused.
   * @param recipient The address to which the certificate will be issued.
   * @param permitOwner The address that signed the EIP2612 permit and will pay for the removals.
   * @param amount The total purchase amount in ERC20 tokens. This is the combined total price of the removals being
   * purchased and the fee paid to Nori.
   * @param supplier The only supplier address from which to purchase carbon removals in this transaction.
   * @param deadline The EIP2612 permit deadline in Unix time.
   * @param v The recovery identifier for the permit's secp256k1 signature.
   * @param r The r value for the permit's secp256k1 signature.
   * @param s The s value for the permit's secp256k1 signature.
   */
  function swapFromSupplier(
    address recipient,
    address permitOwner,
    uint256 amount,
    address supplier,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external whenNotPaused {
    uint256 certificateAmount = amount;
    (
      uint256 countOfRemovalsAllocated,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    ) = _allocateRemovalsFromSupplier({
        purchaser: permitOwner,
        certificateAmount: certificateAmount,
        supplier: supplier
      });
    _permit({
      owner: permitOwner,
      amount: calculateCheckoutTotal(amount),
      deadline: deadline,
      v: v,
      r: r,
      s: s
    });
    _fulfillOrder({
      params: FulfillOrderData({
        chargeFee: true,
        certificateAmount: certificateAmount,
        from: permitOwner,
        recipient: recipient,
        countOfRemovalsAllocated: countOfRemovalsAllocated,
        ids: ids,
        amounts: amounts,
        suppliers: suppliers
      })
    });
  }

  /**
   * @notice An overloaded version of `swap` that additionally accepts a supplier address and will exchange
   * ERC20 tokens for an ERC721 certificate token and transfers ownership of removal tokens supplied only
   * from the specified supplier to that certificate. If the specified supplier does not have enough carbon removals
   * for sale to fulfill the order the transaction will revert.
   * @dev See [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20-approve-address-uint256-)
   * for more.
   * The sender must have already granted approval to this contract in order to transfer their ERC20 tokens to
   * complete the purchase. A certificate is issued by the Certificate contract to the specified recipient and the
   * ERC20 tokens are distributed to the supplier of the carbon removal, to the RestrictedNORI contract that controls
   * any restricted ERC20 tokens owed to the supplier, and finally to Nori Inc. as a market operator fee.
   *
   * ##### Requirements:
   *
   * - Can only be used when this contract is not paused.
   * - Can only be used if this contract has been granted approval to transfer the sender's ERC20 tokens.
   * @param recipient The address to which the certificate will be issued.
   * @param amount The total purchase amount in ERC20 tokens. This is the combined total price of the removals being
   * purchased and the fee paid to Nori.
   * @param supplier The only supplier address from which to purchase carbon removals in this transaction.
   */
  function swapFromSupplier(
    address recipient,
    uint256 amount,
    address supplier
  ) external whenNotPaused {
    uint256 certificateAmount = amount;
    (
      uint256 countOfRemovalsAllocated,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    ) = _allocateRemovalsFromSupplier({
        purchaser: _msgSender(),
        certificateAmount: certificateAmount,
        supplier: supplier
      });
    _fulfillOrder({
      params: FulfillOrderData({
        chargeFee: true,
        certificateAmount: certificateAmount,
        from: _msgSender(),
        recipient: recipient,
        countOfRemovalsAllocated: countOfRemovalsAllocated,
        ids: ids,
        amounts: amounts,
        suppliers: suppliers
      })
    });
  }

  /**
   * @notice Exchange ERC20 tokens for an ERC721 certificate by transferring ownership of the removals to the
   * certificate without charging a transaction fee.
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
   */
  function swapWithoutFee(
    address recipient,
    address purchaser,
    uint256 amount
  ) external whenNotPaused onlyRole(MARKET_ADMIN_ROLE) {
    uint256 certificateAmount = amount;
    (
      uint256 countOfRemovalsAllocated,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    ) = _allocateRemovals({
        purchaser: purchaser,
        certificateAmount: certificateAmount
      });
    _fulfillOrder({
      params: FulfillOrderData({
        chargeFee: false,
        certificateAmount: certificateAmount,
        from: purchaser,
        recipient: recipient,
        countOfRemovalsAllocated: countOfRemovalsAllocated,
        ids: ids,
        amounts: amounts,
        suppliers: suppliers
      })
    });
  }

  /**
   * @notice An overloaded version of `swap` that additionally accepts a supplier address and will exchange supported
   * ERC20 tokens for an ERC721 certificate token and transfers ownership of removal tokens supplied only from the
   * specified supplier to that certificate, without charging a transaction fee. If the specified supplier does not have
   * enough carbon removals for sale to fulfill the order the transaction will revert.
   * @dev See [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20-approve-address-uint256-) for
   * more. The purchaser must have granted approval to this contract to authorize this market to transfer their
   * supported ERC20 tokens to complete the purchase. A certificate is issued by the Certificate contract
   * to the specified recipient and the ERC20 tokens are distributed to the supplier(s) of the carbon removal as well as
   * potentially to the RestrictedNORI contract that controls any restricted portion of the ERC20 owed to the supplier.
   *
   * ##### Requirements:
   *
   * - Can only be used when this contract is not paused.
   * - Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
   * - Can only be used when the specified supplier has enough carbon removals for sale to fulfill the order.
   * - Can only be used if this contract has been granted approval to spend the purchaser's ERC20 tokens.
   * @param recipient The address to which the certificate will be issued.
   * @param purchaser The address that will pay for the removals and has granted approval to this contract
   * to transfer their ERC20 tokens.
   * @param amount The total purchase amount in ERC20 tokens. This is the total number of removals being
   * purchased, scaled by the price multiple.
   * @param supplier The only supplier address from which to purchase carbon removals in this transaction.
   */
  function swapFromSupplierWithoutFee(
    address recipient,
    address purchaser,
    uint256 amount,
    address supplier
  ) external whenNotPaused onlyRole(MARKET_ADMIN_ROLE) {
    uint256 certificateAmount = amount;
    (
      uint256 countOfRemovalsAllocated,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    ) = _allocateRemovalsFromSupplier({
        purchaser: purchaser,
        certificateAmount: certificateAmount,
        supplier: supplier
      });
    _fulfillOrder({
      params: FulfillOrderData({
        chargeFee: false,
        certificateAmount: certificateAmount,
        from: purchaser,
        recipient: recipient,
        countOfRemovalsAllocated: countOfRemovalsAllocated,
        ids: ids,
        amounts: amounts,
        suppliers: suppliers
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
   * @return The amount of the fee for Nori.
   */
  function calculateNoriFee(uint256 amount) external view returns (uint256) {
    return
      convertRemovalAmountToPurchasingTokenAmount(
        amount.mulDiv(_priceMultiple * _noriFeePercentage, 10000)
      );
  }

  function convertRemovalAmountToPurchasingTokenAmount(uint256 removalAmount)
    public
    view
    returns (uint256)
  {
    if (_purchasingTokenDecimals == 18) {
      return removalAmount;
    }
    int8 decimalDelta = 18 - int8(_purchasingTokenDecimals);
    return removalAmount / 10**uint8(decimalDelta);
  }

  function convertPurchasingTokenAmountToRemovalAmount(
    uint256 purchasingTokenAmount
  ) public view returns (uint256) {
    if (_purchasingTokenDecimals == 18) {
      return purchasingTokenAmount;
    }
    int8 decimalDelta = 18 - int8(_purchasingTokenDecimals);
    return purchasingTokenAmount * 10**uint8(decimalDelta);
  }

  /**
   * @notice Calculates the total quantity of ERC20 tokens required to make a purchase of the specified `amount` (in
   * tonnes of carbon removals).
   * @param amount The amount of carbon removals for the purchase.
   * @return The total quantity of ERC20 purchase token required to make the purchase.
   */
  function calculateCheckoutTotal(uint256 amount)
    public
    view
    returns (uint256)
  {
    return
      convertRemovalAmountToPurchasingTokenAmount(
        amount.mulDiv(_priceMultiple, 100)
      ) + this.calculateNoriFee({amount: amount});
  }

  /**
   * @notice Calculates the total quantity of ERC20 tokens required to make a purchase of the specified `amount` (in
   * tonnes of carbon removals) without a transaction fee.
   * @param amount The amount of carbon removals for the purchase.
   * @return The total quantity of ERC20 tokens required to make the purchase, excluding the fee.
   */
  function calculateCheckoutTotalWithoutFee(uint256 amount)
    external
    view
    returns (uint256)
  {
    return
      convertRemovalAmountToPurchasingTokenAmount(
        amount.mulDiv(_priceMultiple, 100)
      );
  }

  /**
   * @notice Calculates the quantity of carbon removals that can be purchased given
   * some payment amount taking into account NRT price and fees.
   * i.e. I have $100 (100_000_000 USDC), how many NRTs can I buy?
   * @param purchaseTotal The total number of `_purchasingToken`s used for a purchase.
   * @return certificateAmount Amount for the certificate, excluding the transaction fee.
   */
  function calculateCertificateAmountFromPurchaseTotal(uint256 purchaseTotal)
    external
    view
    returns (uint256)
  {
    return
      convertPurchasingTokenAmountToRemovalAmount(purchaseTotal).mulDiv(
        10000,
        (100 + _noriFeePercentage) * _priceMultiple
      );
  }

  /**
   * @notice Calculates the quantity of carbon removals that can be purchased given
   * some payment amount taking into account NRT price but excludign fees.
   * i.e. I have $100 (100_000_000 USDC), how many NRTs can I buy?
   * @param purchaseTotal The total number of `_purchasingToken`s used for a purchase.
   * @return certificateAmount Amount for the certificate.
   */
  function calculateCertificateAmountFromPurchaseTotalWithoutFee(
    uint256 purchaseTotal
  ) external view returns (uint256) {
    return
      convertPurchasingTokenAmountToRemovalAmount(purchaseTotal).mulDiv(
        10000,
        100 * _priceMultiple
      );
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
   * @notice Get the number of decimals configured on the purchasing token ERC20 contract.
   * @return Returns the number of decimals
   */
  function getPurchasingTokenDecimals() external view returns (uint8) {
    return _purchasingTokenDecimals;
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
  function getRemovalIdsForSupplier(address supplier)
    external
    view
    returns (uint256[] memory removalIds)
  {
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
  function supportsInterface(bytes4 interfaceId)
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
  function _setPurchasingToken(IERC20WithPermit purchasingToken, uint8 decimals)
    internal
  {
    if (decimals > 18 || decimals < 6) {
      revert InvalidPurchasingTokenDecimals(decimals);
    }
    _purchasingToken = IERC20WithPermit(purchasingToken);
    _purchasingTokenDecimals = decimals;
    emit SetPurchasingToken({
      purchasingToken: purchasingToken,
      decimals: decimals
    });
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
   *
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
    uint256[] memory removalIds = ids.slice({
      from: 0,
      to: countOfRemovalsAllocated
    });
    uint256[] memory removalAmounts = amounts.slice({
      from: 0,
      to: countOfRemovalsAllocated
    });
    bool isTransferSuccessful;
    uint8 holdbackPercentage;
    uint256 restrictedSupplierFee;
    uint256 unrestrictedSupplierFee;
    for (uint256 i = 0; i < countOfRemovalsAllocated; ++i) {
      holdbackPercentage = _removal.getHoldbackPercentage({id: removalIds[i]});

      unrestrictedSupplierFee = removalAmounts[i].mulDiv(_priceMultiple, 100);
      if (holdbackPercentage > 0) {
        restrictedSupplierFee = removalAmounts[i].mulDiv(
          _priceMultiple * holdbackPercentage,
          10000
        );
        unrestrictedSupplierFee -= restrictedSupplierFee;
        if (
          _restrictedNORI.getUnderlyingTokenAddress() !=
          address(_purchasingToken)
        ) {
          emit SkipRestrictedNORIERC20Transfer({
            amount: convertRemovalAmountToPurchasingTokenAmount(
              restrictedSupplierFee
            ),
            removalId: removalIds[i],
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
              amount: convertRemovalAmountToPurchasingTokenAmount(
                restrictedSupplierFee
              ),
              removalId: removalIds[i]
            })
          {
            // solhint-disable-previous-line no-empty-blocks, Nothing should happen here.
          } catch {
            emit RestrictedNORIMintFailure({
              amount: convertPurchasingTokenAmountToRemovalAmount(
                restrictedSupplierFee
              ),
              removalId: removalIds[i]
            });
            _restrictedNORI.incrementDeficitForSupplier({
              amount: convertPurchasingTokenAmountToRemovalAmount(
                restrictedSupplierFee
              ),
              originalSupplier: RemovalIdLib.supplierAddress({
                removalId: removalIds[i]
              })
            });
          }
          isTransferSuccessful = _purchasingToken.transferFrom({
            from: from,
            to: address(_restrictedNORI),
            amount: convertRemovalAmountToPurchasingTokenAmount(
              restrictedSupplierFee
            )
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
          amount: this.calculateNoriFee(removalAmounts[i])
        });
        if (!isTransferSuccessful) {
          revert ERC20TransferFailed();
        }
      }
      isTransferSuccessful = _purchasingToken.transferFrom({
        from: from,
        to: suppliers[i],
        amount: convertRemovalAmountToPurchasingTokenAmount(
          unrestrictedSupplierFee
        )
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

   */
  function _fulfillOrder(FulfillOrderData memory params) internal {
    uint256[] memory removalIds = params.ids.slice({
      from: 0,
      to: params.countOfRemovalsAllocated
    });
    uint256[] memory removalAmounts = params.amounts.slice({
      from: 0,
      to: params.countOfRemovalsAllocated
    });
    _transferFunds({
      chargeFee: params.chargeFee,
      from: params.from,
      countOfRemovalsAllocated: params.countOfRemovalsAllocated,
      ids: removalIds,
      amounts: removalAmounts,
      suppliers: params.suppliers
    });
    bytes memory data = abi.encode(
      false,
      params.recipient,
      params.certificateAmount,
      address(_purchasingToken),
      _priceMultiple,
      _noriFeePercentage
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
   * @param purchaser The address of the purchaser.
   * @param certificateAmount The total amount for the certificate.
   * @return countOfRemovalsAllocated The number of distinct removal IDs used to fulfill this order.
   * @return ids An array of the removal IDs being drawn from to fulfill this order.
   * @return amounts An array of amounts being allocated from each corresponding removal token.
   * @return suppliers The address of the supplier who owns each corresponding removal token.
   */
  function _allocateRemovals(address purchaser, uint256 certificateAmount)
    internal
    returns (
      uint256 countOfRemovalsAllocated,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    )
  {
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
    (countOfRemovalsAllocated, ids, amounts, suppliers) = _allocateSupply({
      amount: certificateAmount
    });
    return (countOfRemovalsAllocated, ids, amounts, suppliers);
  }

  /**
   * @notice Allocates removals from a specific supplier to be fulfilled.
   * @dev This function is responsible for validating and allocating the supply from a specific supplier.
   * @param purchaser The address of the purchaser.
   * @param certificateAmount The total amount of NRTs for the certificate.
   * @param supplier The only supplier address from which to purchase carbon removals in this transaction.
   * @return countOfRemovalsAllocated The number of distinct removal IDs used to fulfill this order.
   * @return ids An array of the removal IDs being drawn from to fulfill this order.
   * @return amounts An array of amounts being allocated from each corresponding removal token.
   * @return suppliers The address of the supplier who owns each corresponding removal token.
   */
  function _allocateRemovalsFromSupplier(
    address purchaser,
    uint256 certificateAmount,
    address supplier
  )
    internal
    returns (
      uint256 countOfRemovalsAllocated,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    )
  {
    _validatePrioritySupply({
      purchaser: purchaser,
      certificateAmount: certificateAmount,
      availableSupply: _removal.getMarketBalance()
    });
    (countOfRemovalsAllocated, ids, amounts) = _allocateSupplySingleSupplier({
      certificateAmount: certificateAmount,
      supplier: supplier
    });
    suppliers = new address[](countOfRemovalsAllocated).fill({val: supplier});
    return (countOfRemovalsAllocated, ids, amounts, suppliers);
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
  function _removeActiveRemoval(uint256 removalId, address supplierAddress)
    internal
  {
    _listedSupply[supplierAddress].remove({removalId: removalId});
    if (_listedSupply[supplierAddress].isEmpty()) {
      _removeActiveSupplier({supplierToRemove: supplierAddress});
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
  function _validateSupply(uint256 certificateAmount, uint256 availableSupply)
    internal
    pure
  {
    if (certificateAmount > availableSupply) {
      revert InsufficientSupply();
    }
  }

  /**
   * @notice Allocates the removals, amounts, and suppliers needed to fulfill the purchase.
   * @param amount The number of carbon removals to purchase.
   * @return countOfRemovalsAllocated The number of distinct removal IDs used to fulfill this order.
   * @return ids An array of the removal IDs being drawn from to fulfill this order.
   * @return amounts An array of amounts being allocated from each corresponding removal token.
   * @return suppliers The address of the supplier who owns each corresponding removal token.
   */
  function _allocateSupply(uint256 amount)
    private
    returns (
      uint256 countOfRemovalsAllocated,
      uint256[] memory ids,
      uint256[] memory amounts,
      address[] memory suppliers
    )
  {
    uint256 remainingAmountToFill = amount;
    uint256 countOfListedRemovals = _removal.numberOfTokensOwnedByAddress({
      account: address(this)
    });
    ids = new uint256[](countOfListedRemovals);
    amounts = new uint256[](countOfListedRemovals);
    suppliers = new address[](countOfListedRemovals);
    countOfRemovalsAllocated = 0;
    for (uint256 i = 0; i < countOfListedRemovals; ++i) {
      uint256 removalId = _listedSupply[_currentSupplierAddress]
        .getNextRemovalForSale();
      uint256 removalAmount = _removal.balanceOf({
        account: address(this),
        id: removalId
      });
      if (remainingAmountToFill < removalAmount) {
        /**
         * The order is complete, not fully using up this removal, don't increment currentSupplierAddress,
         * don't check about removing active supplier.
         */
        ids[countOfRemovalsAllocated] = removalId;
        amounts[countOfRemovalsAllocated] = remainingAmountToFill;
        suppliers[countOfRemovalsAllocated] = _currentSupplierAddress;
        remainingAmountToFill = 0;
      } else {
        /**
         * We will use up this removal while completing the order, move on to next one.
         */
        ids[countOfRemovalsAllocated] = removalId;
        amounts[countOfRemovalsAllocated] = removalAmount; // this removal is getting used up
        suppliers[countOfRemovalsAllocated] = _currentSupplierAddress;
        remainingAmountToFill -= removalAmount;
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
      ++countOfRemovalsAllocated;
      if (remainingAmountToFill == 0) {
        break;
      }
    }
    return (countOfRemovalsAllocated, ids, amounts, suppliers);
  }

  /**
   * @notice Allocates supply for an amount using only a single supplier's removals.
   * @param certificateAmount The number of carbon removals to purchase.
   * @param supplier The supplier from which to purchase carbon removals.
   * @return countOfRemovalsAllocated The number of distinct removal IDs used to fulfill this order.
   * @return ids An array of the removal IDs being drawn from to fulfill this order.
   * @return amounts An array of amounts being allocated from each corresponding removal token.
   */
  function _allocateSupplySingleSupplier(
    uint256 certificateAmount,
    address supplier
  )
    private
    returns (
      uint256 countOfRemovalsAllocated,
      uint256[] memory ids,
      uint256[] memory amounts
    )
  {
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
    uint256 remainingAmountToFill = certificateAmount;
    ids = new uint256[](countOfListedRemovals);
    amounts = new uint256[](countOfListedRemovals);
    countOfRemovalsAllocated = 0;
    for (uint256 i = 0; i < countOfListedRemovals; ++i) {
      uint256 removalId = supplierRemovalQueue.getNextRemovalForSale();
      uint256 removalAmount = _removal.balanceOf({
        account: address(this),
        id: removalId
      });
      /**
       * Order complete, not fully using up this removal.
       */
      if (remainingAmountToFill < removalAmount) {
        ids[countOfRemovalsAllocated] = removalId;
        amounts[countOfRemovalsAllocated] = remainingAmountToFill;
        remainingAmountToFill = 0;
        /**
         * We will use up this removal while completing the order, move on to next one.
         */
      } else {
        if (
          countOfRemovalsAllocated == countOfListedRemovals - 1 &&
          remainingAmountToFill > removalAmount
        ) {
          revert InsufficientSupply();
        }
        ids[countOfRemovalsAllocated] = removalId;
        amounts[countOfRemovalsAllocated] = removalAmount; // This removal is getting used up.
        remainingAmountToFill -= removalAmount;
        supplierRemovalQueue.remove({removalId: removalId});
        /**
         * If the supplier is out of supply, remove them from the active suppliers.
         */
        if (supplierRemovalQueue.isEmpty()) {
          _removeActiveSupplier({supplierToRemove: supplier});
        }
      }
      ++countOfRemovalsAllocated;
      if (remainingAmountToFill == 0) {
        break;
      }
    }
    return (countOfRemovalsAllocated, ids, amounts);
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
