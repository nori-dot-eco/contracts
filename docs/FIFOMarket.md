## FIFOMarket







---

### _erc1820

```solidity
contract IERC1820RegistryUpgradeable _erc1820
```






### _removal

```solidity
contract Removal _removal
```






### _certificate

```solidity
contract Certificate _certificate
```






### _bridgedPolygonNori

```solidity
contract BridgedPolygonNORI _bridgedPolygonNori
```






### _queue

```solidity
mapping(uint256 &#x3D;&gt; uint256) _queue
```






### _queueHeadIndex

```solidity
uint256 _queueHeadIndex
```






### _queueNextInsertIndex

```solidity
uint256 _queueNextInsertIndex
```






### _noriFeeWallet

```solidity
address _noriFeeWallet
```






### _noriFee

```solidity
uint256 _noriFee
```






### priorityRestrictedThreshold

```solidity
uint256 priorityRestrictedThreshold
```






### totalSupply

```solidity
uint256 totalSupply
```






### ALLOWLIST_ROLE

```solidity
bytes32 ALLOWLIST_ROLE
```

Role allowing the purchase of supply when inventory is below the priority restricted threshold.




### PriorityRestrictedThresholdSet

```solidity
event PriorityRestrictedThresholdSet(uint256 threshold)
```

Emitted on setting of priorityRestrictedThreshold.




### initialize

```solidity
function initialize(address removalAddress, address bridgedPolygonNoriAddress, address certificateAddress, address noriFeeWalletAddress, uint256 noriFee) public
```






### setPriorityRestrictedThreshold

```solidity
function setPriorityRestrictedThreshold(uint256 threshold) external
```






### _queueLength

```solidity
function _queueLength() private view returns (uint256)
```






### numberOfNrtsInQueueComputed

```solidity
function numberOfNrtsInQueueComputed() public view returns (uint256)
```






### totalUnrestrictedSupply

```solidity
function totalUnrestrictedSupply() public view returns (uint256)
```






### nextRemovalForSale

```solidity
function nextRemovalForSale(bool includePriorityRestrictedSupply) public view returns (uint256)
```






### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[] ids, uint256[], bytes) public returns (bytes4)
```






### tokensReceived

```solidity
function tokensReceived(address, address from, address, uint256 amount, bytes userData, bytes) external
```



_Called automatically by the ERC777 (nori) contract when a batch of tokens are transferred to the contract._



### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```








