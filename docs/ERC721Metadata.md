# ERC721Metadata









## Methods

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```



*implement supportsInterface(bytes4) using a lookup table*

#### Parameters

| Name | Type | Description |
|---|---|---|
| interfaceId | bytes4 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### name

```solidity
function name() external view returns (string)
```



*Gets the token name*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### getApproved

```solidity
function getApproved(uint256 tokenId) external view returns (address)
```



*Gets the approved address for a token ID, or zero if no address set Reverts if the token ID does not exist.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | uint256 ID of the token to query the approval of

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### approve

```solidity
function approve(address to, uint256 tokenId) external nonpayable
```



*Approves another address to transfer the given token ID The zero address indicates there is no approved address. There can only be one approved address per token at a given time. Can only be called by the token owner or an approved operator.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | address to be approved for the given token ID
| tokenId | uint256 | uint256 ID of the token to be approved

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 tokenId) external nonpayable
```



*Transfers the ownership of a given token ID to another address Usage of this method is discouraged, use `safeTransferFrom` whenever possible Requires the msg.sender to be the owner, approved, or operator*

#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | current owner of the token
| to | address | address to receive the ownership of the given token ID
| tokenId | uint256 | uint256 ID of the token to be transferred

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 tokenId, bytes _data) external nonpayable
```



*Safely transfers the ownership of a given token ID to another address If the target address is a contract, it must implement `onERC721Received`, which is called upon a safe transfer, and return the magic value `bytes4(keccak256(&quot;onERC721Received(address,address,uint256,bytes)&quot;))`; otherwise, the transfer is reverted. Requires the _msgSender() to be the owner, approved, or operator*

#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | current owner of the token
| to | address | address to receive the ownership of the given token ID
| tokenId | uint256 | uint256 ID of the token to be transferred
| _data | bytes | bytes data to send along with a safe transfer check

### initialize

```solidity
function initialize() external nonpayable
```



*Constructor function*


### ownerOf

```solidity
function ownerOf(uint256 tokenId) external view returns (address)
```



*Gets the owner of the specified token ID*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | uint256 ID of the token to query the owner of

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### balanceOf

```solidity
function balanceOf(address owner) external view returns (uint256)
```



*Gets the balance of the specified address*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | address to query the balance of

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### symbol

```solidity
function symbol() external view returns (string)
```



*Gets the token symbol*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### setApprovalForAll

```solidity
function setApprovalForAll(address to, bool approved) external nonpayable
```



*Sets or unsets the approval of a given operator An operator is allowed to transfer all tokens of the sender on their behalf*

#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | operator address to set the approval
| approved | bool | representing the status of the approval to be set

### tokenURI

```solidity
function tokenURI(uint256 tokenId) external view returns (string)
```



*Returns an URI for a given token ID Throws if the token ID does not exist. May return an empty string.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | uint256 ID of the token to query

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### isApprovedForAll

```solidity
function isApprovedForAll(address owner, address operator) external view returns (bool)
```



*Tells whether an operator is approved by a given owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | owner address which you want to query the approval of
| operator | address | operator address which you want to query the approval of

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined



## Events

### Transfer

```solidity
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| tokenId `indexed` | uint256 | undefined |

### Approval

```solidity
event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |
| approved `indexed` | address | undefined |
| tokenId `indexed` | uint256 | undefined |

### ApprovalForAll

```solidity
event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |
| operator `indexed` | address | undefined |
| approved  | bool | undefined |



