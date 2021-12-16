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
import "hardhat/console.sol";

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
    _noriFee = noriFee / 100;
    _erc1820 = IERC1820RegistryUpgradeable(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
  }

  function onERC1155BatchReceived(
    address operator,
    address from,
    uint256[] memory ids,
    uint256[] memory values,
    bytes memory data
  ) public override returns (bytes4) {
    for (uint i = 0; i < ids.length; i++) {
      _queue.add(ids[i]);
    }
    return this.onERC1155BatchReceived.selector;
  }

  function bytesToAddress(bytes memory bys) public pure returns (address addr) {
    // todo check for existing safer utils
    assembly {
      addr := mload(add(add(bys, 32), 0))
    }
  }

  // todo optimize gas (perhaps consider setting the last sold id instead of looping -- not sure if it's possible to reduce array size yet or not)
  /**
   * @dev Called automatically by the ERC777 (nori) contract when a batch of tokens are transferred to the contract.
   */
  function tokensReceived(
    address operator,
    address from,
    address to,
    uint256 amount,
    bytes calldata userData,
    bytes calldata operatorData
  ) external override {
    require(msg.sender == address(_nori), "This contract can only receive NORI");
    uint256[] memory ids = new uint256[](_queue.length());
    uint256[] memory amounts = new uint256[](_queue.length());
    address[] memory suppliers = new address[](_queue.length());
    uint amountToFill = amount;
    for (uint i = 0; i < _queue.length(); i++) {
      console.log("DEBUG:","i",i);
      uint issuanceAmount = _removal.balanceOf(address(this), _queue.at(i));
      console.log("DEBUG:","issuanceAmount",issuanceAmount);
      console.log("DEBUG:","amountToFill",amountToFill);
      console.log("DEBUG:","ids",ids.length);
      console.log("DEBUG:","amounts",amounts.length);
      console.log("DEBUG:","suppliers",suppliers.length);
      address supplier = _removal.vintage(_queue.at(i)).supplier;
      console.log("DEBUG:","supplier",supplier);
      console.log("DEBUG:","amountToFill <= issuanceAmount",amountToFill <= issuanceAmount);
      console.log("DEBUG:","amountToFill > issuanceAmount",amountToFill > issuanceAmount);
      if(amountToFill <= issuanceAmount) {
        ids[i] = i;
        amounts[i] = amountToFill;
        suppliers[i] = supplier;
        break;
      } else if(amountToFill > issuanceAmount) {
        ids[i] = i;
        console.log("DEBUG:","ids[i]",ids[i]);
        amounts[i] = issuanceAmount;
        suppliers[i] = supplier;
        amountToFill = amountToFill += issuanceAmount;
        _queue.remove(i);
      } else {
        revert("Not enough supply");
      }
    }
    // _certificate.mintBatch(
    //   bytesToAddress(userData),
    //   ids,
    //   amounts,
    //   ""
    // );
    // for (uint i = 0; i < suppliers.length; i++) {
    //   _nori.transfer(_noriFeeWallet, _noriFee * amounts[i]);
    //   _nori.transfer(suppliers[i], amounts[i] - (_noriFee * amounts[i]));
    // }
    // _removal.burnBatch(address(this),ids,amounts);
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControlEnumerableUpgradeable, ERC1155ReceiverUpgradeable) returns (bool) {
    return AccessControlEnumerableUpgradeable.supportsInterface(interfaceId) || ERC1155ReceiverUpgradeable.supportsInterface(interfaceId);
  }
}