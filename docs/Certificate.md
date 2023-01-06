## Certificate


This contract issues sequentially increasing ERC721 token IDs to purchasers of certificates of carbon
removal in Nori's marketplace. The carbon removals that supply each certificate are accounted for using ERC1155
tokens in the Removal contract. Upon purchase, ownership of the relevant Removal token IDs and balances is
transferred to this contract.


##### Additional behaviors and features:

- [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
- [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all functions that mutate state are
pausable.
- [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
   - `CERTIFICATE_OPERATOR_ROLE`: The only role that can transfer certificates after they are minted.
   - `PAUSER_ROLE`: Can pause and unpause the contract.
   - `DEFAULT_ADMIN_ROLE`: This is the only role that can add/revoke other accounts to any of the roles.
- [Can receive ERC1155 tokens](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155Receiver): A
certificate is minted and internal accounting ties the certificate to the ERC1155 tokens upon receipt.

##### Inherits:

- [ERC721AUpgradeable](https://github.com/chiru-labs/ERC721A/blob/v4.2.3/contracts/ERC721A.sol)
- [ERC721ABurnableUpgradeable](
https://github.com/chiru-labs/ERC721A/blob/v4.2.3/contracts/extensions/ERC721ABurnable.sol)
- [MulticallUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Multicall)
- [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
- [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
- [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
- [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)
- [AccessPresetPausable](../docs/AccessPresetPausable.md)

##### Implements:

- [IERC721](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721)
- [IERC721Metadata](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Metadata)
- [IERC721Enumerable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Enumerable)
- [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
- [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)




---

### CERTIFICATE_OPERATOR_ROLE

```solidity
bytes32 CERTIFICATE_OPERATOR_ROLE
```

Role conferring operator permissions.

<i>Assigned to operators which are the only addresses which can transfer certificates outside
minting and burning.</i>



### ReceiveRemovalBatch

```solidity
event ReceiveRemovalBatch(address from, address recipient, uint256 certificateId, uint256 certificateAmount, uint256[] removalIds, uint256[] removalAmounts, address purchasingTokenAddress, uint256 priceMultiple)
```

Emitted when a batch of removals is received to create a certificate.


| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The sender's address. |
| recipient | address | The recipient address. |
| certificateId | uint256 | The ID of the certificate that the removals mint. |
| certificateAmount | uint256 | The total number of NRTs retired in this certificate. |
| removalIds | uint256[] | The removal IDs used for the certificate. |
| removalAmounts | uint256[] | The amounts from each removal used for the certificate. |
| purchasingTokenAddress | address | The address of the token used to purchase the certificate. |
| priceMultiple | uint256 | The number of purchasing tokens required to buy one NRT. |


### RegisterContractAddresses

```solidity
event RegisterContractAddresses(contract IRemoval removal)
```

Emitted on updating the addresses for contracts.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | contract IRemoval | The address of the new Removal contract. |


### constructor

```solidity
constructor() public
```

Locks the contract, preventing any future re-initialization.

<i>See more [here](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable-_disableInitializers--).</i>



### initialize

```solidity
function initialize(string baseURI) external
```

Initialize the Certificate contract.


| Name | Type | Description |
| ---- | ---- | ----------- |
| baseURI | string | The base URI for all certificate NFTs. |


### registerContractAddresses

```solidity
function registerContractAddresses(contract IRemoval removal) external
```

Register the address of the Removal contract.

<i>This function emits a `RegisterContractAddresses` event.

##### Requirements:
- Can only be used when the contract is not paused.
- Can only be used when the caller has the `DEFAULT_ADMIN_ROLE` role.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | contract IRemoval | The address of the Removal contract. |


### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[] removalIds, uint256[] removalAmounts, bytes data) external returns (bytes4)
```

Receive a batch of child tokens.

<i>See [IERC1155Receiver](
https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#ERC1155Receiver) for more.

##### Requirements:
- This contract must not be paused (enforced by `_beforeTokenTransfers`).
- `_msgSender` must be the removal contract.
- The certificate recipient and amount must be encoded in the `data` parameter.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
|  | address |  |
|  | address |  |
| removalIds | uint256[] | The array of ERC1155 Removal IDs received. |
| removalAmounts | uint256[] | The removal amounts per each removal ID. |
| data | bytes | The bytes that encode the certificate's recipient address and total amount. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes4 | The selector of the function. |

### getRemovalAddress

```solidity
function getRemovalAddress() external view returns (address)
```

Returns the address of the Removal contract.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The address of the Removal contract. |

### totalMinted

```solidity
function totalMinted() external view returns (uint256)
```

Returns the total number of certificates that have been minted.

<i>Includes burned certificates.</i>


| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Total number of certificates that have been minted. |

### getPurchaseAmount

```solidity
function getPurchaseAmount(uint256 certificateId) external view returns (uint256)
```

Returns the number of tonnes of carbon removals purchased.


| Name | Type | Description |
| ---- | ---- | ----------- |
| certificateId | uint256 | The certificate for which to retrieve the original amount. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The tonnes of carbon removal purchased for the certificate. |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```


<i>See [IERC165.supportsInterface](
https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | The interface ID to check for support. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the interface is supported, false otherwise. |

### setApprovalForAll

```solidity
function setApprovalForAll(address, bool) public pure
```

This function is unsupported and will always revert.

<i>Override to disable ERC721 operator approvals, since certificate tokens are non-transferable.</i>



### approve

```solidity
function approve(address, uint256) public pure
```

This function is unsupported and will always revert.

<i>Override to disable ERC721 operator approvals, since certificate tokens are non-transferable.</i>



### _beforeTokenTransfers

```solidity
function _beforeTokenTransfers(address from, address to, uint256 startTokenId, uint256 quantity) internal virtual
```

A hook that is called before all transfers and is used to disallow non-minting, non-burning, and non-
certificate-operator (conferred by the `CERTIFICATE_OPERATOR_ROLE` role) transfers.

<i>Follows the rules of hooks defined [here](
 https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks).

##### Requirements:

- This contract must not be paused.
- Can only be used when the caller has the `CERTIFICATE_OPERATOR_ROLE` role.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The address of the sender. |
| to | address | The address of the recipient. |
| startTokenId | uint256 | The ID of the first certificate in the transfer. |
| quantity | uint256 | The number of certificates in the transfer. |


### _receiveRemovalBatch

```solidity
function _receiveRemovalBatch(address recipient, uint256 certificateAmount, uint256[] removalIds, uint256[] removalAmounts, address purchasingTokenAddress, uint256 priceMultiple) internal
```

Creates a new certificate for a batch of removals.

<i>Mints a new certificate token to the next sequential ID and updates the internal data structures
that track the relationship between the certificate and its constituent removal tokens and balances.

Emits a `ReceiveRemovalBatch` event.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address receiving the new certificate. |
| certificateAmount | uint256 | The total number of tonnes of carbon removals represented by the new certificate. |
| removalIds | uint256[] | The Removal token IDs that are being included in the certificate. |
| removalAmounts | uint256[] | The balances of each corresponding removal token that are being included in the certificate. |
| purchasingTokenAddress | address |  |
| priceMultiple | uint256 |  |


### _msgSenderERC721A

```solidity
function _msgSenderERC721A() internal view returns (address)
```

Returns the sender of the transaction.

<i>In all cases currently, we expect that the `_msgSender()`, `_msgSenderERC721A()` and `msg.sender` all return
the same value. As such, this function exists solely for compatibility with OpenZeppelin and ERC721A
contracts. For more, see [here](https://github.com/chiru-labs/ERC721A/pull/281) and [here](
https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Context.sol).</i>


| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | For regular transactions it returns &#x60;msg.sender&#x60; and for meta transactions it *can* be used to return the end-user (rather than the relayer). |

### _baseURI

```solidity
function _baseURI() internal view returns (string)
```

The baseUri for the certificate token.

<i>Base URI for computing `tokenURI`. If set, the resulting URI for each token will be the concatenation of the
`baseURI` and the `tokenId`. Empty by default, it can be overridden in child contracts.</i>


| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The base URI for the certificate. |

### _validateReceivedRemovalBatch

```solidity
function _validateReceivedRemovalBatch(uint256[] removalIds, uint256[] removalAmounts, uint256 certificateAmount) internal pure
```

Validates the incoming batch of removal token data by comparing the lengths of IDs and amounts.

<i>Reverts if the array lengths do not match.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removalIds | uint256[] | Array of removal IDs. |
| removalAmounts | uint256[] | Array of removal amounts. |
| certificateAmount | uint256 | The total number of tonnes of carbon removals represented by the new certificate. |




