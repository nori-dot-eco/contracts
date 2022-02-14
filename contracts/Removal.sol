// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

// import "hardhat/console.sol"; // todo

// todo non-transferable/approveable after mint (except by DEFAULT_ADMIN_ROLE)
// todo disable other mint functions

/**
 * @title Removal
 */
contract Removal is
  ERC1155PresetMinterPauserUpgradeable,
  ERC1155SupplyUpgradeable
{
  using SafeMathUpgradeable for uint256;

  struct Vintage {
    address supplier;
    uint16 vintage;
    bytes32 uniqueId;
    // todo: location
    // todo: methodology
    // todo: supplier name
  }

  struct BatchMintRemovalsData {
    address marketAddress;
    bytes32 uniqueId;
    bool list;
  }

  mapping(uint256 => Vintage) private _vintages;
  mapping(bytes32 => uint256) private _vintageToTokenIdMap;
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
   * @dev returns the token ids for a set of removals given each one's vintage and the identifying data that was provided
   * in its mint transaction. Arguments should be arrays of the same length as they correspond to the same removals.
   * @param uniqueIdentifiers The unique identifier that was passed at the time of minting each removal.
   * @param removalVintages The vintage (year) of each removal.
   */
  function tokenIdsForRemovals(
    bytes32[] memory uniqueIdentifiers,
    uint256[] memory removalVintages
  ) public view returns (uint256[] memory) {
    uint256[] memory ids = new uint256[](removalVintages.length);
    for (uint256 i = 0; i < removalVintages.length; i++) {
      ids[i] = _vintageToTokenIdMap[
        keccak256(abi.encodePacked(uniqueIdentifiers[i], removalVintages[i]))
      ];
    }
    return ids;
  }

  /**
   * @dev See {IERC1155-setApprovalForAll}.
   */
  function setApprovalForAllAsAdmin(
    address owner,
    address operator,
    bool approved
  ) public virtual onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
    _setApprovalForAll(owner, operator, approved);
  }

  /**
   * @dev mints multiple removals at once (for a single supplier) AND lists those removals for sale in the market.
   * ids that will be auto assigned [0, 1, 2]
   * amounts: [100 * (10 ** 18), 10 * (10 ** 18), 50 * (10 ** 18)] <- 100 tonnes, 10 tonnes, 50 tonnes in standard erc20 units (wei)
   * vintages: [2018, 2019, 2020]
   * token id 0 URI points to vintage information (e.g., 2018) nori.com/api/removal/0 -> { amount: 100, supplier: 1, vintage: 2018, ... }
   * token id 1 URI points to vintage information (e.g., 2019) nori.com/api/removal/1 -> { amount: 10, supplier: 1, vintage: 2019, ... }
   * token id 2 URI points to vintage information (e.g., 2020) nori.com/api/removal/2 -> { amount: 50, supplier: 1, vintage: 2020, ... }
   * @param to The supplier address
   * @param amounts Each removal's tonnes of CO2 formatted as wei
   * @param vintages The year for each removal
   * @param data Encodes the market contract address and a unique identifier for the parcel from whence these removals came.
   */
  function mintBatch(
    address to,
    uint256[] memory amounts,
    uint256[] memory vintages,
    bytes memory data
  ) public override {
    // todo require vintage is within valid year range and doesn't already exist
    BatchMintRemovalsData memory decodedData = abi.decode(
      data,
      (BatchMintRemovalsData)
    );

    uint256[] memory ids = new uint256[](vintages.length);
    for (uint256 i = 0; i < vintages.length; i++) {
      bytes32 uniqueIdHash = keccak256(
        abi.encodePacked(decodedData.uniqueId, vintages[i])
      );

      ids[i] = _latestTokenId + i;
      _vintages[_latestTokenId + i] = Vintage({
        vintage: uint16(vintages[i]),
        supplier: to,
        uniqueId: uniqueIdHash
      });
      _vintageToTokenIdMap[uniqueIdHash] = _latestTokenId + i;
    }
    _latestTokenId = ids[ids.length - 1] + 1;
    super.mintBatch(to, ids, amounts, data);
    setApprovalForAllAsAdmin(to, _msgSender(), true); // todo look at vesting contract for potentially better approach
    if (decodedData.list) {
      super.safeBatchTransferFrom(
        to,
        decodedData.marketAddress,
        ids,
        amounts,
        data
      );
    }
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
    super.safeBatchTransferFrom(_from, _to, _ids, _amounts, _data);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC1155Upgradeable, ERC1155PresetMinterPauserUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  )
    internal
    override(ERC1155PresetMinterPauserUpgradeable, ERC1155SupplyUpgradeable)
  {
    return super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }
}
