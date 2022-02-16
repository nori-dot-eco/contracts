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






### initialize

```solidity
function initialize(address removalAddress, address bridgedPolygonNoriAddress, address certificateAddress, address noriFeeWalletAddress, uint256 noriFee) public
```






### _queueLength

```solidity
function _queueLength() private view returns (uint256)
```






### numberOfNrtsInQueue

```solidity
function numberOfNrtsInQueue() public view returns (uint256)
```






### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[] ids, uint256[], bytes) public returns (bytes4)
```






### tokensReceived

```solidity
function tokensReceived(address, address, address, uint256 amount, bytes userData, bytes) external
```



_Called automatically by the ERC777 (nori) contract when a batch of tokens are transferred to the contract._



### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```








