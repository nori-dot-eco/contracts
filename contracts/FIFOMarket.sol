pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC1820RegistryUpgradeable.sol";
import "./Removal.sol";
import "./Certificate.sol";
import "./NORI.sol";
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
  IERC777RecipientUpgradeable {

  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  IERC1820RegistryUpgradeable private _erc1820;
  Removal private _removal;
  Certificate private _certificate;
  NORI private _nori;
  EnumerableSetUpgradeable.UintSet private _queue;
  address private _noriFeeWallet;
  uint256 private _noriFee;

  function initialize(
    address removalAddress,
    address noriAddress,
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
    _nori = NORI(noriAddress);
    _certificate = Certificate(certificateAddress);
    _noriFeeWallet = noriFeeWalletAddress;
    _noriFee = noriFee;
    _erc1820 = IERC1820RegistryUpgradeable(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24); // todo
    _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
  }

  function numberOfTonnesInQueue() public view returns (uint) {
    uint tonnesInQueue = 0;
    for(uint i = 0; i < _queue.length(); i++) {
      tonnesInQueue += _removal.balanceOf(address(this), _queue.at(i));
    }
    return tonnesInQueue;
  }

  function onERC1155BatchReceived(
    address,
    address,
    uint256[] memory ids,
    uint256[] memory,
    bytes memory
  ) public override returns (bytes4) {
    for (uint i = 0; i < ids.length; i++) {
      _queue.add(ids[i]);
    }
    return this.onERC1155BatchReceived.selector;
  }

  // todo optimize gas (perhaps consider setting the last sold id instead of looping -- not sure if it's possible to reduce array size yet or not)
  /**
   * @dev Called automatically by the ERC777 (nori) contract when a batch of tokens are transferred to the contract.
   */
  function tokensReceived(
    address,
    address,
    address,
    uint256 amount,
    bytes calldata userData,
    bytes calldata
  ) external override {
    // todo this doesnt seem to revert if the queue is empty
    // todo take into consideration the fact that the user is sending the amount + 15% fee
    address recipient = abi.decode(userData, (address)); // todo handle the case where someone invokes this function without operatorData
    require(recipient == address(recipient),"FIFOMarket: Invalid address");
    require(recipient != address(0), "FIFOMarket: Cannot mint to the 0 address");
    require(msg.sender == address(_nori), "FIFOMarket: This contract can only receive NORI"); // todo verify this can only be invoked by the nori contract
    uint certificateAmount = (amount * 100) / (100 + _noriFee);
    uint remainingAmountToFill = certificateAmount;
    uint256[] memory ids = new uint256[](_queue.length());
    uint256[] memory amounts = new uint256[](_queue.length());
    address[] memory suppliers = new address[](_queue.length());
    for (uint i = 0; i < _queue.length(); i++) {
      uint removalAmount = _removal.balanceOf(address(this), _queue.at(i));
      address supplier = _removal.vintage(_queue.at(i)).supplier;
      if(remainingAmountToFill < removalAmount) {
        ids[i] = _queue.at(i);
        amounts[i] = remainingAmountToFill;
        suppliers[i] = supplier;
        remainingAmountToFill = 0;
      } else if(remainingAmountToFill >= removalAmount) {
        if(i == _queue.length() - 1 && remainingAmountToFill > removalAmount){
          revert("FIFOMarket: Not enough supply");
        }
        ids[i] = _queue.at(i);
        amounts[i] = removalAmount;
        suppliers[i] = supplier;
        remainingAmountToFill -= removalAmount;
      } else {
        revert("FIFOMarket: Not enough supply");
      }
      if(remainingAmountToFill == 0){
        break;
      }
    }
    bytes memory encodedCertificateAmount = abi.encode(certificateAmount);
    _certificate.mintBatch(
      recipient,
      ids,
      amounts,
      encodedCertificateAmount
    );
    for (uint i = 0; i < ids.length; i++) {
      if(amounts[i] == 0){
        break;
      }
      if(amounts[i] == _removal.balanceOf(address(this), _queue.at(i))) {
        _queue.remove(i);
      }
      uint256 noriFee = (amounts[i] / 100) * _noriFee;
      uint256 supplierFee = amounts[i];
      _nori.transfer(_noriFeeWallet, noriFee);
      _nori.transfer(suppliers[i], supplierFee);
    }
    _removal.burnBatch(address(this),ids,amounts);
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControlEnumerableUpgradeable, ERC1155ReceiverUpgradeable) returns (bool) {
    return AccessControlEnumerableUpgradeable.supportsInterface(interfaceId) || ERC1155ReceiverUpgradeable.supportsInterface(interfaceId);
  }
}