## FIFOMarket

---

### \_erc1820

```solidity
contract IERC1820RegistryUpgradeable _erc1820
```

### \_removal

```solidity
contract Removal _removal
```

### \_certificate

```solidity
contract Certificate _certificate
```

### \_bridgedPolygonNori

```solidity
contract BridgedPolygonNORI _bridgedPolygonNori
```

### \_queue

```solidity
mapping(uint256 &#x3D;&gt; uint256) _queue
```

### \_queueHeadIndex

```solidity
uint256 _queueHeadIndex
```

### \_queueNextInsertIndex

```solidity
uint256 _queueNextInsertIndex
```

### \_noriFeeWallet

```solidity
address _noriFeeWallet
```

### \_noriFee

```solidity
uint256 _noriFee
```

### initialize

```solidity
function initialize(address removalAddress, address bridgedPolygonNoriAddress, address certificateAddress, address noriFeeWalletAddress, uint256 noriFee) public
```

### \_queueLength

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

### \_addActiveSupplier

```solidity
function addActiveSupplier(address, supplierAddress) external
```

_Called when a new supplier is added to the marketplace. If the first supplier, initializes a cicularly doubly-linked list, where initially the first supplier points to itself as next and previous. When a new supplier is added, at the position of the current supplier, update the previous pointer of the current supplier to point to the new supplier, and update the next pointer of the previous supplier to the new supplier._

### \_removeActiveSupplier

```solidity
function addActiveSupplier(address, supplierAddress) external
```

_Called when a supplier's last removal is used for an order or reserved. If the last supplier, resets the pointer for \_currentSupplierAddress. Otherwise, from the position of the supplier to be removed, update the previous supplier to point to the next of the removed supplier, and the next of the removed supplier to point to the previous of the remove supplier. Then, set the next and previous pointers of the removed supplier to the 0x address._

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```
