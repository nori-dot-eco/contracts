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

  ERC1155PresetMinterPauserUpgradeable private _issuance;
  ERC777Upgradeable private _noriToken;
  EnumerableSetUpgradeable.UintSet private _queue;

  function initialize(string memory _uri, address _issuanceAddress, address _noriAddress) public initializer {
    __Context_init_unchained();
    __ERC165_init_unchained();
    __AccessControl_init_unchained();
    __AccessControlEnumerable_init_unchained();
    _issuance = ERC1155PresetMinterPauserUpgradeable(_issuanceAddress);
    _noriToken = ERC777Upgradeable(_noriAddress);
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
    require(msg.sender == address(_noriToken), "This contract can only receive NORI");
    // todo use balanceOfBatch instead
    uint[] storage ids;
    address[] storage addresses;
    uint filledAmount = 0;
    for (uint i = 0; i < _queue.length(); i.add(1)) {
      uint issuanceAmount = _issuance.balanceOf(address(this), _queue.at(i));
      if(amount.sub(filledAmount) <= issuanceAmount) {
        _issuance.burn(address(this), ids[i], amount);
        if(ids.length > 0) {
          _issuance.burnBatch(
            address(this),
            ids,
            _issuance.balanceOfBatch(addresses, ids)
          );
        }
        break;
      } else if(amount > issuanceAmount) {
        ids.push(_queue.at(i));
        addresses.push(address(this));
        filledAmount.add(issuanceAmount);
      } else {
        revert("Not enough supply");
      }
    }
    // todo transfer received tokens to suppliers
    // todo mint certificate for amount
    // todo link issuance IDs to the certificate
  }
}