## Removal







---

### Vintage







```solidity
struct Vintage {
  address supplier;
  uint16 vintage;
  bytes32 uniqueId;
}
```

### _vintages

```solidity
mapping(uint256 &#x3D;&gt; struct Removal.Vintage) _vintages
```






### _vintageTokenIdMap

```solidity
mapping(bytes32 &#x3D;&gt; uint256) _vintageTokenIdMap
```






### _latestTokenId

```solidity
uint256 _latestTokenId
```






### name

```solidity
string name
```






### initialize

```solidity
function initialize() public virtual
```






### vintage

```solidity
function vintage(uint256 removalId) public view returns (struct Removal.Vintage)
```



_returns the removal vintage data for a given removal token ID_



### tokenIdsForRemovals

```solidity
function tokenIdsForRemovals(bytes32[] parcelIdentifiers, uint256[] removalVintages) public view returns (uint256[])
```



_returns the token ids for a set of removals given each one&#x27;s vintage and the data that was provided
in its mint transaction_



### setApprovalForAllAsAdmin

```solidity
function setApprovalForAllAsAdmin(address owner, address operator, bool approved) public virtual
```



_See {IERC1155-setApprovalForAll}._



### mintBatch

```solidity
function mintBatch(address to, uint256[] amounts, uint256[] vintages, bytes data) public
```



_mints multiple removals at once (for a single supplier) AND lists those removals for sale in the market.
ids that will be auto assigned [0, 1, 2]
amounts: [100 * (10 ** 18), 10 * (10 ** 18), 50 * (10 ** 18)] &lt;- 100 tonnes, 10 tonnes, 50 tonnes in standard erc20 units (wei)
vintages: [2018, 2019, 2020]
token id 0 URI points to vintage information (e.g., 2018) nori.com/api/removal/0 -&gt; { amount: 100, supplier: 1, vintage: 2018, ... }
token id 1 URI points to vintage information (e.g., 2019) nori.com/api/removal/1 -&gt; { amount: 10, supplier: 1, vintage: 2019, ... }
token id 2 URI points to vintage information (e.g., 2020) nori.com/api/removal/2 -&gt; { amount: 50, supplier: 1, vintage: 2020, ... }_

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The supplier address |
| amounts | uint256[] | Each removal&#x27;s tonnes of CO2 formatted as wei |
| vintages | uint256[] | The year for each removal |
| data | bytes | Encodes the market contract address and a unique identifier for the parcel from whence these removals came. |


### safeBatchTransferFrom

```solidity
function safeBatchTransferFrom(address _from, address _to, uint256[] _ids, uint256[] _amounts, bytes _data) public
```



_used to initiate a sale of removals by transferring the removals to the_



### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```






### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256[] ids, uint256[] amounts, bytes data) internal
```








