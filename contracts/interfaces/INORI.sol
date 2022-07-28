pragma solidity ^0.8.10;

interface INORI {
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Initialized(uint8 version);
    event Paused(address account);
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Unpaused(address account);

    function DEFAULT_ADMIN_ROLE() view external returns (bytes32);
    function DOMAIN_SEPARATOR() view external returns (bytes32);
    function PAUSER_ROLE() view external returns (bytes32);
    function allowance(address owner, address spender) view external returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) view external returns (uint256);
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function decimals() view external returns (uint8);
    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
    function getRoleAdmin(bytes32 role) view external returns (bytes32);
    function getRoleMember(bytes32 role, uint256 index) view external returns (address);
    function getRoleMemberCount(bytes32 role) view external returns (uint256);
    function grantRole(bytes32 role, address account) external;
    function hasRole(bytes32 role, address account) view external returns (bool);
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
    function initialize() external;
    function multicall(bytes[] memory data) external returns (bytes[] memory results);
    function name() view external returns (string memory);
    function nonces(address owner) view external returns (uint256);
    function pause() external;
    function paused() view external returns (bool);
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
    function renounceRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function supportsInterface(bytes4 interfaceId) view external returns (bool);
    function symbol() view external returns (string memory);
    function totalSupply() view external returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function unpause() external;
}
