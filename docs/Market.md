## Market

---

### RoundRobinOrder

```solidity
struct RoundRobinOrder {
  address previousSupplierAddress;
  address nextSupplierAddress;
}

```

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

### \_noriFeeWallet

```solidity
address _noriFeeWallet
```

### \_noriFee

```solidity
uint256 _noriFee
```

### priorityRestrictedThreshold

```solidity
uint256 priorityRestrictedThreshold
```

### totalNumberActiveRemovals

```solidity
uint256 totalNumberActiveRemovals
```

### totalActiveSupply

```solidity
uint256 totalActiveSupply
```

### totalReservedSupply

```solidity
uint256 totalReservedSupply
```

### activeSupplierCount

```solidity
uint256 activeSupplierCount
```

### \_currentSupplierAddress

```solidity
address _currentSupplierAddress
```

### \_suppliersInRoundRobinOrder

```solidity
mapping(address &#x3D;&gt; struct Market.RoundRobinOrder) _suppliersInRoundRobinOrder
```

### \_activeSupply

```solidity
mapping(address &#x3D;&gt; struct RemovalQueueByVintage) _activeSupply
```

### \_reservedSupply

```solidity
struct EnumerableSetUpgradeable.UintSet _reservedSupply
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

### numberOfActiveNrtsInMarketComputed

```solidity
function numberOfActiveNrtsInMarketComputed() external view returns (uint256)
```

The amount of supply as computed by iterating through all removals.

### totalUnrestrictedSupply

```solidity
function totalUnrestrictedSupply() public view returns (uint256)
```

The amount of supply available for anyone to buy.

### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[] ids, uint256[], bytes) public returns (bytes4)
```

_Will not work if the removals are for more than one supplier!_

### tokensReceived

```solidity
function tokensReceived(address, address from, address, uint256 amount, bytes userData, bytes) external
```

_Called automatically by the ERC777 (nori) contract when a batch of tokens are transferred to the contract._

### reserveRemoval

```solidity
function reserveRemoval(uint256 removalId) external returns (bool)
```

Removes removal from active supply and inserts it into the reserved supply, where it cannot be used to
fill orders.

_If the removal is the last for the supplier, removes the supplier from the active supplier queue._

### unreserveRemoval

```solidity
function unreserveRemoval(uint256 removalId) external returns (bool)
```

Adds the removal back to active supply to be sold.

_Removes removal from reserved supply and re-inserts it into the active supply, where it can be used to
fill orders again. If the supplier&#x27;s other removals have all been sold, adds the supplier back to the
list of active suppliers_

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

### \_incrementCurrentSupplierAddress

```solidity
function _incrementCurrentSupplierAddress() private
```

Increments the address of the current supplier.

_Called the current supplier&#x27;s removal is sold, or their last removal is reserved.
Updates \_currentSupplierAddress to the next of whatever is the current supplier._

### \_addActiveSupplier

```solidity
function _addActiveSupplier(address supplierAddress) private
```

Adds a supplier to the active supplier queue

_Called when a new supplier is added to the marketplace, or after they have sold out and a reserved removal is
unreserved. If the first supplier, initializes a cicularly doubly-linked list, where initially the first supplier
points to itself as next and previous. When a new supplier is added, at the position of the current supplier,
update the previous pointer of the current supplier to point to the new supplier, and update the next pointer of
the previous supplier to the new supplier._

### \_removeActiveSupplier

```solidity
function _removeActiveSupplier(address supplierToRemove) private
```

Removes a supplier to the active supplier queue

_Called when a supplier&#x27;s last removal is used for an order or reserved. If the last supplier,
resets the pointer for \_currentSupplierAddress. Otherwise, from the position of the supplier to be
removed, update the previous supplier to point to the next of the removed supplier, and the next of
the removed supplier to point to the previous of the remove supplier. Then, set the next and previous
pointers of the removed supplier to the 0x address._

## Market

---

### RoundRobinOrder

```solidity
struct RoundRobinOrder {
  address previousSupplierAddress;
  address nextSupplierAddress;
}

```

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

### \_noriFeeWallet

```solidity
address _noriFeeWallet
```

### \_noriFee

```solidity
uint256 _noriFee
```

### priorityRestrictedThreshold

```solidity
uint256 priorityRestrictedThreshold
```

### totalNumberActiveRemovals

```solidity
uint256 totalNumberActiveRemovals
```

### totalActiveSupply

```solidity
uint256 totalActiveSupply
```

### totalReservedSupply

```solidity
uint256 totalReservedSupply
```

### activeSupplierCount

```solidity
uint256 activeSupplierCount
```

### \_currentSupplierAddress

```solidity
address _currentSupplierAddress
```

### \_suppliersInRoundRobinOrder

```solidity
mapping(address &#x3D;&gt; struct Market.RoundRobinOrder) _suppliersInRoundRobinOrder
```

### \_activeSupply

```solidity
mapping(address &#x3D;&gt; struct RemovalQueueByVintage) _activeSupply
```

### \_reservedSupply

```solidity
struct EnumerableSetUpgradeable.UintSet _reservedSupply
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

### numberOfActiveNrtsInMarketComputed

```solidity
function numberOfActiveNrtsInMarketComputed() external view returns (uint256)
```

The amount of supply as computed by iterating through all removals.

### totalUnrestrictedSupply

```solidity
function totalUnrestrictedSupply() public view returns (uint256)
```

The amount of supply available for anyone to buy.

### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[] ids, uint256[], bytes) public returns (bytes4)
```

### tokensReceived

```solidity
function tokensReceived(address, address from, address, uint256 amount, bytes userData, bytes) external
```

_Called automatically by the ERC777 (nori) contract when a batch of tokens are transferred to the contract._

### reserveRemoval

```solidity
function reserveRemoval(uint256 removalId) external returns (bool)
```

Removes removal from active supply and inserts it into the reserved supply, where it cannot be used to
fill orders.

_If the removal is the last for the supplier, removes the supplier from the active supplier queue._

### unreserveRemoval

```solidity
function unreserveRemoval(uint256 removalId) external returns (bool)
```

Adds the removal back to active supply to be sold.

_Removes removal from reserved supply and re-inserts it into the active supply, where it can be used to
fill orders again. If the supplier&#x27;s other removals have all been sold, adds the supplier back to the
list of active suppliers_

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

### \_incrementCurrentSupplierAddress

```solidity
function _incrementCurrentSupplierAddress() private
```

Increments the address of the current supplier.

_Called the current supplier&#x27;s removal is sold, or their last removal is reserved.
Updates \_currentSupplierAddress to the next of whatever is the current supplier._

### \_addActiveSupplier

```solidity
function _addActiveSupplier(address supplierAddress) private
```

Adds a supplier to the active supplier queue

_Called when a new supplier is added to the marketplace, or after they have sold out and a reserved removal is
unreserved. If the first supplier, initializes a cicularly doubly-linked list, where initially the first supplier
points to itself as next and previous. When a new supplier is added, at the position of the current supplier,
update the previous pointer of the current supplier to point to the new supplier, and update the next pointer of
the previous supplier to the new supplier._

### \_removeActiveSupplier

```solidity
function _removeActiveSupplier(address supplierToRemove) private
```

Removes a supplier to the active supplier queue

_Called when a supplier&#x27;s last removal is used for an order or reserved. If the last supplier,
resets the pointer for \_currentSupplierAddress. Otherwise, from the position of the supplier to be
removed, update the previous supplier to point to the next of the removed supplier, and the next of
the removed supplier to point to the previous of the remove supplier. Then, set the next and previous
pointers of the removed supplier to the 0x address._

## Market

---

### RoundRobinOrder

```solidity
struct RoundRobinOrder {
  address previousSupplierAddress;
  address nextSupplierAddress;
}

```

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

### \_noriFeeWallet

```solidity
address _noriFeeWallet
```

### \_noriFee

```solidity
uint256 _noriFee
```

### priorityRestrictedThreshold

```solidity
uint256 priorityRestrictedThreshold
```

### totalNumberActiveRemovals

```solidity
uint256 totalNumberActiveRemovals
```

### totalActiveSupply

```solidity
uint256 totalActiveSupply
```

### totalReservedSupply

```solidity
uint256 totalReservedSupply
```

### activeSupplierCount

```solidity
uint256 activeSupplierCount
```

### \_currentSupplierAddress

```solidity
address _currentSupplierAddress
```

### \_suppliersInRoundRobinOrder

```solidity
mapping(address &#x3D;&gt; struct Market.RoundRobinOrder) _suppliersInRoundRobinOrder
```

### \_activeSupply

```solidity
mapping(address &#x3D;&gt; struct RemovalQueueByVintage) _activeSupply
```

### \_reservedSupply

```solidity
struct EnumerableSetUpgradeable.UintSet _reservedSupply
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

### numberOfActiveNrtsInMarketComputed

```solidity
function numberOfActiveNrtsInMarketComputed() external view returns (uint256)
```

The amount of supply as computed by iterating through all removals.

### totalUnrestrictedSupply

```solidity
function totalUnrestrictedSupply() public view returns (uint256)
```

The amount of supply available for anyone to buy.

### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[] ids, uint256[], bytes) public returns (bytes4)
```

_Will not work if the removals are for more than one supplier!_

### tokensReceived

```solidity
function tokensReceived(address, address from, address, uint256 amount, bytes userData, bytes) external
```

_Called automatically by the ERC777 (nori) contract when a batch of tokens are transferred to the contract._

### reserveRemoval

```solidity
function reserveRemoval(uint256 removalId) external returns (bool)
```

Removes removal from active supply and inserts it into the reserved supply, where it cannot be used to
fill orders.

_If the removal is the last for the supplier, removes the supplier from the active supplier queue._

### unreserveRemoval

```solidity
function unreserveRemoval(uint256 removalId) external returns (bool)
```

Adds the removal back to active supply to be sold.

_Removes removal from reserved supply and re-inserts it into the active supply, where it can be used to
fill orders again. If the supplier&#x27;s other removals have all been sold, adds the supplier back to the
list of active suppliers_

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

### \_incrementCurrentSupplierAddress

```solidity
function _incrementCurrentSupplierAddress() private
```

Increments the address of the current supplier.

_Called the current supplier&#x27;s removal is sold, or their last removal is reserved.
Updates \_currentSupplierAddress to the next of whatever is the current supplier._

### \_addActiveSupplier

```solidity
function _addActiveSupplier(address supplierAddress) private
```

Adds a supplier to the active supplier queue

_Called when a new supplier is added to the marketplace, or after they have sold out and a reserved removal is
unreserved. If the first supplier, initializes a cicularly doubly-linked list, where initially the first supplier
points to itself as next and previous. When a new supplier is added, at the position of the current supplier,
update the previous pointer of the current supplier to point to the new supplier, and update the next pointer of
the previous supplier to the new supplier._

### \_removeActiveSupplier

```solidity
function _removeActiveSupplier(address supplierToRemove) private
```

Removes a supplier to the active supplier queue

_Called when a supplier&#x27;s last removal is used for an order or reserved. If the last supplier,
resets the pointer for \_currentSupplierAddress. Otherwise, from the position of the supplier to be
removed, update the previous supplier to point to the next of the removed supplier, and the next of
the removed supplier to point to the previous of the remove supplier. Then, set the next and previous
pointers of the removed supplier to the 0x address._
