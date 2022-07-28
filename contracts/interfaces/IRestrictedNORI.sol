pragma solidity ^0.8.10;

interface IRestrictedNORI {
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event Initialized(uint8 version);
    event Paused(address account);
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event ScheduleCreated(uint256 indexed projectId, uint256 startTime, uint256 endTime);
    event TokensClaimed(address indexed from, address indexed to, uint256 indexed scheduleId, uint256 quantity);
    event TokensRevoked(uint256 indexed atTime, uint256 indexed scheduleId, uint256 quantity, address[] scheduleOwners, uint256[] quantitiesBurned);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event URI(string value, uint256 indexed id);
    event Unpaused(address account);

    struct struct ScheduleSummary { uint256 a; uint256 b; uint256 c; uint256 d; uint256 e; uint256 f; uint256 g; address[] h; bool i; }
    struct struct ScheduleDetailForAddress { address a; uint256 b; uint256 c; uint256 d; uint256 e; uint256 f; }

    function DEFAULT_ADMIN_ROLE() view external returns (bytes32);
    function MINTER_ROLE() view external returns (bytes32);
    function PAUSER_ROLE() view external returns (bytes32);
    function SCHEDULE_CREATOR_ROLE() view external returns (bytes32);
    function TOKEN_REVOKER_ROLE() view external returns (bytes32);
    function balanceOf(address account, uint256 id) view external returns (uint256);
    function balanceOfBatch(address[] memory accounts, uint256[] memory ids) view external returns (uint256[] memory);
    function batchGetScheduleDetailsForAccount(address account, uint256[] memory scheduleIds) view external returns ((address,uint256,uint256,uint256,uint256,uint256)[] memory);
    function batchGetScheduleSummaries(uint256[] memory scheduleIds) view external returns ((uint256,uint256,uint256,uint256,uint256,uint256,uint256,address[],bool)[] memory);
    function claimableBalanceForSchedule(uint256 scheduleId) view external returns (uint256);
    function claimableBalanceForScheduleForAccount(uint256 scheduleId, address account) view external returns (uint256);
    function createSchedule(uint256 projectId) external;
    function exists(uint256 id) view external returns (bool);
    function getAllScheduleIds() view external returns (uint256[] memory);
    function getRestrictionDurationForMethodologyAndVersion(uint256 methodology, uint256 methodologyVersion) view external returns (uint256);
    function getRoleAdmin(bytes32 role) view external returns (bytes32);
    function getRoleMember(bytes32 role, uint256 index) view external returns (address);
    function getRoleMemberCount(bytes32 role) view external returns (uint256);
    function getScheduleDetailForAccount(address account, uint256 scheduleId) view external returns (struct ScheduleDetailForAddress memory);
    function getScheduleSummary(uint256 scheduleId) view external returns (struct ScheduleSummary memory);
    function grantRole(bytes32 role, address account) external;
    function hasRole(bytes32 role, address account) view external returns (bool);
    function initialize() external;
    function isApprovedForAll(address account, address operator) view external returns (bool);
    function mint(uint256 amount, uint256 removalId) external;
    function pause() external;
    function paused() view external returns (bool);
    function registerContractAddresses(address bpNori, address removal) external;
    function renounceRole(bytes32 role, address account) external;
    function revocableQuantityForSchedule(uint256 scheduleId) view external returns (uint256);
    function revokeRole(bytes32 role, address account) external;
    function revokeUnreleasedTokens(uint256 projectId, uint256 amount, address toAccount) external;
    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external;
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) external;
    function setApprovalForAll(address operator, bool approved) external;
    function setRestrictionDurationForMethodologyAndVersion(uint256 methodology, uint256 methodologyVersion, uint256 durationInSeconds) external;
    function supportsInterface(bytes4 interfaceId) view external returns (bool);
    function totalSupply(uint256 id) view external returns (uint256);
    function unpause() external;
    function uri(uint256) view external returns (string memory);
    function withdrawFromSchedule(address recipient, uint256 scheduleId, uint256 amount) external returns (bool);
}
