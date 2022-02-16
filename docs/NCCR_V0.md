# NCCR_V0









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
function approve(address, uint256) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | uint256 | undefined

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```



*Gets the total amount of tokens stored by the contract*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### transferFrom

```solidity
function transferFrom(address, address, uint256) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined
| _2 | uint256 | undefined

### tokenOfOwnerByIndex

```solidity
function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)
```



*Gets the token ID at a given index of the tokens list of the requested owner*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | address owning the tokens list to be accessed
| index | uint256 | uint256 representing the index to be accessed of the requested tokens list

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### unpause

```solidity
function unpause() external nonpayable
```



*called by the owner to unpause, returns to normal state*


### safeTransferFrom

```solidity
function safeTransferFrom(address, address, uint256, bytes) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined
| _2 | uint256 | undefined
| _3 | bytes | undefined

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

### initialize

```solidity
function initialize(address sender) external nonpayable
```



*Constructor function*

#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | undefined

### tokenByIndex

```solidity
function tokenByIndex(uint256 index) external view returns (uint256)
```



*Gets the token ID at a given index of all the tokens in this contract Reverts if the index is greater or equal to the total number of tokens*

#### Parameters

| Name | Type | Description |
|---|---|---|
| index | uint256 | uint256 representing the index to be accessed of the tokens list

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### mintWithTokenURI

```solidity
function mintWithTokenURI(address, uint256, string) external nonpayable returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | uint256 | undefined
| _2 | string | undefined

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


### mintWithTokenURIAndData

```solidity
function mintWithTokenURIAndData(address to, uint256 tokenId, string tokenURI, string tokenData) external nonpayable returns (bool)
```



*Function to mint tokens with a URI and human readable data*

#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | The address that will receive the minted tokens.
| tokenId | uint256 | The token id to mint.
| tokenURI | string | The token URI of the minted token.
| tokenData | string | The human readable data to associate with the minted token

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### symbol

```solidity
function symbol() external view returns (string)
```



*Gets the token symbol*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### addMinter

```solidity
function addMinter(address account) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

### renounceMinter

```solidity
function renounceMinter() external nonpayable
```






### setApprovalForAll

```solidity
function setApprovalForAll(address, bool) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | bool | undefined

### isMinter

```solidity
function isMinter(address account) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### tokenData

```solidity
function tokenData(uint256 tokenId) external view returns (string)
```



*Returns the human readable data for a given token ID Throws if the token ID does not exist. May return an empty string.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | uint256 ID of the token to query

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

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

### MinterAdded

```solidity
event MinterAdded(address indexed account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account `indexed` | address | undefined |

### MinterRemoved

```solidity
event MinterRemoved(address indexed account)
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



