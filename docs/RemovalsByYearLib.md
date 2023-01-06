## RemovalsByYearLib



<i>This library is used to manage the market's removal vintages.

##### Uses:

- [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet) for
EnumerableSetUpgradeable.UintSet
- [AddressArrayLib](../docs/AddressArrayLib.md) for `address[]`
- [UInt256ArrayLib](../docs/UInt256ArrayLib.md) for `uint256[]`</i>



---

### insert

```solidity
function insert(struct RemovalsByYear collection, uint256 removalId) internal
```

Inserts a new removal into the collection.

<i>The removal is added to the Enumerable Set that maps to the year of its year.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage. |
| removalId | uint256 | a new removal to insert. |


### remove

```solidity
function remove(struct RemovalsByYear collection, uint256 removalId) internal
```

Removes a removal from the collection.

<i>Removes the removal from the Enumerable Set that corresponds to its year.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection to search through. |
| removalId | uint256 | the removal to remove. |


### isEmpty

```solidity
function isEmpty(struct RemovalsByYear collection) internal view returns (bool)
```

Checks if the collection is empty across all years.

<i>Uses the latestYear property to check if any years have been set.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if empty, false otherwise. |

### isEmptyForYear

```solidity
function isEmptyForYear(struct RemovalsByYear collection, uint256 year) internal view returns (bool)
```

Checks if the collection is empty for a particular year.


| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage. |
| year | uint256 | the year to check. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if empty, false otherwise. |

### getNextRemovalForSale

```solidity
function getNextRemovalForSale(struct RemovalsByYear collection) internal view returns (uint256)
```

Gets the next removal in the collection for sale.

<i>Gets the first item from the Enumerable Set that corresponds to the earliest year.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The next removal to sell. |

### getCountForYear

```solidity
function getCountForYear(struct RemovalsByYear collection, uint256 year) internal view returns (uint256)
```

Gets the count of unique removal IDs for a particular year.

<i>Gets the size of the Enumerable Set that corresponds to the given year.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage. |
| year | uint256 | the year to check. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 the size of the collection. |

### getAllRemovalIds

```solidity
function getAllRemovalIds(struct RemovalsByYear collection) internal view returns (uint256[] removalIds)
```

Gets all removal IDs belonging to all vintages for a collection.


| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| removalIds | uint256[] | an array of all removal IDs in the collection. |



