// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/presets/ERC1155PresetMinterPauserUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/ERC777Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC777/IERC777RecipientUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC1820ImplementerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./RestrictedNORI.sol";
import {RemovalUtils, UnpackedRemovalIdV0} from "./RemovalUtils.sol";

// import "hardhat/console.sol"; // todo

// todo non-transferable/approveable after mint (except by DEFAULT_ADMIN_ROLE)
// todo disable other mint functions

error TokenIdExists(uint256 tokenId);
error MissingRole(address account, string role);
error ArrayLengthMismatch(string array1Name, string array2Name);
error InvalidProjectId(uint256 projectId);
error InvalidScheduleStartTime(uint256 startTime);

uint256 constant UNIX_EPOCH_2010 = 1262304000;
uint256 constant UNIX_EPOCH_2050 = 2524608000;

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
    uint256 projectId;
    uint256 scheduleStartTime;
    address marketAddress;
    bool list;
  }

  struct ScheduleData {
    uint256 startTime;
    address supplierAddress;
    uint256 methodology;
    uint256 methodologyVersion;
  }

  /**
   * @notice The RestrictedNORI contract that manages restricted tokens.
   */
  RestrictedNORI private _restrictedNori;
  uint256 public tokenIdCounter;
  string public name; // todo why did I add this
  mapping(uint256 => uint256) public indexToTokenId; // todo consider how we're keeping track of the number and order of ids, ability to iterate
  mapping(uint256 => bool) private _tokenIdExists;
  mapping(uint256 => uint256) private _removalIdToProjectId;
  mapping(uint256 => ScheduleData) private _projectIdToScheduleData;

  function initialize() external virtual initializer {
    super.initialize("https://nori.com/api/removal/{id}.json");
    __ERC1155Supply_init_unchained();
    tokenIdCounter = 0;
    name = "Removal";
  }

  function initializeRestrictedNORI(address restrictedNORIAddress)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _restrictedNori = RestrictedNORI(restrictedNORIAddress);
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

  // TODO do we want a batch version of this?
  /**
   * @notice Get the restriction schedule id (which is the removal's project id) for a given removal id.
   */
  function getProjectIdForRemoval(uint256 removalId)
    public
    view
    returns (uint256)
  {
    return _removalIdToProjectId[removalId];
  }

  /**
   * @notice Get the restriction schedule data for a given project id.
   */
  function getScheduleData(uint256 projectId)
    public
    view
    returns (ScheduleData memory)
  {
    return _projectIdToScheduleData[projectId];
  }

  /**
   * @dev mints multiple removals at once (for a single supplier).
   * If `list` is true in the decoded BatchMintRemovalsData, also lists those removals for sale in the market.
   * amounts: [100 * (10 ** 18), 10 * (10 ** 18), 50 * (10 ** 18)] <- 100 tonnes, 10 tonnes, 50 tonnes in standard erc20 units (wei)
   * token id 0 URI points to vintage information (e.g., 2018) nori.com/api/removal/0 -> { amount: 100, supplier: 1, vintage: 2018, ... }
   * token id 1 URI points to vintage information (e.g., 2019) nori.com/api/removal/1 -> { amount: 10, supplier: 1, vintage: 2019, ... }
   * token id 2 URI points to vintage information (e.g., 2020) nori.com/api/removal/2 -> { amount: 50, supplier: 1, vintage: 2020, ... }
   *
   * @param to The supplier address
   * @param amounts Each removal's tonnes of CO2 formatted as wei
   * @param ids The token ids to use for this batch of removals. The id itself encodes the supplier's ethereum address, a parcel identifier,
   * the vintage, country code, state code, methodology identifer, methodology version, and id format.
   * @param data Encodes the project id and schedule start time for this batch of removals, the market contract
   * address and a boolean that indicates whether to list these removals for sale now.
   */
  function mintBatch(
    address to,
    uint256[] memory amounts,
    uint256[] memory ids,
    bytes memory data
  ) public override {
    if (!(amounts.length == ids.length)) {
      revert ArrayLengthMismatch({array1Name: "amounts", array2Name: "ids"});
    }
    // todo should we check that the removal id-encoded supplier address for each id is the same as `to` ?
    // todo should we validate the removal ids any further? what about other malformed fields?
    //    note that there is validation performed when creating ids in the first place, but room for errors/changes between id creation and then submission to this function
    // todo do we add any validation to enforce that all removals in batch belong to the same project id?
    BatchMintRemovalsData memory decodedData = abi.decode(
      data,
      (BatchMintRemovalsData)
    );
    if (decodedData.projectId == 0) {
      revert InvalidProjectId({projectId: decodedData.projectId});
    }
    if (
      decodedData.scheduleStartTime < UNIX_EPOCH_2010 ||
      decodedData.scheduleStartTime > UNIX_EPOCH_2050
    ) {
      revert InvalidScheduleStartTime({
        startTime: decodedData.scheduleStartTime
      });
    }
    for (uint256 i = 0; i < ids.length; i++) {
      if (_tokenIdExists[ids[i]]) {
        revert TokenIdExists({tokenId: ids[i]});
      }
      _removalIdToProjectId[ids[i]] = decodedData.projectId;
      _tokenIdExists[ids[i]] = true;
      indexToTokenId[tokenIdCounter] = ids[i];
      tokenIdCounter += 1;
    }
    _projectIdToScheduleData[decodedData.projectId] = ScheduleData(
      decodedData.scheduleStartTime,
      ids[0].supplierAddress(),
      ids[0].methodology(),
      ids[0].methodologyVersion()
    );
    super.mintBatch(to, ids, amounts, data);

    setApprovalForAll(to, _msgSender(), true); // todo look at vesting contract for potentially better approach
    if (decodedData.list) {
      safeBatchTransferFrom(to, decodedData.marketAddress, ids, amounts, data);
    }
  }

  function mint(
    address,
    uint256,
    uint256,
    bytes calldata
  ) public pure override {
    revert("Removal: ERC 1155 mint disabled");
  }

  /**
   * @dev used to list removals for sale by transferring the removals to the market contract
   *
   * ### Requirements:
   *  - all removals being listed must belong to the same project id.
   */
  function safeBatchTransferFrom(
    address _from,
    address _to,
    uint256[] memory ids,
    uint256[] memory _amounts,
    bytes memory _data
  ) public override {
    // todo do we add any validation to enforce that all removals in batch belong to the same project id?
    uint256 projectId = _removalIdToProjectId[ids[0]];
    _restrictedNori.createSchedule(projectId);
    // todo require _to is a known market contract
    super.safeBatchTransferFrom(_from, _to, ids, _amounts, _data);
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

  function balanceOfIds(address account, uint256[] memory ids)
    external
    view
    returns (uint256[] memory)
  {
    uint256[] memory batchBalances = new uint256[](ids.length);
    for (uint256 i = 0; i < ids.length; ++i) {
      batchBalances[i] = balanceOf(account, ids[i]);
    }
    return batchBalances;
  }
}
