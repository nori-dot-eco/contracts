// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "../Market.sol";
import "../Certificate.sol";

struct BatchMintRemovalsData {
  uint256 projectId; // todo what is the max project ID size? Smaller id allows tighter `BatchMintRemovalsData` struct
  uint256 scheduleStartTime;
  uint8 holdbackPercentage;
  bool list;
}

struct UnpackedRemovalIdV0 {
  uint8 idVersion;
  uint8 methodology;
  uint8 methodologyVersion;
  uint16 vintage;
  bytes2 country;
  bytes2 subdivision;
  address supplierAddress;
  uint32 subIdentifier;
}

struct ScheduleData {
  uint256 startTime;
  address supplierAddress;
  uint256 methodology;
  uint256 methodologyVersion;
}

struct RemovalData {
  uint256 projectId;
  uint256 holdbackPercentage;
}

error TokenIdExists(uint256 tokenId);
error RemovalAmountZero(uint256 tokenId);

interface IRemoval is IERC1155Upgradeable {
  function registerContractAddresses(Market market, Certificate certificate)
    external;

  function release(uint256 removalId, uint256 amount) external;

  function mintBatch(
    address to,
    uint256[] memory amounts,
    uint256[] memory ids,
    BatchMintRemovalsData memory data
  ) external;

  // function renounceRole(bytes32 role, address account) external;

  // function revokeRole(bytes32 role, address account) external;

  // function safeBatchTransferFrom(
  //   address from,
  //   address to,
  //   uint256[] memory ids,
  //   uint256[] memory amounts,
  //   bytes memory data
  // ) external;

  // function safeTransferFrom(
  //   address from,
  //   address to,
  //   uint256 id,
  //   uint256 amount,
  //   bytes memory data
  // ) external;

  // function setApprovalForAll(address operator, bool approved) external;

  // function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

  function MINTER_ROLE() external view returns (bytes32);

  function RELEASER_ROLE() external view returns (bytes32);

  // function PAUSER_ROLE() external view returns (bytes32);

  // function balanceOf(address account, uint256 id)
  //   external
  //   view
  //   returns (uint256);

  // function balanceOfBatch(address[] memory accounts, uint256[] memory ids)
  //   external
  //   view
  //   returns (uint256[] memory);

  function balanceOfIds(address account, uint256[] memory ids)
    external
    view
    returns (uint256[] memory);

  function batchGetHoldbackPercentages(uint256[] memory removalIds)
    external
    view
    returns (uint256[] memory);

  function certificateAddress() external view returns (address);

  function cumulativeBalanceOf(address owner) external view returns (uint256);

  // function exists(uint256 id) external view returns (bool);

  function getProjectIdForRemoval(uint256 removalId)
    external
    view
    returns (uint256);

  function marketAddress() external view returns (address);

  function numberOfTokensOwnedByAddress(address account)
    external
    view
    returns (uint256);

  // function getRoleAdmin(bytes32 role) external view returns (bytes32);

  // function getRoleMember(bytes32 role, uint256 index)
  //   external
  //   view
  //   returns (address);

  // function getRoleMemberCount(bytes32 role) external view returns (uint256);

  function getScheduleDataForProjectId(uint256 projectId)
    external
    view
    returns (ScheduleData memory);

  function getScheduleDataForRemovalId(uint256 removalId)
    external
    view
    returns (ScheduleData memory);

  // function grantRole(bytes32 role, address account) external;

  // function hasRole(bytes32 role, address account) external view returns (bool);

  // function initialize() external;

  // function isApprovedForAll(address account, address operator)
  //   external
  //   view
  //   returns (bool);

  // function multicall(bytes[] memory data)
  //   external
  //   returns (bytes[] memory results);

  // function pause() external;

  // function paused() external view returns (bool);

  // function supportsInterface(bytes4 interfaceId) external view returns (bool);

  function tokensOfOwner(address owner)
    external
    view
    returns (uint256[] memory);

  // function totalSupply(uint256 id) external view returns (uint256);

  function unpackRemovalIdV0(uint256 removalId)
    external
    pure
    returns (UnpackedRemovalIdV0 memory);

  function createRemovalId(UnpackedRemovalIdV0 memory removalData)
    external
    pure
    returns (uint256);

  // function unpause() external;

  // function uri(uint256) external view returns (string memory);
}
