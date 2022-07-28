pragma solidity ^0.8.10;

interface ICertificate {
    event ReceiveRemovalBatch(
      address from,
      address indexed recipient,
      uint256 indexed certificateId,
      uint256[] removalIds,
      uint256[] removalAmounts
    );
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event ConsecutiveTransfer(uint256 indexed fromTokenId, uint256 toTokenId, address indexed from, address indexed to);
    event Initialized(uint8 version);
    event Paused(address account);
    event ReceiveRemovalBatch(address from, address indexed recipient, uint256 indexed certificateId, uint256[] removalIds, uint256[] removalAmounts);
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Unpaused(address account);

    struct TokenOwnership { address a; uint64 b; bool c; uint24 d; }

    function CERTIFICATE_OPERATOR_ROLE() view external returns (bytes32);
    function DEFAULT_ADMIN_ROLE() view external returns (bytes32);
    function PAUSER_ROLE() view external returns (bytes32);
    function approve(address, uint256) pure external;
    function balanceOf(address owner) view external returns (uint256);
    function balanceOfRemoval(uint256 certificateTokenId, uint256 removalTokenId) view external returns (uint256);
    function burn(uint256 tokenId) external;
    function certificatesOfRemoval(uint256 removalId) view external returns ((uint256,uint256)[] memory);
    function explicitOwnershipOf(uint256 tokenId) view external returns (TokenOwnership memory);
    function explicitOwnershipsOf(uint256[] memory tokenIds) view external returns ((address,uint64,bool,uint24)[] memory);
    function getApproved(uint256 tokenId) view external returns (address);
    function getRoleAdmin(bytes32 role) view external returns (bytes32);
    function getRoleMember(bytes32 role, uint256 index) view external returns (address);
    function getRoleMemberCount(bytes32 role) view external returns (uint256);
    function grantRole(bytes32 role, address account) external;
    function hasRole(bytes32 role, address account) view external returns (bool);
    function initialize() external;
    function isApprovedForAll(address owner, address operator) view external returns (bool);
    function multicall(bytes[] memory data) external returns (bytes[] memory results);
    function name() view external returns (string memory);
    function onERC1155BatchReceived(address, address, uint256[] memory removalIds, uint256[] memory removalAmounts, bytes memory data) external returns (bytes4);
    function originalBalanceOf(uint256 certificateId) view external returns (uint256);
    function ownerOf(uint256 tokenId) view external returns (address);
    function pause() external;
    function paused() view external returns (bool);
    function registerContractAddresses(address removal) external;
    function releaseRemoval(uint256 certificateId, uint256 removalId, uint256 amount) external;
    function removalsOfCertificate(uint256 certificateId) view external returns ((uint256,uint256)[] memory);
    function renounceRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) external;
    function setApprovalForAll(address, bool) pure external;
    function supportsInterface(bytes4 interfaceId) view external returns (bool);
    function symbol() view external returns (string memory);
    function tokenURI(uint256 tokenId) view external returns (string memory);
    function tokensOfOwner(address owner) view external returns (uint256[] memory);
    function tokensOfOwnerIn(address owner, uint256 start, uint256 stop) view external returns (uint256[] memory);
    function totalMinted() view external returns (uint256);
    function totalSupply() view external returns (uint256);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function unpause() external;
}
