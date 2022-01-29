pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "hardhat/console.sol"; // todo

// todo non-transferable/approveable after mint (except by DEFAULT_ADMIN_ROLE)
// todo disable other mint functions

/**
 * @title Removal
 */
contract Removal is ERC1155PresetMinterPauserUpgradeable, ERC1155SupplyUpgradeable {

  using SafeMathUpgradeable for uint;

  struct Vintage {
    address supplier;
    uint16 vintage;
    bytes32 uniqueId;
    // todo: location
    // todo: methodology
    // todo: supplier name
  }

  mapping(uint256 => Vintage) private _vintages;
  mapping(bytes32 => uint256) private _vintageTokenIdMap;
  uint256 private _latestTokenId;
  string public name; // todo why did I add this


  function initialize() public virtual initializer {
    super.initialize("https://nori.com/api/removal/{id}.json");
    __ERC1155Supply_init_unchained();
    _latestTokenId = 0;
    name = "Removal";
  }

  /**
   * @dev returns the removal vintage data for a given removal token ID
   */
  function vintage(uint256 removalId) public view returns (Vintage memory) {
    return _vintages[removalId];
  }

  /**
   * @dev returns the removal token ID for a given unique removal id
   */
  function tokenIdForRemoval(bytes32 uniqueId) public view returns (uint256) {
    return _vintageTokenIdMap[uniqueId];
  }

  /**
   * @dev mints multiple removals at once (but only for one supplier)
   * @param to The supplier address
   * @param amounts Each removal's tonnes of CO2 formatted as wei
   * @param vintages The year for each removal
   * @param data Additional data with no specified format, MUST be sent unaltered in call to `onERC1155Received` on `_to`
   going to try co-opting this as a unique ID
   */
  function mintBatch(
    address to,
    uint256[] memory amounts,
    uint256[] memory vintages,
    bytes memory data
  ) public override {
    // todo require vintage is within valid year range and doesn't already exist
    uint256[] memory ids = new uint256[](vintages.length);
    for (uint256 i = 0; i < vintages.length; i++) {
      // bytes32 vintageBytes = bytes32(abi.encodePacked(uint256(vintages[i])));
      // console.log("data: ", data);
      // console.log("vintage_bytes: ", vintageBytes);
      bytes32 uniqueId = keccak256(abi.encodePacked(data, vintages[i]));
      // console.log("uniqueId: ", uniqueId);

      ids[i] = _latestTokenId + i;
      _vintages[_latestTokenId + i] = Vintage({
        vintage: uint16(vintages[i]),
        supplier: to,
        uniqueId: uniqueId
      });
      _vintageTokenIdMap[uniqueId] = _latestTokenId + i;
    }
    _latestTokenId = ids[ids.length - 1] + 1;
    super.mintBatch(
      to,
      ids,
      amounts,
      data
    );
    // ids that will be auto assigned [0, 1, 2]
    // amounts: [100 * (10 ** 18), 10 * (10 ** 18), 50 * (10 ** 18)] <- 100 tonnes, 10 tonnes, 50 tonnes in standard erc20 units (wei)
    // vintages: [2018, 2019, 2020]
    // token id 0 URI points to vintage information (e.g., 2018) nori.com/api/removal/0 -> { amount: 100, supplier: 1, vintage: 2018, ... }
    // token id 1 URI points to vintage information (e.g., 2019) nori.com/api/removal/1 -> { amount: 10, supplier: 1, vintage: 2019, ... }
    // token id 2 URI points to vintage information (e.g., 2020) nori.com/api/removal/2 -> { amount: 50, supplier: 1, vintage: 2020, ... }
  }

  /**
   * @dev used to initiate a sale of removals by transferring the removals to the
   */
  function safeBatchTransferFrom(
    address _from,
    address _to,
    uint256[] memory _ids,
    uint256[] memory _amounts,
    bytes memory _data
  ) public override {
    // todo require _to is a known market contract
    super.safeBatchTransferFrom(
      _from,
      _to,
      _ids,
      _amounts,
      _data
    );
  }

  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal override(ERC1155PresetMinterPauserUpgradeable, ERC1155SupplyUpgradeable) {
    return super._beforeTokenTransfer(
      operator,
      from,
      to,
      ids,
      amounts,
      data
    );
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view override(ERC1155Upgradeable, ERC1155PresetMinterPauserUpgradeable) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}