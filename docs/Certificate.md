## Certificate







---

### Source







```solidity
struct Source {
  uint256 removalId;
  uint256 amount;
}
```

### CertificateCreated

```solidity
event CertificateCreated(address recipient, uint256 certificateId, uint256[] removalIds, uint256[] amounts)
```

Emitted on creation of a certificate of carbon removal.




### _sources

```solidity
mapping(uint256 &#x3D;&gt; struct Certificate.Source[]) _sources
```



_a mapping of the certificate token ID -&gt; sources_



### _latestTokenId

```solidity
uint256 _latestTokenId
```



_auto incrementing token ID_



### initialize

```solidity
function initialize() public virtual
```






### addMinter

```solidity
function addMinter(address _minter) public
```






### mintBatch

```solidity
function mintBatch(address to, uint256[] removalIds, uint256[] removalAmounts, bytes data) public
```



_mints the certificate (using a batch of certificate sources)_

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The supplier address |
| removalIds | uint256[] | the removal source ids |
| removalAmounts | uint256[] | the removal source amount |
| data | bytes | Additional data with no specified format, MUST be sent unaltered in call to &#x60;onERC1155Received&#x60; on &#x60;_to&#x60; |


### sources

```solidity
function sources(uint256 certificateId) public view returns (struct Certificate.Source[])
```



_returns the removal IDs and the amounts of the sources_



### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256[] ids, uint256[] amounts, bytes data) internal
```






### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```








