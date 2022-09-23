## Market


Facilitates the exchange of bpNORI tokens for a non-transferrable certificate of carbon removal.

<i>Carbon removals are represented by ERC1155 tokens in the Removal contract, where the balance of a
given token represents the number of tonnes of carbon that were removed from the atmosphere for that specific
removal (different token IDs are used to represent different slices of carbon removal projects and years).
This contract facilitates the exchange of bpNORI tokens for ERC721 tokens managed by the Certificate contract.
Each of these certificates is a non-transferrable, non-fungible token that owns the specific removal tokens
and token balances that comprise the specific certificate for the amount purchased.

The market maintains a "priority restricted threshold", which is a configurable threshold of supply that is
always reserved to sell only to buyers who have the `ALLOWLIST_ROLE`.  Purchases that would drop supply below
this threshold will revert without the correct role.

###### Additional behaviors and features

- [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
- [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all external functions that mutate
state are pausable.
- [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
- `MARKET_ADMIN_ROLE`: Can set the fee percentage, fee wallet address, and priority restricted threshold.
- `ALLOWLIST_ROLE`: Can purchase from priority restricted supply.
- [Can receive ERC1155 tokens](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155Receiver)

##### Inherits:

- [IERC1155ReceiverUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155Receiver)
- [MulticallUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Multicall)
- [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
- [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
- [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
- [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)

##### Implements:

- [IERC1155](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155)
- [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
- [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)

##### Uses:

- [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet)
for `EnumerableSetUpgradeable.UintSet`
- [SafeMathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#SafeMath)
- `UInt256ArrayLib` for `uint256[]`
- `AddressArrayLib` for `address[]`</i>



---

### LinkedListNode






```solidity
struct LinkedListNode {
  address previous;
  address next;
}
```

### _removal

```solidity
contract Removal _removal
```

The Removal contract.




### _certificate

```solidity
contract Certificate _certificate
```

The Certificate contract.




### _bridgedPolygonNORI

```solidity
contract BridgedPolygonNORI _bridgedPolygonNORI
```

The BridgedPolygonNORI contract.




### _restrictedNORI

```solidity
contract RestrictedNORI _restrictedNORI
```

The RestrictedNORI contract.




### _noriFeeWallet

```solidity
address _noriFeeWallet
```

Wallet address used for Nori's transaction fees.




### _noriFeePercentage

```solidity
uint256 _noriFeePercentage
```

Percentage of the fee sent to Nori from every transaction.




### _priorityRestrictedThreshold

```solidity
uint256 _priorityRestrictedThreshold
```

Amount of supply withheld for customers with a priority role.




### _currentSupplierAddress

```solidity
address _currentSupplierAddress
```

Address of the supplier currently selling in the queue.




### _suppliers

```solidity
mapping(address => struct Market.LinkedListNode) _suppliers
```

Linked list of active suppliers.




### _listedSupply

```solidity
mapping(address => struct RemovalsByYear) _listedSupply
```

All listed removal tokens in the market.

<i>Top-level keys are supplier addresses, `RemovalsByYear` further organizes removals by vintage.</i>



### MARKET_ADMIN_ROLE

```solidity
bytes32 MARKET_ADMIN_ROLE
```

Role conferring the ability to configure the Nori fee wallet, the Nori fee percentage, and the priority
restricted threshold.




### ALLOWLIST_ROLE

```solidity
bytes32 ALLOWLIST_ROLE
```

Role conferring the ability to purchase supply when inventory is below the priority restricted threshold.




### PriorityRestrictedThresholdSet

```solidity
event PriorityRestrictedThresholdSet(uint256 threshold)
```

Emitted on setting of `_priorityRestrictedThreshold`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| threshold | uint256 | The updated threshold for priority restricted supply. |


### ContractAddressesRegistered

```solidity
event ContractAddressesRegistered(contract Removal removal, contract Certificate certificate, contract BridgedPolygonNORI bridgedPolygonNORI, contract RestrictedNORI restrictedNORI)
```

Emitted on updating the addresses for contracts.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | contract Removal | The address of the new `removal` contract. |
| certificate | contract Certificate | The address of the new `certificate` contract. |
| bridgedPolygonNORI | contract BridgedPolygonNORI | The address of the new `bridgedPolygonNORI` contract. |
| restrictedNORI | contract RestrictedNORI | The address of the new `restrictedNORI` contract. |


### NoriFeeWalletAddressUpdated

```solidity
event NoriFeeWalletAddressUpdated(address updatedWalletAddress)
```

Emitted on setting of `_noriFeeWalletAddress`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| updatedWalletAddress | address | The updated address of the Nori fee wallet. |


### NoriFeePercentageUpdated

```solidity
event NoriFeePercentageUpdated(uint256 updatedFeePercentage)
```

Emitted on setting of `_noriFeePercentage`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| updatedFeePercentage | uint256 | The updated fee percentage for Nori. |


### SupplierAdded

```solidity
event SupplierAdded(address added, address next, address previous)
```

Emitted when adding a supplier to `_listedSupply`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| added | address | The supplier that was added. |
| next | address | The next of the supplier that was added, updated to point to `addedSupplierAddress` as previous. |
| previous | address | the previous address of the supplier that was added, updated to point to `addedSupplierAddress` as next. |


### SupplierRemoved

```solidity
event SupplierRemoved(address removed, address next, address previous)
```

Emitted when removing a supplier from `_listedSupply`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removed | address | The supplier that was removed. |
| next | address | The next of the supplier that was removed, updated to point to `previous` as previous. |
| previous | address | the previous address of the supplier that was removed, updated to point to `next` as next. |


### RemovalAdded

```solidity
event RemovalAdded(uint256 id, address supplierAddress)
```

Emitted when a removal is added to `_listedSupply`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The removal that was added. |
| supplierAddress | address | The address of the supplier for the removal. |


### constructor

```solidity
constructor() public
```

Locks the contract, preventing any future re-initialization.

<i>See more [here](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable-_disableInitializers--).</i>



### initialize

```solidity
function initialize(contract Removal removal, contract BridgedPolygonNORI bridgedPolygonNori, contract Certificate certificate, contract RestrictedNORI restrictedNori, address noriFeeWalletAddress, uint256 noriFeePercentage_) external
```

Initializes the Market contract.

<i>Reverts if `_noriFeeWallet` is not set.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | contract Removal | The address of the Removal contract. |
| bridgedPolygonNori | contract BridgedPolygonNORI | The address of the BridgedPolygonNORI contract. |
| certificate | contract Certificate | The address of the Certificate contract. |
| restrictedNori | contract RestrictedNORI | The address of the RestrictedNORI contract. |
| noriFeeWalletAddress | address | The address for Nori's fee wallet. |
| noriFeePercentage_ | uint256 | The percentage to take from every transaction. This fee is sent to the address specified by `noriFeeWalletAddress`. |


### release

```solidity
function release(uint256 removalId, uint256 amount) external
```

Releases a removal from the market.

@dev

##### Requirements:

- Can only be used when this contract is not paused.
- The caller must be the Removal contract.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The ID of the removal to release. |
| amount | uint256 | The amount of that removal to release. |


### registerContractAddresses

```solidity
function registerContractAddresses(contract Removal removal, contract Certificate certificate, contract BridgedPolygonNORI bridgedPolygonNORI, contract RestrictedNORI restrictedNORI) external
```

Register the market contract's asset addresses.

<i>Register the `removal`, `certificate`, `bridgedPolygonNORI`, and `restrictedNORI` contracts so that they
can be referenced in this contract. Called as part of the market contract system deployment process.

Emits a `ContractAddressesRegistered` event.

##### Requirements:

- Can only be used when the caller has the `DEFAULT_ADMIN_ROLE`.
- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | contract Removal | The address of the `removal` contract. |
| certificate | contract Certificate | The address of the `certificate` contract. |
| bridgedPolygonNORI | contract BridgedPolygonNORI | The address of the `bridgedPolygonNORI` contract. |
| restrictedNORI | contract RestrictedNORI | The address of the market contract. |


### setPriorityRestrictedThreshold

```solidity
function setPriorityRestrictedThreshold(uint256 threshold) external
```

Sets the current value of the priority restricted threshold, which is the amount of inventory
that will always be reserved to sell only to buyers with the `ALLOWLIST_ROLE`.

@dev

Emits a `PriorityRestrictedThresholdSet` event.

##### Requirements:

- Can only receive ERC1155 tokens from the Removal contract.
- Can only be used when this contract is not paused.


| Name | Type | Description |
| ---- | ---- | ----------- |
| threshold | uint256 | The updated priority restricted threshold |


### setNoriFeePercentage

```solidity
function setNoriFeePercentage(uint256 noriFeePercentage_) external
```

Sets the Nori fee percentage (as an integer) which is the percentage of
each purchase that will be paid to Nori as the marketplace operator.

Emits a `NoriFeePercentageUpdated` event.

<i>##### Requirements:

- Can only be used when the caller has the MARKET_ADMIN_ROLE
- Can only be used when this contract is not paused</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| noriFeePercentage_ | uint256 | The new fee percentage as an integer. |


### setNoriFeeWallet

```solidity
function setNoriFeeWallet(address noriFeeWalletAddress) external
```

Sets the Nori fee wallet address (as an integer) which is the address to which the
marketplace operator fee will be routed during each purchase.

@dev

Emits a `NoriFeeWalletAddressUpdated` event.

##### Requirements:

- Can only be used when the caller has the MARKET_ADMIN_ROLE
- Can only be used when this contract is not paused


| Name | Type | Description |
| ---- | ---- | ----------- |
| noriFeeWalletAddress | address | The wallet address where Nori collects market fees. |


### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[] ids, uint256[], bytes) external returns (bytes4)
```

Handles the receipt of multiple ERC1155 token types. This function is called at the end of a
`safeBatchTransferFrom` after the balances have been updated. To accept the transfer(s), this must return
`bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`
(i.e., 0xbc197c81, or its own function selector).

<i>See [IERC1155Receiver](
https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#ERC1155Receiver) for more.

##### Requirements:

- Can only receive ERC1155 tokens from the Removal contract.
- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
|  | address |  |
|  | address |  |
| ids | uint256[] | An array containing the IDs of each removal being transferred (order and length must match values array). |
|  | uint256[] |  |
|  | bytes |  |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes4 | Returns &#x60;bytes4(keccak256(&quot;onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)&quot;))&#x60; if the transfer is allowed. |

### onERC1155Received

```solidity
function onERC1155Received(address, address, uint256 id, uint256, bytes) external returns (bytes4)
```

Handles the receipt of an ERC1155 token. This function is called at the end of a
`safeTransferFrom` after the balances have been updated. To accept the transfer(s), this must return
`bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`
(i.e., 0xf23a6e61, or its own function selector).

<i>See [IERC1155Receiver](
https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#ERC1155Receiver) for more.

##### Requirements:

- Can only receive an ERC1155 token from the Removal contract.
- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
|  | address |  |
|  | address |  |
| id | uint256 | The ID of the received removal. |
|  | uint256 |  |
|  | bytes |  |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes4 | &#x60;bytes4(keccak256(&quot;onERC1155Received(address,address,uint256,uint256,bytes)&quot;))&#x60; if the transfer is allowed. |

### swap

```solidity
function swap(address recipient, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external
```

Exchange bpNORI tokens for an ERC721 certificate by transferring ownership of the removals to the
certificate.

<i>See [https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Permit](ERC20Permit) for more.
The message sender must present a valid permit to this contract to temporarily authorize this market
to transfer the sender's bpNORI to complete the purchase. A certificate is issued by `Certificate.sol`
to the specified recipient and bpNORI is distributed to the supplier of the carbon removal,
to the RestrictedNORI contract that controls any restricted bpNORI owed to the supplier, and finally
to Nori Inc. as a market operator fee.

##### Requirements:

- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address to which the certificate will be issued. |
| amount | uint256 | The total purchase amount in bpNORI. This is the combined total of the number of removals being purchased, and the fee paid to Nori. |
| deadline | uint256 | The EIP2612 permit deadline in Unix time. |
| v | uint8 | The recovery identifier for the permit's secp256k1 signature. |
| r | bytes32 | The r value for the permit's secp256k1 signature. |
| s | bytes32 | The s value for the permit's secp256k1 signature. |


### swapFromSupplier

```solidity
function swapFromSupplier(address recipient, uint256 amount, address supplier, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external
```

An overloaded version of `swap` that additionally accepts a supplier address and will exchange bpNORI
tokens for an ERC721 certificate token and transfers ownership of removal tokens supplied only from the specified
supplier to that certificate. If the specified supplier does not have enough carbon removals for sale to fulfill
the order the transaction will revert.

<i>See {https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Permit}
The message sender must present a valid permit to this contract to temporarily authorize this market
to transfer the sender's bpNORI to complete the purchase. A certificate is issued by Certificate.sol
to the specified recipient and bpNORI is distributed to the supplier of the carbon removal,
to the RestrictedNORI contract that controls any restricted bpNORI owed to the supplier, and finally
to Nori Inc. as a market operator fee.


##### Requirements:

- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address to which the certificate will be issued. |
| amount | uint256 | The total purchase amount in bpNORI. This is the combined total of the number of removals being purchased, and the fee paid to Nori. |
| supplier | address | The only supplier address from which to purchase carbon removals in this transaction. |
| deadline | uint256 | The EIP2612 permit deadline in Unix time. |
| v | uint8 | The recovery identifier for the permit's secp256k1 signature |
| r | bytes32 | The r value for the permit's secp256k1 signature |
| s | bytes32 | The s value for the permit's secp256k1 signature |


### withdraw

```solidity
function withdraw(uint256 removalId) external
```

Withdraws a removal to the supplier.

<i>Withdraws a removal to the supplier address encoded in the removal ID.

##### Requirements:

- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The ID of the removal to withdraw from the market. |


### priorityRestrictedThreshold

```solidity
function priorityRestrictedThreshold() external view returns (uint256)
```

Returns the current value of the priority restricted threshold, which is the amount of inventory
that will always be reserved to sell only to buyers with the `ALLOWLIST_ROLE`.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | priorityRestrictedThreshold The threshold of supply allowed for priority customers only. |

### noriFeePercentage

```solidity
function noriFeePercentage() external view returns (uint256)
```

Returns the current value of the Nori fee percentage, as an integer, which is the percentage of
each purchase that will be paid to Nori as the marketplace operator.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | noriFeePercentage The percentage of each purchase that will be paid to Nori as the marketplace operator. |

### noriFeeWallet

```solidity
function noriFeeWallet() external view returns (address)
```

Returns the address to which the marketplace operator fee will be routed during each purchase.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | walletAddress the wallet address used for Nori&#x27;s fees. |

### calculateNoriFee

```solidity
function calculateNoriFee(uint256 amount) external view returns (uint256)
```

Calculates the Nori fee required for a purchase of `amount` tonnes of carbon removals.


| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of carbon removals for the purchase. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | fee the amount of the fee for Nori. |

### calculateCheckoutTotal

```solidity
function calculateCheckoutTotal(uint256 amount) external view returns (uint256)
```

Calculates the total quantity of bpNORI required to make a purchase of the specified `amount` (in tonnes of
carbon removals).


| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of carbon removals for the purchase. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | totalAmount total quantity of bpNORI required to make the purchase, including the fee. |

### calculateCertificateAmountFromPurchaseTotal

```solidity
function calculateCertificateAmountFromPurchaseTotal(uint256 purchaseTotal) external view returns (uint256)
```

Calculates the quantity of carbon removals being purchased given the purchase total and the
percentage of that purchase total that is due to Nori as a transaction fee.


| Name | Type | Description |
| ---- | ---- | ----------- |
| purchaseTotal | uint256 | The total amount of Nori used for a purchase. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | certificateAmount The amount for the certificate, excluding the transaction fee. |

### removalAddress

```solidity
function removalAddress() external view returns (address)
```

Get the Removal contract address.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Returns the address of the Removal contract. |

### restrictedNoriAddress

```solidity
function restrictedNoriAddress() external view returns (address)
```

Get the RestrictedNORI contract address.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Returns the address of the RestrictedNORI contract. |

### certificateAddress

```solidity
function certificateAddress() external view returns (address)
```

Get the Certificate contract address.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Returns the address of the Certificate contract. |

### bridgedPolygonNoriAddress

```solidity
function bridgedPolygonNoriAddress() external view returns (address)
```

Get the BridgedPolygonNori contract address.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Returns the address of the BridgedPolygonNori contract. |

### getActiveSuppliers

```solidity
function getActiveSuppliers() external view returns (address[] suppliers)
```

Get a list of all suppliers which have listed removals in the marketplace.



| Name | Type | Description |
| ---- | ---- | ----------- |
| suppliers | address[] | Returns an array of all suppliers that currently have removals listed in the market. |

### getRemovalIdsForSupplier

```solidity
function getRemovalIdsForSupplier(address supplier) external view returns (uint256[] removalIds)
```

Get all listed removal IDs for a given supplier.


| Name | Type | Description |
| ---- | ---- | ----------- |
| supplier | address | The supplier for which to return listed removal IDs. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| removalIds | uint256[] | The listed removal IDs for this supplier. |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

Check whether this contract supports an interface.

<i>See [IERC165.supportsInterface](
https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | The interface ID to check for support. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Returns true if the interface is supported, false otherwise. |

### _fulfillOrder

```solidity
function _fulfillOrder(uint256 certificateAmount, address operator, address recipient, uint256 countOfRemovalsAllocated, uint256[] ids, uint256[] amounts, address[] suppliers) internal
```

Fulfill an order.

<i>This function is responsible for paying suppliers, routeing tokens to the RestrictedNORI contract, paying Nori
the order fee, updating accounting, and minting the Certificate.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| certificateAmount | uint256 | The total amount for the certificate. |
| operator | address | The message sender. |
| recipient | address | The recipient of the certificate. |
| countOfRemovalsAllocated | uint256 | The number of distinct removal ids that are involved in fulfilling this order. |
| ids | uint256[] | An array of removal IDs involved in fulfilling this order. |
| amounts | uint256[] | An array of amounts being allocated from each corresponding removal token. |
| suppliers | address[] | An array of suppliers. |


### _addActiveRemoval

```solidity
function _addActiveRemoval(uint256 removalId) internal
```

Add a removal to the list of active supply.

<i>Adds the specified removal ID to the `_listedSupply` data structure. If this is the supplier's
first listed removal, the supplier is also added to the active supplier queue.

Emits a `RemovalAdded` event.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The ID of the removal to add. |


### _removeActiveRemoval

```solidity
function _removeActiveRemoval(uint256 removalId, address supplierAddress) internal
```

Remove a removal from the list of active supply.

<i>Removes the specified removal ID from the listed supply data structure. If this is the supplier's last
listed removal, the supplier is also removed from the active supplier queue.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The ID of the removal to remove. |
| supplierAddress | address | The address of the supplier of the removal. |


### _validatePrioritySupply

```solidity
function _validatePrioritySupply(uint256 certificateAmount, uint256 availableSupply) internal view
```

Validates that the listed supply is enough to fulfill the purchase given the priority restricted threshold.

<i>Reverts if available stock is being reserved for priority buyers and buyer is not priority.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| certificateAmount | uint256 | The number of carbon removals being purchased. |
| availableSupply | uint256 | The amount of listed supply in the market. |


### _isAuthorizedWithdrawal

```solidity
function _isAuthorizedWithdrawal(address owner) internal view returns (bool)
```


<i>Authorizes withdrawal for the removal. Reverts if the caller is not the owner of the removal and
does not have the role `MARKET_ADMIN_ROLE`.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The owner of the removal. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | Returns true if the caller is the owner, an approved spender, or has the role &#x60;MARKET_ADMIN_ROLE&#x60;, false otherwise. |

### _validateSupply

```solidity
function _validateSupply(uint256 certificateAmount, uint256 availableSupply) internal pure
```

Validates if there is enough supply to fulfill the order.

<i>Reverts if total available supply in the market is not enough to fulfill the purchase.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| certificateAmount | uint256 | The number of carbon removals being purchased. |
| availableSupply | uint256 | The amount of listed supply in the market. |


### _allocateSupply

```solidity
function _allocateSupply(uint256 certificateAmount) private returns (uint256, uint256[], uint256[], address[])
```

Allocates the removals, amounts, and suppliers needed to fulfill the purchase.


| Name | Type | Description |
| ---- | ---- | ----------- |
| certificateAmount | uint256 | The number of carbon removals to purchase. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of distinct removal IDs used to fulfill this order. |
| [1] | uint256[] | An array of the removal IDs being drawn from to fulfill this order. |
| [2] | uint256[] | An array of amounts being allocated from each corresponding removal token. |
| [3] | address[] | The address of the supplier who owns each corresponding removal token. |

### _allocateSupplySingleSupplier

```solidity
function _allocateSupplySingleSupplier(uint256 certificateAmount, address supplier) private returns (uint256, uint256[], uint256[])
```

Allocates supply for an amount using only a single supplier's removals.


| Name | Type | Description |
| ---- | ---- | ----------- |
| certificateAmount | uint256 | The number of carbon removals to purchase. |
| supplier | address | The supplier from which to purchase carbon removals. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The number of distinct removal IDs used to fulfill this order. |
| [1] | uint256[] | An array of the removal IDs being drawn from to fulfill this order. |
| [2] | uint256[] | An array of amounts being allocated from each corresponding removal token. |

### _incrementCurrentSupplierAddress

```solidity
function _incrementCurrentSupplierAddress() private
```


<i>Updates `_currentSupplierAddress` to the next of whatever is the current supplier.
Used to iterate in a round-robin way through the linked list of active suppliers.</i>



### _addActiveSupplier

```solidity
function _addActiveSupplier(address newSupplierAddress) private
```


<i>Adds a supplier to the active supplier queue. Called when a new supplier is added to the marketplace.
If the first supplier, initializes a circularly doubly-linked list, where initially the first supplier points
to itself as next and previous. When a new supplier is added, at the position of the current supplier, update
the previous pointer of the current supplier to point to the new supplier, and update the next pointer of the
previous supplier to the new supplier.

Emits a `SupplierAdded` event.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| newSupplierAddress | address | the address of the new supplier to add |


### _removeActiveSupplier

```solidity
function _removeActiveSupplier(address supplierToRemove) private
```


<i>Removes a supplier from the active supplier queue. Called when a supplier's last removal is used for an order.
If the last supplier, resets the pointer for the `_currentSupplierAddress`. Otherwise, from the position of the
supplier to be removed, update the previous supplier to point to the next of the removed supplier, and the next of
the removed supplier to point to the previous address of the remove supplier. Then, set the next and previous
pointers of the removed supplier to the 0x address.

Emits a `SupplierRemoved` event.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| supplierToRemove | address | the address of the supplier to remove |




