// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC1820RegistryUpgradeable.sol";
import "solidity-linked-list/contracts/StructuredLinkedList.sol";
import "./Removal.sol";
import "./Certificate.sol";
import "./BridgedPolygonNORI.sol";
import {RemovalUtils} from "./RemovalUtils.sol";

import "hardhat/console.sol"; // todo

// todo emit events
struct RoundRobinOrder {
  address nextSupplier;
  address previousSupplier;
  LinkedList activeRemovalIds;
  uint256[] reservedRemovalIds;
  uint256 removalIndex;
  // how do handle reserved removals?
}

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
  // using StructuredLinkedList for StructuredLinkedList.List;

  IERC1820RegistryUpgradeable private _erc1820;
  Removal private _removal;
  Certificate private _certificate;
  BridgedPolygonNORI private _bridgedPolygonNori;
  address private _noriFeeWallet;
  uint256 private _noriFee;
  uint256 public priorityRestrictedThreshold;
  uint256 public totalSupply;
  uint256 public totalNumberActiveRemovals;
  uint256 public totalActiveSupply;
  uint256 public totalReservedSupply;
  // TODO: How do new suppliers get indexed?
  address private _currentSupplierIndex;
  address private _lastSupplierIndex;
  mapping(address => FifoOrder) private _activeSuppliersOrdered;
  mapping(address => FifoOrder) private _activeSuppliersOrdered;
  // StructuredLinkedList.List private _activeSuppliersOrdered;

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
    totalSupply = 0;
    totalActiveSupply = 0;
    totalReservedSupply = 0;
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

  function numberOfActiveNrtsInMarketComputed() public view returns (uint256) {
    uint256 total = 0;
    for (uint256 i = 0; i < _activeSuppliersOrdered.length; i++) {
      address supplierAddress = _activeSuppliersOrdered[i];
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
    }
    return total;
  }

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
  //     address activeSupplierAddress = _activeSuppliersOrdered[
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
    bytes memory
  ) public override returns (bytes4) {
    for (uint256 i = 0; i < ids.length; i++) {
      uint256 removalAmount = _removal.balanceOf(address(this), ids[i]);
      totalActiveSupply += removalAmount;
      totalNumberActiveRemovals += 1;
      uint256 supplierAddress = uint256(ids[i].supplierAddress());
      // TODO: Is this needed?
      // _activeSupply[supplierAddress].add(ids[i]);
      if (!_activeSuppliersOrdered.nodeExists(supplierAddress)) {
        _activeSuppliersOrdered.pushBack(_node);
        _lastSupplierIndex = supplierAddress;
      }
      // if (!_activeSuppliersOrdered[supplierAddress]) {
      //   _activeSuppliersOrdered[supplierAddress] = {
      //     previous
      //   };
      //   _lastSupplierIndex = supplierAddress;
      // }
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
    // todo we need to treat totalActiveSupply in a more nuanced way when reservation of removals is implemented
    // potentialy creating more endpoints to understand how many are reserved v.s. actually available v.s. priority reserved etc.

    if (totalActiveSupply == 0) {
      revert("Market: Out of stock");
    }
    if (totalActiveSupply <= priorityRestrictedThreshold) {
      require(hasRole(ALLOWLIST_ROLE, from), "Market: Not on allowlist");
    }

    // todo verify this can only be invoked by the nori contract
    // TODO: ^ DONE ?
    require(
      msg.sender == address(_bridgedPolygonNori),
      "Market: BPNori != sender"
    );

    address recipient = abi.decode(userData, (address)); // todo handle the case where someone invokes this function without operatorData
    require(recipient == address(recipient), "Market: Invalid address");
    require(recipient != address(0), "Market: Cannot mint to 0 address");

    uint256 certificateAmount = (amount * 100) / (100 + _noriFee);
    uint256 remainingAmountToFill = certificateAmount;

    uint256[] memory ids = new uint256[](totalNumberActiveRemovals);
    uint256[] memory amounts = new uint256[](totalNumberActiveRemovals);
    address[] memory suppliers = new address[](totalNumberActiveRemovals);
    uint256 numberOfRemovals = 0;
    for (uint256 i = 0; i < totalNumberActiveRemovals; i++) {
      address activeSupplier = _activeSuppliersOrdered[_currentSupplierIndex];
      uint256 removalId = _activeSupply[activeSupplier].at(0); // grab head of this supplier's queue
      uint256 removalAmount = _removal.balanceOf(address(this), removalId);
      // order complete, not fully using up this removal, don't increment currentSupplierIndex, don't check about removing active supplier
      if (remainingAmountToFill < removalAmount) {
        ids[numberOfRemovals] = removalId;
        amounts[numberOfRemovals] = remainingAmountToFill;
        suppliers[numberOfRemovals] = activeSupplier;
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
        suppliers[numberOfRemovals] = activeSupplier;
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
      totalActiveSupply -= batchedAmounts[i];
      uint256 noriFee = (batchedAmounts[i] / 100) * _noriFee;
      uint256 supplierFee = batchedAmounts[i];
      _bridgedPolygonNori.transfer(_noriFeeWallet, noriFee);
      _bridgedPolygonNori.transfer(suppliers[i], supplierFee);
    }
    _removal.burnBatch(address(this), batchedIds, batchedAmounts);
  }

  // TODO batch version of this?
  // TODO: Remove supplier if removal was last in queue
  function reserveRemoval(uint256 removalId) external returns (bool) {
    address supplierAddress = removalId.supplierAddress();
    EnumerableSetUpgradeable.UintSet storage supplierSet = _activeSupply[
      supplierAddress
    ];
    require(
      supplierSet.contains(removalId),
      "Market: removal not in active supply"
    );
    supplierSet.remove(removalId);
    totalNumberActiveRemovals -= 1;
    uint256 removalBalance = _removal.balanceOf(address(this), removalId);
    totalActiveSupply -= removalBalance;
    totalReservedSupply += removalBalance;
    // todo any checks on whether this id was already in there?
    return _reservedSupply.add(removalId); // returns true if the value was added to the set, that is, if it was not already present
  }

  // TODO batch version of this?
  // TODO: What if supplier was removed with above (or from sale)
  function unreserveRemoval(uint256 removalId) external returns (bool) {
    address supplierAddress = removalId.supplierAddress();
    EnumerableSetUpgradeable.UintSet storage supplierSet = _activeSupply[
      supplierAddress
    ];
    require(
      _reservedSupply.contains(removalId),
      "Market: removal not in reserved supply"
    );
    _reservedSupply.remove(removalId);
    totalNumberActiveRemovals += 1;
    uint256 removalBalance = _removal.balanceOf(address(this), removalId);
    totalActiveSupply += removalBalance;
    totalReservedSupply -= removalBalance;
    return supplierSet.add(removalId); // returns true if the value was added to the set, that is, if it was not already present
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
    for (uint256 i = index; i < (_activeSuppliersOrdered.length - 1); i++) {
      _activeSuppliersOrdered[i] = _activeSuppliersOrdered[i + 1];
    }
    _activeSuppliersOrdered.pop();
    _activeSuppliersUnordered[supplierAddress] = false;
  }
}
