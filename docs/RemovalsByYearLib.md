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

<i>The removal is added to the Enumerable Set that maps to the year of its year.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage.  @param removalId a new removal to insert. |
| removalId | uint256 |  |


### remove

```solidity
function remove(struct RemovalsByYear collection, uint256 removalId) internal
```

Removes a removal from the collection.

<i>Removes the removal from the Enumerable Set that corresponds to its year.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection to search through.  @param removalId the removal to remove. |
| removalId | uint256 |  |


### isEmpty

```solidity
function isEmpty(struct RemovalsByYear collection) internal view returns (bool)
```

Checks if the collection is empty across all years.

<i>Uses the latestYear property to check if any years have been set.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage.  @return bool true if empty, false otherwise. |


### isEmptyForYear

```solidity
function isEmptyForYear(struct RemovalsByYear collection, uint256 year) internal view returns (bool)
```

Checks if the collection is empty for a particular year.


| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage.  @param year the year to check.  @return bool true if empty, false otherwise. |
| year | uint256 |  |


### getNextRemovalForSale

```solidity
function getNextRemovalForSale(struct RemovalsByYear collection) internal view returns (uint256)
```

Gets the next removal in the collection for sale.

<i>Gets the first item from the Enumerable Set that corresponds to the earliest year.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage.  @return uint256 the next removal to sell. |


### getCountForYear

```solidity
function getCountForYear(struct RemovalsByYear collection, uint256 year) internal view returns (uint256)
```

Gets the count of unique removal IDs for a particular year.

<i>Gets the size of the Enumerable Set that corresponds to the given year.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage.  @param year the year to check.  @return uint256 the size of the collection. |
| year | uint256 |  |


### getAllRemovalIds

```solidity
function getAllRemovalIds(struct RemovalsByYear collection) internal view returns (uint256[] removalIds)
```

Gets all removal IDs belonging to all vintages for a collection.


| Name | Type | Description |
| ---- | ---- | ----------- |
| collection | struct RemovalsByYear | the collection from storage.  @return removalIds an array of all removal IDs in the collection. |




