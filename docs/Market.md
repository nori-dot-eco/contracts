## Market


Facilitates the exchange of ERC20 with permit tokens for a non-transferrable certificate of carbon removal.

<i>Carbon removals are represented by ERC1155 tokens in the Removal contract, where the balance of a
given token represents the number of tonnes of carbon that were removed from the atmosphere for that specific
removal (different token IDs are used to represent different slices of carbon removal projects and years).
This contract facilitates the exchange of ERC20 tokens for ERC721 tokens managed by the Certificate contract.
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

### FulfillOrderData






```solidity
struct FulfillOrderData {
  bool chargeFee;
  uint256 certificateAmount;
  address from;
  address recipient;
  uint256 countOfRemovalsAllocated;
  uint256[] ids;
  uint256[] amounts;
  address[] suppliers;
}
```

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

Role conferring the ability to configure Nori's fee wallet, the fee percentage, and the priority
restricted threshold.




### ALLOWLIST_ROLE

```solidity
bytes32 ALLOWLIST_ROLE
```

Role conferring the ability to purchase supply when inventory is below the priority restricted threshold.




### SetPriorityRestrictedThreshold

```solidity
event SetPriorityRestrictedThreshold(uint256 threshold)
```

Emitted on setting of `_priorityRestrictedThreshold`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| threshold | uint256 | The updated threshold for priority restricted supply. |


### SetPurchasingToken

```solidity
event SetPurchasingToken(contract IERC20WithPermit purchasingToken)
```

Emitted on setting of `_purchasingToken`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| purchasingToken | contract IERC20WithPermit | The updated address of the IERC20WithPermit token used to purchase from this market. |


### SetPriceMultiple

```solidity
event SetPriceMultiple(uint256 priceMultiple)
```

Emitted on setting of `_priceMultiple`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| priceMultiple | uint256 | The updated price multiple. |


### RegisterContractAddresses

```solidity
event RegisterContractAddresses(contract Removal removal, contract Certificate certificate, contract IERC20WithPermit purchasingToken, contract RestrictedNORI restrictedNORI)
```

Emitted on updating the addresses for contracts.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | contract Removal | The address of the new Removal contract. |
| certificate | contract Certificate | The address of the new Certificate contract. |
| purchasingToken | contract IERC20WithPermit | The address of the new IERC20WithPermit contract. |
| restrictedNORI | contract RestrictedNORI | The address of the new RestrictedNORI contract. |


### UpdateNoriFeeWalletAddress

```solidity
event UpdateNoriFeeWalletAddress(address updatedWalletAddress)
```

Emitted on setting of `_noriFeeWalletAddress`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| updatedWalletAddress | address | The updated address of Nori's fee wallet. |


### UpdateNoriFeePercentage

```solidity
event UpdateNoriFeePercentage(uint256 updatedFeePercentage)
```

Emitted on setting of `_noriFeePercentage`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| updatedFeePercentage | uint256 | The updated fee percentage for Nori. |


### AddSupplier

```solidity
event AddSupplier(address added, address next, address previous)
```

Emitted when adding a supplier to `_listedSupply`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| added | address | The supplier that was added. |
| next | address | The next of the supplier that was added, updated to point to `addedSupplierAddress` as previous. |
| previous | address | the previous address of the supplier that was added, updated to point to `addedSupplierAddress` as next. |


### RemoveSupplier

```solidity
event RemoveSupplier(address removed, address next, address previous)
```

Emitted when removing a supplier from `_listedSupply`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removed | address | The supplier that was removed. |
| next | address | The next of the supplier that was removed, updated to point to `previous` as previous. |
| previous | address | the previous address of the supplier that was removed, updated to point to `next` as next. |


### AddRemoval

```solidity
event AddRemoval(uint256 id, address supplierAddress)
```

Emitted when a removal is added to `_listedSupply`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The removal that was added. |
| supplierAddress | address | The address of the supplier for the removal. |


### RestrictedNORIMintFailure

```solidity
event RestrictedNORIMintFailure(uint256 amount, uint256 removalId)
```

Emitted when the call to RestrictedNORI.mint fails during a purchase.
For example, due to sending to a contract address that is not an ERC1155Receiver.


| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of RestrictedNORI in the mint attempt. |
| removalId | uint256 | The removal id in the mint attempt. |


### SkipRestrictedNORIERC20Transfer

```solidity
event SkipRestrictedNORIERC20Transfer(uint256 amount, uint256 removalId, uint256 currentHoldbackPercentage, address rNoriUnderlyingToken, address purchasingTokenAddress)
```

Emitted when the ERC20 token that would be transferred to the RestrictedNORI contract is not the token
address that RestrictedNORI was configured to wrap.


| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of _purchasingToken currency in the failed transfer attempt. |
| removalId | uint256 | The removal id being processed during the transfer attempt. |
| currentHoldbackPercentage | uint256 | The holdback percentage for this removal id's project at the time of this event emission. |
| rNoriUnderlyingToken | address | The address of the token contract that RestrictedNORI was configured to wrap. |
| purchasingTokenAddress | address | The address of the ERC20 token that would have been transferred to RestrictedNORI. |


### UpdateCertificate

```solidity
event UpdateCertificate(uint256 certificateId, uint256[] removalIds, uint256[] amounts, uint256[] removalIdsBeingReplaced, uint256[] amountsBeingReplaced, address purchasingTokenAddress, uint256 priceMultiple)
```

Emitted when replacement removals are sent to this contract on behalf of an existing certificate.


| Name | Type | Description |
| ---- | ---- | ----------- |
| certificateId | uint256 | The certificate id that was updated. |
| removalIds | uint256[] | The removal ids that were added to the certificate. |
| amounts | uint256[] | The amount of each removal id that were added to the certificate. |
| removalIdsBeingReplaced | uint256[] | The removal ids that were released from the certificate. |
| amountsBeingReplaced | uint256[] | The amount of each removal id that was released from the certificate. |
| purchasingTokenAddress | address | The address of the token used to purchase the replacement removals. |
| priceMultiple | uint256 | The number of purchasing tokens required to buy one NRT. |


### constructor

```solidity
constructor() public
```

Locks the contract, preventing any future re-initialization.

<i>See more [here](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable-_disableInitializers--).</i>



### initialize

```solidity
function initialize(contract Removal removal, contract IERC20WithPermit purchasingToken, contract Certificate certificate, contract RestrictedNORI restrictedNori, address noriFeeWalletAddress, uint256 noriFeePercentage_, uint256 priceMultiple_) external
```

Initializes the Market contract.

<i>Reverts if `_noriFeeWallet` is not set.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | contract Removal | The address of the Removal contract. |
| purchasingToken | contract IERC20WithPermit | The address of the IERC20WithPermit token used to purchase from this market. |
| certificate | contract Certificate | The address of the Certificate contract. |
| restrictedNori | contract RestrictedNORI | The address of the RestrictedNORI contract. |
| noriFeeWalletAddress | address | The address for Nori's fee wallet. |
| noriFeePercentage_ | uint256 | The percentage to take from every transaction. This fee is sent to the address specified by `noriFeeWalletAddress`. |
| priceMultiple_ | uint256 | The number of base tokens required to purchase one NRT. |


### release

```solidity
function release(uint256 removalId) external
```

Releases a removal from the market.

<i>This function is called by the Removal contract when releasing removals.

##### Requirements:

- Can only be used when this contract is not paused.
- The caller must be the Removal contract.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The ID of the removal to release. |


### replace

```solidity
function replace(address treasury, uint256 certificateId, uint256 totalAmountToReplace, uint256[] removalIdsBeingReplaced, uint256[] amountsBeingReplaced) external
```

Purchases removals on behalf of the Certificate contract in order to replace removals that have been
released from an existing certificate.

<i>Replacement removals are sent to the Certificate contract and an event is emitted by the Certificate contract
to indicate the specific certificate on behalf of which removals are being replaced, as well as the IDs and amounts
of the replacement removals.

##### Requirements:

- Can only be used when this contract is not paused.
- The caller must have the MARKET_ADMIN_ROLE.
- The amount of removals to purchase must be less than or equal to the amount of removals available in the
market.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| treasury | address | The address of the treasury that will fund the replacement purchase. |
| certificateId | uint256 | The ID of the certificate on behalf of which removals are being replaced. |
| totalAmountToReplace | uint256 | The total amount of replacement removals to purchase. |
| removalIdsBeingReplaced | uint256[] | The removal ids that are being replaced. |
| amountsBeingReplaced | uint256[] | The amount of each removal id that is being replaced. |


### registerContractAddresses

```solidity
function registerContractAddresses(contract Removal removal, contract Certificate certificate, contract IERC20WithPermit purchasingToken, contract RestrictedNORI restrictedNORI) external
```

Register the market contract's asset addresses.

<i>Register the Removal, Certificate, IERC20WithPermit, and RestrictedNORI contracts so that they
can be referenced in this contract. Called as part of the market contract system deployment process.

Emits a `RegisterContractAddresses` event.

##### Requirements:

- Can only be used when the caller has the `DEFAULT_ADMIN_ROLE` role.
- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | contract Removal | The address of the Removal contract. |
| certificate | contract Certificate | The address of the Certificate contract. |
| purchasingToken | contract IERC20WithPermit | The address of the IERC20WithPermit token used to purchase from this market. |
| restrictedNORI | contract RestrictedNORI | The address of the market contract. |


### setPurchasingTokenAndPriceMultiple

```solidity
function setPurchasingTokenAndPriceMultiple(contract IERC20WithPermit purchasingToken, uint256 priceMultiple) external
```

Set the purchasing token contract address, an IERC20WithPermit token used to purchase from this market,
and the price multiple, which is the number of tokens required to purchase one NRT.

<i>Emits a `SetPurchasingToken` event and a `SetPriceMultiple` event.

##### Requirements:

- Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| purchasingToken | contract IERC20WithPermit | The new purchasing token contract address. |
| priceMultiple | uint256 | The new price multiple. |


### setPriorityRestrictedThreshold

```solidity
function setPriorityRestrictedThreshold(uint256 threshold) external
```

Sets the current value of the priority restricted threshold, which is the amount of inventory
that will always be reserved to sell only to buyers with the `ALLOWLIST_ROLE` role.

<i>Emits a `SetPriorityRestrictedThreshold` event.

##### Requirements:

- Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| threshold | uint256 | The updated priority restricted threshold |


### setNoriFeePercentage

```solidity
function setNoriFeePercentage(uint256 noriFeePercentage_) external
```

Sets the fee percentage (as an integer) which is the percentage of each purchase that will be paid to Nori
as the marketplace operator.

<i>Emits a `UpdateNoriFeePercentage` event.

##### Requirements:

- Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| noriFeePercentage_ | uint256 | The new fee percentage as an integer. |


### setNoriFeeWallet

```solidity
function setNoriFeeWallet(address noriFeeWalletAddress) external
```

Sets Nori's fee wallet address (as an integer) which is the address to which the
marketplace operator fee will be routed during each purchase.

<i>Emits a `UpdateNoriFeeWalletAddress` event.

##### Requirements:

- Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
- Can only be used when this contract is not paused.</i>

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
function swap(address recipient, address permitOwner, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external
```

Exchange ERC20 tokens for an ERC721 certificate by transferring ownership of the removals to the
certificate. Relies on the EIP-2612 permit extension to facilitate ERC20 token transfer.

<i>See [ERC20Permit](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Permit) for more.
The message sender must present a valid permit to this contract to temporarily authorize this market
to transfer the permit owner's ERC20 to complete the purchase. A certificate is minted in the Certificate contract
to the specified recipient and the ERC20 is distributed to the suppliers of the carbon removals,
to the RestrictedNORI contract that controls any restricted tokens owed to the suppliers, and finally
to Nori Inc. as a market operator fee.

##### Requirements:

- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address to which the certificate will be issued. |
| permitOwner | address | The address that signed the EIP2612 permit and will pay for the removals. |
| amount | uint256 | The total amount of Removals being purchased. |
| deadline | uint256 | The EIP2612 permit deadline in Unix time. |
| v | uint8 | The recovery identifier for the permit's secp256k1 signature. |
| r | bytes32 | The r value for the permit's secp256k1 signature. |
| s | bytes32 | The s value for the permit's secp256k1 signature. |


### swap

```solidity
function swap(address recipient, uint256 amount) external
```

Exchange ERC20 tokens for an ERC721 certificate by transferring ownership of the removals to the
certificate. Relies on pre-approval of this market by the transaction sender to transfer the sender's tokens.

<i>See [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20-approve-address-uint256-)
for more.
The sender must have granted approval to this contract to authorize this market to transfer their
supported ERC20 to complete the purchase. A certificate is minted in the Certificate contract
to the specified recipient and the ERC20 tokens are distributed to the supplier(s) of the carbon removals,
to the RestrictedNORI contract that controls any restricted tokens owed to the suppliers, and finally
to Nori Inc. as a market operator fee.

##### Requirements:

- Can only be used when this contract is not paused.
- Can only be used if this contract has been granted approval to transfer the sender's ERC20 tokens.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address to which the certificate will be issued. |
| amount | uint256 | The total amount of Removals to purchase. |


### swapFromSupplier

```solidity
function swapFromSupplier(address recipient, address permitOwner, uint256 amount, address supplier, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external
```

An overloaded version of `swap` that additionally accepts a supplier address and will exchange
IERC20WithPermit tokens for an ERC721 certificate token and transfers ownership of removal tokens supplied only
from the specified supplier to that certificate. If the specified supplier does not have enough carbon removals
for sale to fulfill the order the transaction will revert.

<i>See [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Permit) for more.
The message sender must present a valid permit to this contract to temporarily authorize this market
to transfer the sender's IERC20WithPermit to complete the purchase. A certificate is issued by the Certificate
contract to the specified recipient and the ERC20 is distributed to the supplier of the carbon removal,
to the RestrictedNORI contract that controls any restricted ERC20 owed to the supplier, and finally
to Nori Inc. as a market operator fee.

##### Requirements:

- Can only be used when this contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address to which the certificate will be issued. |
| permitOwner | address | The address that signed the EIP2612 permit and will pay for the removals. |
| amount | uint256 | The total purchase amount in ERC20 tokens. This is the combined total price of the removals being purchased and the fee paid to Nori. |
| supplier | address | The only supplier address from which to purchase carbon removals in this transaction. |
| deadline | uint256 | The EIP2612 permit deadline in Unix time. |
| v | uint8 | The recovery identifier for the permit's secp256k1 signature. |
| r | bytes32 | The r value for the permit's secp256k1 signature. |
| s | bytes32 | The s value for the permit's secp256k1 signature. |


### swapFromSupplier

```solidity
function swapFromSupplier(address recipient, uint256 amount, address supplier) external
```

An overloaded version of `swap` that additionally accepts a supplier address and will exchange
ERC20 tokens for an ERC721 certificate token and transfers ownership of removal tokens supplied only
from the specified supplier to that certificate. If the specified supplier does not have enough carbon removals
for sale to fulfill the order the transaction will revert.

<i>See [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20-approve-address-uint256-)
for more.
The sender must have already granted approval to this contract in order to transfer their ERC20 tokens to
complete the purchase. A certificate is issued by the Certificate contract to the specified recipient and the
ERC20 tokens are distributed to the supplier of the carbon removal, to the RestrictedNORI contract that controls
any restricted ERC20 tokens owed to the supplier, and finally to Nori Inc. as a market operator fee.

##### Requirements:

- Can only be used when this contract is not paused.
- Can only be used if this contract has been granted approval to transfer the sender's ERC20 tokens.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address to which the certificate will be issued. |
| amount | uint256 | The total purchase amount in ERC20 tokens. This is the combined total price of the removals being purchased and the fee paid to Nori. |
| supplier | address | The only supplier address from which to purchase carbon removals in this transaction. |


### swapWithoutFee

```solidity
function swapWithoutFee(address recipient, address purchaser, uint256 amount) external
```

Exchange ERC20 tokens for an ERC721 certificate by transferring ownership of the removals to the
certificate without charging a transaction fee.

<i>See [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20-approve-address-uint256-)
for more.
The purchaser must have granted approval to this contract to authorize this market to transfer their
supported ERC20 to complete the purchase. A certificate is minted in the Certificate
contract to the specified recipient and the ERC20 is distributed to the suppliers of the carbon removals, and
potentially to the RestrictedNORI contract that controls any restricted portion of the ERC20 owed to each supplier.

##### Requirements:

- Can only be used when this contract is not paused.
- Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
- Can only be used if this contract has been granted approval to spend the purchaser's ERC20 tokens.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address to which the certificate will be issued. |
| purchaser | address | The address that will pay for the removals and has granted approval to this contract to transfer their ERC20 tokens. |
| amount | uint256 | The total purchase amount in ERC20 tokens. This is the total number of removals being purchased, scaled by the price multiple. |


### swapFromSupplierWithoutFee

```solidity
function swapFromSupplierWithoutFee(address recipient, address purchaser, uint256 amount, address supplier) external
```

An overloaded version of `swap` that additionally accepts a supplier address and will exchange supported
ERC20 tokens for an ERC721 certificate token and transfers ownership of removal tokens supplied only from the
specified supplier to that certificate, without charging a transaction fee. If the specified supplier does not have
enough carbon removals for sale to fulfill the order the transaction will revert.

<i>See [here](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20-approve-address-uint256-) for
more. The purchaser must have granted approval to this contract to authorize this market to transfer their
supported ERC20 tokens to complete the purchase. A certificate is issued by the Certificate contract
to the specified recipient and the ERC20 tokens are distributed to the supplier(s) of the carbon removal as well as
potentially to the RestrictedNORI contract that controls any restricted portion of the ERC20 owed to the supplier.

##### Requirements:

- Can only be used when this contract is not paused.
- Can only be used when the caller has the `MARKET_ADMIN_ROLE` role.
- Can only be used when the specified supplier has enough carbon removals for sale to fulfill the order.
- Can only be used if this contract has been granted approval to spend the purchaser's ERC20 tokens.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address to which the certificate will be issued. |
| purchaser | address | The address that will pay for the removals and has granted approval to this contract to transfer their ERC20 tokens. |
| amount | uint256 | The total purchase amount in ERC20 tokens. This is the total number of removals being purchased, scaled by the price multiple. |
| supplier | address | The only supplier address from which to purchase carbon removals in this transaction. |


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


### getPriceMultiple

```solidity
function getPriceMultiple() external view returns (uint256)
```

Get the current value of the price multiple, which is the number of base tokens required to
purchase one NRT.




### getPriorityRestrictedThreshold

```solidity
function getPriorityRestrictedThreshold() external view returns (uint256)
```

Returns the current value of the priority restricted threshold, which is the amount of inventory
that will always be reserved to sell only to buyers with the `ALLOWLIST_ROLE` role.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The threshold of supply allowed for priority customers only. |

### getNoriFeePercentage

```solidity
function getNoriFeePercentage() external view returns (uint256)
```

Returns the current value of the fee percentage, as an integer, which is the percentage of
each purchase that will be paid to Nori as the marketplace operator.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The percentage of each purchase that will be paid to Nori as the marketplace operator. |

### getNoriFeeWallet

```solidity
function getNoriFeeWallet() external view returns (address)
```

Returns the address to which the marketplace operator fee will be routed during each purchase.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The wallet address used for Nori&#x27;s fees. |

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
| [0] | uint256 | The amount of the fee charged by Nori in &#x60;_purchasingToken&#x60;. |

### convertRemovalAmountToPurchasingTokenAmount

```solidity
function convertRemovalAmountToPurchasingTokenAmount(uint256 removalAmount) external view returns (uint256)
```

Converts a removal amount to a purchasing token amount.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of purchasing tokens required to purchase the specified amount of removals. |

### convertPurchasingTokenAmountToRemovalAmount

```solidity
function convertPurchasingTokenAmountToRemovalAmount(uint256 purchasingTokenAmount) external view returns (uint256)
```


<i>Converts a purchasing token amount to a removal amount.</i>


| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of removals that can be purchased with the specified amount of purchasing tokens. |

### calculateCheckoutTotal

```solidity
function calculateCheckoutTotal(uint256 amount) external view returns (uint256)
```

Calculates the total quantity of ERC20 tokens required to make a purchase of the specified `amount` (in
tonnes of carbon removals).


| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of carbon removals for the purchase. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total quantity of the &#x60;_purchaseToken&#x60; required to make the purchase. |

### calculateCheckoutTotalWithoutFee

```solidity
function calculateCheckoutTotalWithoutFee(uint256 amount) external view returns (uint256)
```

Calculates the total quantity of ERC20 tokens required to make a purchase of the specified `amount` (in
tonnes of carbon removals) without a transaction fee.


| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of carbon removals for the purchase. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total quantity of ERC20 tokens required to make the purchase, excluding the fee. |

### calculateCertificateAmountFromPurchaseTotal

```solidity
function calculateCertificateAmountFromPurchaseTotal(uint256 purchaseTotal) external view returns (uint256)
```

Calculates the quantity of carbon removals that can be purchased given some payment amount taking into
account NRT price and fees (i.e., I have $100 (100_000_000 USDC), how many NRTs can I buy?).


| Name | Type | Description |
| ---- | ---- | ----------- |
| purchaseTotal | uint256 | The total number of `_purchasingToken`s used for a purchase. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Amount for the certificate, excluding the transaction fee. |

### calculateCertificateAmountFromPurchaseTotalWithoutFee

```solidity
function calculateCertificateAmountFromPurchaseTotalWithoutFee(uint256 purchaseTotal) external view returns (uint256)
```

Calculates the quantity of carbon removals that can be purchased given some payment amount taking into
account NRT price but excluding fees (i.e., I have $100 (100_000_000 USDC), how many NRTs can I buy?).


| Name | Type | Description |
| ---- | ---- | ----------- |
| purchaseTotal | uint256 | The total number of `_purchasingToken`s used for a purchase. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | Amount for the certificate. |

### getRemovalAddress

```solidity
function getRemovalAddress() external view returns (address)
```

Get the Removal contract address.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Returns the address of the Removal contract. |

### getRestrictedNoriAddress

```solidity
function getRestrictedNoriAddress() external view returns (address)
```

Get the RestrictedNORI contract address.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Returns the address of the RestrictedNORI contract. |

### getCertificateAddress

```solidity
function getCertificateAddress() external view returns (address)
```

Get the Certificate contract address.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Returns the address of the Certificate contract. |

### getPurchasingTokenAddress

```solidity
function getPurchasingTokenAddress() external view returns (address)
```

Get the contract address of the IERC20WithPermit token used to purchase from this market.



| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | Returns the address of the IERC20WithPermit contract. |

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

### _setPurchasingToken

```solidity
function _setPurchasingToken(contract IERC20WithPermit purchasingToken) internal
```

Set the purchasing token contract address, an IERC20WithPermit token used to purchase from this market.


| Name | Type | Description |
| ---- | ---- | ----------- |
| purchasingToken | contract IERC20WithPermit | The new purchasing token contract address. |


### _setPriceMultiple

```solidity
function _setPriceMultiple(uint256 priceMultiple) internal
```

Set the price multiple, which is the number of base tokens required to purchase one NRT.

<i>This value is scaled by 100 to allow for decimal precision. For example, a value of 100 means
that 1 base token is required to purchase 1 NRT, while a value of 1995 means that 19.95 base tokens
purchase 1 NRT.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| priceMultiple | uint256 | The new price multiple. |


### _transferFunds

```solidity
function _transferFunds(bool chargeFee, address from, uint256 countOfRemovalsAllocated, uint256[] ids, uint256[] amounts, address[] suppliers) internal
```

Pays the suppliers for the removals being purchased, routes funds to the RestrictedNORI contract if
necessary, and pays a fee to Nori if `chargeFee` is true.


| Name | Type | Description |
| ---- | ---- | ----------- |
| chargeFee | bool | Whether to charge a transaction fee for Nori. |
| from | address | The address of the spender. |
| countOfRemovalsAllocated | uint256 | The number of removals being purchased. |
| ids | uint256[] | The IDs of the removals being purchased. |
| amounts | uint256[] | The amounts of each removal being purchased. |
| suppliers | address[] | The suppliers who own each removal being purchased. |


### _fulfillOrder

```solidity
function _fulfillOrder(struct Market.FulfillOrderData params) internal
```

Fulfill an order.

<i>This function is responsible for paying suppliers, routing tokens to the RestrictedNORI contract, paying Nori
the order fee, updating accounting, and minting the Certificate.</i>



### _allocateRemovals

```solidity
function _allocateRemovals(address purchaser, uint256 certificateAmount) internal returns (uint256 countOfRemovalsAllocated, uint256[] ids, uint256[] amounts, address[] suppliers)
```

Allocates removals to fulfill an order.

<i>This function is responsible for validating and allocating the supply to fulfill an order.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| purchaser | address | The address of the purchaser. |
| certificateAmount | uint256 | The total amount for the certificate. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| countOfRemovalsAllocated | uint256 | The number of distinct removal IDs used to fulfill this order. |
| ids | uint256[] | An array of the removal IDs being drawn from to fulfill this order. |
| amounts | uint256[] | An array of amounts being allocated from each corresponding removal token. |
| suppliers | address[] | The address of the supplier who owns each corresponding removal token. |

### _allocateRemovalsFromSupplier

```solidity
function _allocateRemovalsFromSupplier(address purchaser, uint256 certificateAmount, address supplier) internal returns (uint256 countOfRemovalsAllocated, uint256[] ids, uint256[] amounts, address[] suppliers)
```

Allocates removals from a specific supplier to be fulfilled.

<i>This function is responsible for validating and allocating the supply from a specific supplier.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| purchaser | address | The address of the purchaser. |
| certificateAmount | uint256 | The total amount of NRTs for the certificate. |
| supplier | address | The only supplier address from which to purchase carbon removals in this transaction. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| countOfRemovalsAllocated | uint256 | The number of distinct removal IDs used to fulfill this order. |
| ids | uint256[] | An array of the removal IDs being drawn from to fulfill this order. |
| amounts | uint256[] | An array of amounts being allocated from each corresponding removal token. |
| suppliers | address[] | The address of the supplier who owns each corresponding removal token. |

### _permit

```solidity
function _permit(address owner, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) internal
```

Permits the transfer of an amount of tokens.

<i>This function is responsible permitting the transfer of ERC20 tokens.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The owner of the tokens being transferred. |
| amount | uint256 | The total purchase amount in ERC20 tokens. This is the combined total price of the removals being purchased and the fee paid to Nori. |
| deadline | uint256 | The EIP2612 permit deadline in Unix time. |
| v | uint8 | The recovery identifier for the permit's secp256k1 signature. |
| r | bytes32 | The r value for the permit's secp256k1 signature. |
| s | bytes32 | The s value for the permit's secp256k1 signature. |


### _addActiveRemoval

```solidity
function _addActiveRemoval(uint256 removalId) internal
```

Add a removal to the list of active supply.

<i>Adds the specified removal ID to the `_listedSupply` data structure. If this is the supplier's
first listed removal, the supplier is also added to the active supplier queue.

Emits a `AddRemoval` event.</i>

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


### _validateCertificateAmount

```solidity
function _validateCertificateAmount(uint256 amount) internal view
```


<i>Validates the certificate purchase amount.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Proposed amount to purchase. |


### _validatePrioritySupply

```solidity
function _validatePrioritySupply(address purchaser, uint256 certificateAmount, uint256 availableSupply) internal view
```

Validates that the listed supply is enough to fulfill the purchase given the priority restricted threshold.

<i>Reverts if available stock is being reserved for priority buyers and buyer is not priority.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| purchaser | address | The address of the buyer. |
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

### _validateReplacementAmounts

```solidity
function _validateReplacementAmounts(uint256 totalAmountToReplace, uint256[] removalAmounts, uint256[] removalAmountsBeingReplaced) internal pure
```

Validates that the removal amounts being sent for replacement sum to the same amount as the removals
being replaced.

<i>Reverts if the sum of the removal amounts being sent for replacement does not equal the sum of the removals
being replaced.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalAmountToReplace | uint256 | The total amount of removals being replaced. |
| removalAmounts | uint256[] | The amounts of removals being sent for replacement. |
| removalAmountsBeingReplaced | uint256[] | The amounts of removals being replaced. |


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




