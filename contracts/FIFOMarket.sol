pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "./Removal.sol";


/**
 * @title FIFOMarket
 */
contract FIFOMarket is
  Initializable,
  ContextUpgradeable,
  ERC1820ImplementerUpgradeable,
  AccessControlEnumerableUpgradeable,
  IERC1155ReceiverUpgradeable,
  IERC777RecipientUpgradeable {

  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using SafeMathUpgradeable for uint;

  Removal private _removal;
  ERC1155PresetMinterPauserUpgradeable private _certificate;
  ERC777Upgradeable private _nori;
  EnumerableSetUpgradeable.UintSet private _queue;

  function initialize(address removalAddress, address noriAddress, address certificateAddress) public initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    _removal = Removal(removalAddress);
    _nori = ERC777Upgradeable(noriAddress);
    _certificate = ERC1155PresetMinterPauserUpgradeable(certificateAddress);
    _registerInterfaceForAddress(keccak256("ERC777TokensRecipient"), address(this));
    _registerInterfaceForAddress(keccak256("ERC1155TokensRecipient"), address(this));
  }

  function onERC1155BatchReceived(
    address operator,
    address from,
    uint256[] calldata ids,
    uint256[] calldata values,
    bytes calldata data
  ) external override returns (bytes4) {
    for (uint i = 0; i < ids.length; i.add(1)) {
      _queue.add(ids[i]);
    }
    return bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"));
  }

  /**
   * @dev Called automatically by the ERC1155 (issuance) contract when a batch of tokens are transferred to the contract.
   */
  function onERC1155Received(
    address operator,
    address from,
    uint256 id,
    uint256 value,
    bytes calldata data
  ) external override returns (bytes4) {
    _queue.add(id);
    return bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"));
  }

  function bytesToAddress(bytes memory bys) public pure returns (address addr) {
    // todo check for existing safer utils
    assembly {
      addr := mload(add(add(bys, 32), 0))
    }
  }

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
    uint256[] memory ids;
    uint256[] memory amounts;
    address[] memory suppliers;
    uint amountToFill = amount;
    for (uint i = 0; i < _queue.length(); i.add(1)) {
      uint issuanceAmount = _removal.balanceOf(address(this), _queue.at(i));
      // address supplier = _removal.vintage(_queue.at(i));
      if(amountToFill <= issuanceAmount) {
        ids[i] = i;
        amounts[i] = amountToFill;
        suppliers[i] = supplier;
        break;
      } else if(amountToFill > issuanceAmount) {
        ids[i] = i;
        amounts[i] = issuanceAmount;
        amountToFill = amountToFill.add(issuanceAmount);
      } else {
        revert("Not enough supply");
      }
    }
    _certificate.mintBatch(
      bytesToAddress(userData),
      ids,
      amounts,
      ""
    );
    // _nori.transfer(recipient, amount);
    _removal.burnBatch(address(this),ids,amounts);
    // todo transfer received tokens to suppliers
  }
}