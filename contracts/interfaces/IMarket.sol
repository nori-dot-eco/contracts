pragma solidity ^0.8.10;

interface IMarket {
    event Initialized(uint8 version);
    event Paused(address account);
    event PriorityRestrictedThresholdSet(uint256 threshold);
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event Unpaused(address account);

    function ALLOWLIST_ROLE() view external returns (bytes32);
    function DEFAULT_ADMIN_ROLE() view external returns (bytes32);
    function PAUSER_ROLE() view external returns (bytes32);
    function certificateAmountFromPurchaseTotal(uint256 purchaseTotal) view external returns (uint256);
    function fulfillOrder(uint256 certificateAmount, address operator, address recipient, uint256 numberOfRemovals, uint256[] memory ids, uint256[] memory amounts, address[] memory suppliers) external;
    function getCheckoutTotal(uint256 amount) view external returns (uint256);
    function getNoriFee(uint256 amount) view external returns (uint256);
    function getRoleAdmin(bytes32 role) view external returns (bytes32);
    function getRoleMember(bytes32 role, uint256 index) view external returns (address);
    function getRoleMemberCount(bytes32 role) view external returns (uint256);
    function grantRole(bytes32 role, address account) external;
    function hasRole(bytes32 role, address account) view external returns (bool);
    function initialize(address removal, address bridgedPolygonNori, address certificate, address restrictedNori, address noriFeeWalletAddress, uint256 noriFeePercentage_) external;
    function noriFeePercentage() view external returns (uint256);
    function noriFeeWallet() view external returns (address);
    function onERC1155BatchReceived(address, address, uint256[] memory ids, uint256[] memory, bytes memory) external returns (bytes4);
    function pause() external;
    function paused() view external returns (bool);
    function priorityRestrictedThreshold() view external returns (uint256);
    function release(uint256 removalId, uint256 amount) external;
    function renounceRole(bytes32 role, address account) external;
    function restrictedNoriAddress() view external returns (address);
    function revokeRole(bytes32 role, address account) external;
    function setNoriFeePercentage(uint256 noriFeePercentage_) external;
    function setNoriFeeWallet(address noriFeeWalletAddress) external;
    function setPriorityRestrictedThreshold(uint256 threshold) external;
    function supportsInterface(bytes4 interfaceId) view external returns (bool);
    function swap(address recipient, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
    function swapFromSpecificSupplier(address recipient, uint256 amount, address supplierToBuyFrom, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
    function unpause() external;
    function withdraw(uint256 removalId) external;
}
