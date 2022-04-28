// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
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

  IERC1820RegistryUpgradeable private _erc1820;
  Removal private _removal;
  Certificate private _certificate;
  BridgedPolygonNORI private _bridgedPolygonNori;
  mapping(uint256 => uint256) private _queue;
  uint256 private _queueHeadIndex;
  uint256 private _queueNextInsertIndex;
  address private _noriFeeWallet;
  uint256 private _noriFee;
  uint256 public priorityRestrictedThreshold;
  uint256 public totalSupply;
  uint256 public totalNumberActiveRemovals;
  uint256 public _currentSupplierIndex;
  address[] public _activeSuppliersOrdered;
  mapping(address => bool) public _activeSuppliersUnordered;
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
    _queueHeadIndex = 0;
    _queueNextInsertIndex = 0;
    priorityRestrictedThreshold = 0;
    totalSupply = 0;
    totalNumberActiveRemovals = 0;
    _currentSupplierIndex = 0;
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

  function _queueLength() private view returns (uint256) {
    return _queueNextInsertIndex - _queueHeadIndex;
  }

  function numberOfNrtsInQueueComputed() public view returns (uint256) {
    // uint256 nrtsInQueue = 0;
    // for (uint256 i = _queueHeadIndex; i < _queueNextInsertIndex; i++) {
    //   nrtsInQueue += _removal.balanceOf(address(this), _queue[i]);
    // }
    // return nrtsInQueue;
    // TODO
    return totalSupply;
  }

  function totalUnrestrictedSupply() public view returns (uint256) {
    if (totalSupply < priorityRestrictedThreshold) {
      return 0;
    }
    return totalSupply - priorityRestrictedThreshold;
  }

  // TODO: this function no longer makes sense to exist based on how the market now works (less deterministic)
  // function nextRemovalForSale(bool includePriorityRestrictedSupply)
  //   public
  //   view
  //   returns (uint256)
  // {
  //   uint256 nextRemovalId = 0;
  //   if (totalSupply > 0) {
  //     address activeSupplierAddress = _activeSuppliersOrdered[
  //       _currentSupplierIndex
  //     ];
  //     nextRemovalId = _activeSupply[activeSupplierAddress].at(0);
  //   }
  //   if (
  //     !includePriorityRestrictedSupply &&
  //     totalSupply <= priorityRestrictedThreshold
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
      totalSupply += removalAmount;
      totalNumberActiveRemovals += 1;
      address supplierAddress = ids[i].supplierAddress();
      _activeSupply[supplierAddress].add(ids[i]); // add removal to supplier queue
      console.log(
        "added id ",
        ids[i],
        " to set for supplier ",
        supplierAddress
      );
      if (!_activeSuppliersUnordered[supplierAddress]) {
        _activeSuppliersUnordered[supplierAddress] = true;
        _activeSuppliersOrdered.push(supplierAddress);
      }
      console.log(
        "new length activeSuppliersOrdered:",
        _activeSuppliersOrdered.length
      );

      // _queue[_queueNextInsertIndex] = (ids[i]);
      // _queueNextInsertIndex++;
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
    // todo we need to treat totalSupply in a more nuanced way when reservation of removals is implemented
    // potentialy creating more endpoints to understand how many are reserved v.s. actually available v.s. priority reserved etc.
    if (totalSupply == 0) {
      revert("Market: Out of stock");
    }
    if (totalSupply <= priorityRestrictedThreshold) {
      require(
        hasRole(ALLOWLIST_ROLE, from),
        "Low supply and buyer not on allowlist"
      );
    }
    uint256 certificateAmount = (amount * 100) / (100 + _noriFee);
    uint256 remainingAmountToFill = certificateAmount;

    address recipient = abi.decode(userData, (address)); // todo handle the case where someone invokes this function without operatorData
    // require(
    //   _queueHeadIndex != _queueNextInsertIndex,
    //   "Market: Not enough supply"
    // );
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
      address activeSupplier = _activeSuppliersOrdered[_currentSupplierIndex];

      console.log("currentSupplierIndex", _currentSupplierIndex);
      console.log("activeSupplier:", activeSupplier);
      uint256 removalId = _activeSupply[activeSupplier].at(0); // grab head of this supplier's queue
      uint256 removalAmount = _removal.balanceOf(address(this), removalId);
      // address supplier = _queue[i].supplierAddress();

      // order complete, not fully using up this removal, don't increment currentSupplierIndex, don't check about removing active supplier
      if (remainingAmountToFill < removalAmount) {
        ids[i] = removalId;
        amounts[i] = remainingAmountToFill;
        suppliers[i] = activeSupplier;
        remainingAmountToFill = 0;
        // we will use up this removal while completing the order, move on to next one
      } else {
        if (
          i == totalNumberActiveRemovals - 1 &&
          remainingAmountToFill > removalAmount
        ) {
          revert("Market: Not enough supply");
        }
        ids[i] = removalId;
        amounts[i] = removalAmount; // this removal is getting used up
        suppliers[i] = activeSupplier;
        remainingAmountToFill -= removalAmount;

        _activeSupply[activeSupplier].remove(removalId); // pull it out of the supplier's queue
        // check to see if this supplier is no longer active:
        if (_activeSupply[activeSupplier].length() == 0) {
          _removeActiveSupplier(_currentSupplierIndex);
        } else {
          // make sure we do this last because it depends on an accurate length of the active suppliers array
          // also, we only increment if we didn't have to pull this supplier out of active (because if we do, the index stays the same and now points at the next supplier)
          _incrementCurrentSupplierIndex();
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
    console.log("batchedAmounts: ");
    for (uint256 i = 0; i < batchedAmounts.length; i++) {
      console.log(batchedAmounts[i]);
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
      totalSupply -= batchedAmounts[i];
      uint256 noriFee = (batchedAmounts[i] / 100) * _noriFee;
      uint256 supplierFee = batchedAmounts[i];
      _bridgedPolygonNori.transfer(_noriFeeWallet, noriFee);
      _bridgedPolygonNori.transfer(suppliers[i], supplierFee);
    }
    _removal.burnBatch(address(this), batchedIds, batchedAmounts);
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

  function _incrementCurrentSupplierIndex() private {
    _currentSupplierIndex =
      (_currentSupplierIndex + 1) %
      _activeSuppliersOrdered.length;
  }

  function _removeActiveSupplier(uint256 index) private {
    address supplierAddress = _activeSuppliersOrdered[index];
    console.log("removing active supplier: ", supplierAddress);
    for (uint256 i = index; i < (_activeSuppliersOrdered.length - 1); i++) {
      _activeSuppliersOrdered[i] = _activeSuppliersOrdered[i + 1];
    }
    _activeSuppliersOrdered.pop();
    _activeSuppliersUnordered[supplierAddress] = false;
    console.log(
      "new length activesuppliersordered: ",
      _activeSuppliersOrdered.length
    );
    // todo does this actually mean we're guaranteed to get a 0 back when querying this key again? because we need to
    // delete _activeSupply[supplierAddress]; // I think there's actually no point in doing this because we can't actually delete the enumerable set that's sitting there and we can't ask about a 0 value here because of the mapping type anyway
  }
}
