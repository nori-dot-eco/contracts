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
    uint256 nrtsInQueue = 0;
    for (uint256 i = _queueHeadIndex; i < _queueNextInsertIndex; i++) {
      nrtsInQueue += _removal.balanceOf(address(this), _queue[i]);
    }
    return nrtsInQueue;
  }

  function totalUnrestrictedSupply() public view returns (uint256) {
    if (totalSupply < priorityRestrictedThreshold) {
      return 0;
    }
    return totalSupply - priorityRestrictedThreshold;
  }

  function nextRemovalForSale(bool includePriorityRestrictedSupply)
    public
    view
    returns (uint256)
  {
    // todo if our queue ever becomes an array and not a map, we need to define behavior for empty queue
    // instead of trying to index into it (returning 0 if empty)
    uint256 nextRemovalId = _queue[_queueHeadIndex];
    if (
      !includePriorityRestrictedSupply &&
      totalSupply <= priorityRestrictedThreshold
    ) {
      nextRemovalId = 0;
    }
    return nextRemovalId;
  }

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
      _queue[_queueNextInsertIndex] = (ids[i]);
      _queueNextInsertIndex++;
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
    require(
      _queueHeadIndex != _queueNextInsertIndex,
      "Market: Not enough supply"
    );
    require(recipient == address(recipient), "Market: Invalid address");
    require(recipient != address(0), "Market: Cannot mint to the 0 address");
    // todo verify this can only be invoked by the nori contract
    require(
      msg.sender == address(_bridgedPolygonNori),
      "Market: This contract can only receive BridgedPolygonNORI"
    );

    uint256[] memory ids = new uint256[](_queueLength());
    uint256[] memory amounts = new uint256[](_queueLength());
    address[] memory suppliers = new address[](_queueLength());
    for (uint256 i = _queueHeadIndex; i < _queueNextInsertIndex; i++) {
      uint256 removalAmount = _removal.balanceOf(address(this), _queue[i]);
      address supplier = _queue[i].supplierAddress();
      if (remainingAmountToFill < removalAmount) {
        ids[i] = _queue[i];
        amounts[i] = remainingAmountToFill;
        suppliers[i] = supplier;
        remainingAmountToFill = 0;
      } else {
        if (
          i == _queueNextInsertIndex - 1 &&
          remainingAmountToFill > removalAmount
        ) {
          revert("Market: Not enough supply");
        }
        ids[i] = _queue[i];
        amounts[i] = removalAmount;
        suppliers[i] = supplier;
        remainingAmountToFill -= removalAmount;
      }

      if (remainingAmountToFill == 0) {
        break;
      }
    }

    bytes memory encodedCertificateAmount = abi.encode(certificateAmount);
    _certificate.mintBatch(recipient, ids, amounts, encodedCertificateAmount);
    for (uint256 i = 0; i < ids.length; i++) {
      if (amounts[i] == 0) {
        break;
      }
      totalSupply -= amounts[i];
      if (amounts[i] == _removal.balanceOf(address(this), _queue[i])) {
        _queueHeadIndex++;
      }
      uint256 noriFee = (amounts[i] / 100) * _noriFee;
      uint256 supplierFee = amounts[i];
      _bridgedPolygonNori.transfer(_noriFeeWallet, noriFee);
      _bridgedPolygonNori.transfer(suppliers[i], supplierFee);
    }
    _removal.burnBatch(address(this), ids, amounts);
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
}
