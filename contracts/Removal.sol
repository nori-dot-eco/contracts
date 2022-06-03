// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import {RemovalUtils, UnpackedRemovalIdV0} from "./RemovalUtils.sol";

// import "hardhat/console.sol"; // todo

// todo non-transferable/approveable after mint (except by DEFAULT_ADMIN_ROLE)
// todo disable other mint functions

error TokenIdExists();

/**
 * @title Removal
 */
contract Removal is
  ERC1155PresetMinterPauserUpgradeable,
  ERC1155SupplyUpgradeable
{
  using SafeMathUpgradeable for uint256;
  using RemovalUtils for uint256;

  struct BatchMintRemovalsData {
    // todo why doesnt typechain generate this as a type?
    address marketAddress;
    bool list;
  }

  uint256 private _tokenIdCounter;
  string public name; // todo why did I add this
  mapping(uint256 => uint256) public indexToTokenId; // todo consider how we're keeping track of the number and order of ids, ability to iterate
  mapping(uint256 => bool) private _tokenIdExists;

  function initialize() public virtual initializer {
    super.initialize("https://nori.com/api/removal/{id}.json");
    __ERC1155Supply_init_unchained();
    _tokenIdCounter = 0;
    name = "Removal";
  }

  /**
   * @dev See {IERC1155-setApprovalForAll}.
   */
  function setApprovalForAll(
    address owner,
    address operator,
    bool approved
  ) public virtual onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
    _setApprovalForAll(owner, operator, approved);
  }

  /**
   * @notice Packs data about a removal into a 256-bit token id for the removal.
   * @dev Performs some possible validations on the data before attempting to create the id.
   * @param removalData removal data encoded as bytes, with the first byte storing the version.
   */
  function createRemovalId(bytes calldata removalData)
    public
    pure
    returns (uint256)
  {
    return RemovalUtils.createRemovalId(removalData);
  }

  /**
   * @notice Unpacks a V0 removal id into its component data.
   */
  function unpackRemovalIdV0(uint256 removalId)
    public
    pure
    returns (UnpackedRemovalIdV0 memory)
  {
    return removalId.unpackRemovalIdV0();
  }

  /**
   * @dev mints multiple removals at once (for a single supplier).
   * If `list` is true in the decoded BatchMintRemovalsData, also lists those removals for sale in the market.
   * amounts: [100 * (10 ** 18), 10 * (10 ** 18), 50 * (10 ** 18)] <- 100 tonnes, 10 tonnes, 50 tonnes in standard erc20 units (wei)
   * token id 0 URI points to vintage information (e.g., 2018) nori.com/api/removal/0 -> { amount: 100, supplier: 1, vintage: 2018, ... }
   * token id 1 URI points to vintage information (e.g., 2019) nori.com/api/removal/1 -> { amount: 10, supplier: 1, vintage: 2019, ... }
   * token id 2 URI points to vintage information (e.g., 2020) nori.com/api/removal/2 -> { amount: 50, supplier: 1, vintage: 2020, ... }
   * @param to The supplier address
   * @param amounts Each removal's tonnes of CO2 formatted as wei
   * @param ids The token ids to use for this batch of removals. The id itself encodes the supplier's ethereum address, a parcel identifier,
   * the vintage, country code, state code, methodology identifer, and methodology version.
   * @param data Encodes the market contract address and a unique identifier for the parcel from whence these removals came.
   */
  function mintBatch(
    address to, // todo this should probably also accept a list of addresses
    uint256[] memory amounts,
    uint256[] memory ids,
    bytes memory data
  ) public override {
    BatchMintRemovalsData memory decodedData = abi.decode(
      data,
      (BatchMintRemovalsData)
    );
    for (uint256 i = 0; i < ids.length; i++) {
      if (_tokenIdExists[ids[i]]) {
        revert TokenIdExists(); // todo can the duplicate token id be reported here?
      }
      _tokenIdExists[ids[i]] = true;
      indexToTokenId[_tokenIdCounter] = ids[i];
      _tokenIdCounter += 1;
    }
    super.mintBatch(to, ids, amounts, data);

    setApprovalForAll(to, _msgSender(), true); // todo look at vesting contract for potentially better approach
    if (decodedData.list) {
      safeBatchTransferFrom(to, decodedData.marketAddress, ids, amounts, data);
    }
  }

  /**
   * @dev used to initiate a sale of removals by transferring the removals to the market contract
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
