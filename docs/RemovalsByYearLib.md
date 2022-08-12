## RemovalsByYearLib







---

### _DEFAULT_EARLIEST_YEAR

```solidity
uint256 _DEFAULT_EARLIEST_YEAR
```






### _DEFAULT_LATEST_YEAR

```solidity
uint256 _DEFAULT_LATEST_YEAR
```






### insert

```solidity
function insert(struct RemovalsByYear collection, uint256 removalId) internal
```

Inserts a new removal into the collection.

_The removal is added to the Enumberable Set that maps to the year of its year._

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage. |
| removalId | uint256 | a new removal to insert. |


### remove

```solidity
function remove(struct RemovalsByYear collection, uint256 removalId) internal
```

Removes a removal from the collection.

_Removes the removal from the Enumerable Set that corresponds to its year._

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection to search through. |
| removalId | uint256 | the removal to remove. |


### isEmpty

```solidity
function isEmpty(struct RemovalsByYear collection) internal view returns (bool)
```

Checks if the collection is empty across all years.

_Uses the latestYear property to check if any years have been set._

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool true if empty, false otherwise. |

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
| [0] | bool | bool true if empty, false otherwise. |

### getNextRemovalForSale

```solidity
function getNextRemovalForSale(struct RemovalsByYear collection) internal view returns (uint256)
```

Gets the next removal in the collection for sale.

_Gets the first item from the Enumerable Set that corresponds to the earliest year._

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | uint256 the next removal to sell. |

### getCountForYear

```solidity
function getCountForYear(struct RemovalsByYear collection, uint256 year) internal view returns (uint256)
```

Gets the count of unique removal IDs for a particular year.

_Gets the size of the Enumerable Set that corresponds to the given year._

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

Gets the total balance of all removals across all years.


| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| removalIds | uint256[] | the total balance of the collection. |



