# ERC721Pausable



> ERC721 Non-Fungible Pausable token



*ERC721 modified with pausable transfers.*

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





#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined
| tokenId | uint256 | undefined

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 tokenId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined
| to | address | undefined
| tokenId | uint256 | undefined

### unpause

```solidity
function unpause() external nonpayable
```



*called by the owner to unpause, returns to normal state*


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

### isPauser

```solidity
function isPauser(address account) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### paused

```solidity
function paused() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

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

### renouncePauser

```solidity
function renouncePauser() external nonpayable
```






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

### initialize

```solidity
function initialize(address sender) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | undefined

### addPauser

```solidity
function addPauser(address account) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

### pause

```solidity
function pause() external nonpayable
```



*called by the owner to pause, triggers stopped state*


### setApprovalForAll

```solidity
function setApprovalForAll(address to, bool approved) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined
| approved | bool | undefined

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

### Paused

```solidity
event Paused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### Unpaused

```solidity
event Unpaused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### PauserAdded

```solidity
event PauserAdded(address indexed account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account `indexed` | address | undefined |

### PauserRemoved

```solidity
event PauserRemoved(address indexed account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account `indexed` | address | undefined |

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



