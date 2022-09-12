## Removal


This contract uses ERC1155 tokens as an accounting system for keeping track of carbon that Nori has
verified to have been removed from the atmosphere. Each token ID encodes information about the source of the
removed carbon (see RemovalIdLib.sol for encoding details), and each token represents the smallest unit of
carbon removal accounting.  For example, in an agricultural methodology, a specific token ID represents one
parcel of land in a specific year.  The total supply of that token ID is the number of tonnes of carbon
removed.

##### Behaviors and features

##### Minting
- Only accounts with the CONSIGNOR_ROLE can mint removal tokens, which should only be account(s) controlled by Nori.

- When removal tokens are minted, additional data about those removals are stored in a mapping keyed by the token ID,
such as a projectId and a holdback percentage (which determines the percentage of the sale proceeds from the token
that will be routed to the RestrictedNORI contract). A restriction schedule is created per projectId (if necessary)
in RestrictedNORI. (see RestrictedNORI.sol)
- Minting reverts when attempting to mint a token ID that already exists.
- The function &#x60;addBalance&#x60; can be used to mint additional balance to a token ID that already exists.


##### Listing
- _Listing_ refers to the process of listing removal tokens for sale in Nori&#x27;s marketplace (Market.sol)
- Removals are listed for sale by transferring ownership of the tokens to the Market contract via
&#x60;consign&#x60;. Alternatively, If the &#x60;to&#x60; argument to &#x60;mintBatch&#x60; is the address of the Market contract,
removal tokens will be listed in the same transaction that they are minted.
- Only accounts with the CONSIGNOR_ROLE can list removals for sale in the market.


##### Releasing
- _Releasing_ refers to the process of accounting for carbon that has failed to meet its permanence guarantee
and has been released into the atmosphere prematurely.
- This accounting is performed by burning the affected balance of a removal that has been released.
- Only accounts with the RELEASER_ROLE can initiate a release.
- When a removal token is released, balances are burned in a specific order until the released amount
has been accounted for: Releasing burns first from unlisted balances, second from listed balances and third
from any certificates in which this removal may have already been included. (see &#x60;Removal.release&#x60; for more)
- Affected certificates will have any released balances replaced by new removals purchased by Nori, though an
automated implementation of this process is beyond the scope of this version of the contracts.


##### Token ID encoding and decoding
- This contract uses the inlined library RemovalIdLib.sol for uint256.
- When minting tokens, an array of structs containing information about each removal is passed as an argument to
&#x60;mintBatch&#x60; and that data is used to generate the encoded token IDs for each removal.
- &#x60;decodeRemovalIdV0&#x60; is exposed externally for encoding and decoding removal token IDs that contain uniquely
identifying information about the removal. See RemovalIdLib.sol for encoding details.

###### Additional behaviors and features

- [ERC-1155 functionality](https://eips.ethereum.org/EIPS/eip-1155)
- [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
- [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
  - all functions that mutate state are pausable
- [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
   - CONSIGNOR_ROLE
     - Can mint removal tokens and list them for sale in the Market contract
   - RELEASER_ROLE
     - Can release partial or full removal balances
   - PAUSER_ROLE
     - Can pause and unpause the contract
   - DEFAULT_ADMIN_ROLE
     - This is the only role that can add/revoke other accounts to any of the roles

##### Inherits

- [ERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc11555)
- [ERC1155Supply](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#ERC1155Supply)
- [MulticallUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Multicall)
- [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
- [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
- [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
- [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)

##### Implements

- [IERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155)
- [IERC1155MetadataURI](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155MetadataURI)
- [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
- [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)

##### Uses

- [RemovalIdLib](./RemovalIdLib.md) for uint256
- [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)




---

### CONSIGNOR_ROLE

```solidity
bytes32 CONSIGNOR_ROLE
```

Role conferring the ability to mint removals as well as the ability to list minted removals that have yet
to be listed for sale.




### RELEASER_ROLE

```solidity
bytes32 RELEASER_ROLE
```

Role conferring the the ability to mark a removal as released.




### _market

```solidity
contract Market _market
```

The &#x60;Market&#x60; contract that removals can be bought and sold from.




### _certificate

```solidity
contract Certificate _certificate
```

The &#x60;Certificate&#x60; contract that removals are retired into.




### _projectIdToHoldbackPercentage

```solidity
mapping(uint256 &#x3D;&gt; uint8) _projectIdToHoldbackPercentage
```



_Maps from a given project id to the holdback percentage that will be used to determine what percentage of
proceeds are routed to &#x60;RestrictedNORI&#x60; when removals from this project are sold._



### _removalIdToProjectId

```solidity
mapping(uint256 &#x3D;&gt; uint256) _removalIdToProjectId
```



_Maps from a removal id to the project id it belongs to._



### _addressToOwnedTokenIds

```solidity
mapping(address &#x3D;&gt; struct EnumerableSetUpgradeable.UintSet) _addressToOwnedTokenIds
```

Maps from an address to an EnumerableSet of the token ids for which that address has a non-zero balance.




### _currentMarketBalance

```solidity
uint256 _currentMarketBalance
```






### ContractAddressesRegistered

```solidity
event ContractAddressesRegistered(contract Market market, contract Certificate certificate)
```

Emitted on updating the addresses for contracts.


| Name | Type | Description |
| ---- | ---- | ----------- |
| market | contract Market | The address of the new &#x60;market&#x60; contract. |
| certificate | contract Certificate | The address of the new &#x60;certificate&#x60; contract. |


### RemovalReleased

```solidity
event RemovalReleased(uint256 id, address fromAddress, uint256 amount)
```

Emitted on releasing a removal from a supplier, the market, or a certificate.


| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The id of the removal that was released. |
| fromAddress | address | The address the removal was released from. |
| amount | uint256 | The amount that was released. |


### constructor

```solidity
constructor() public
```






### initialize

```solidity
function initialize(string baseURI) external
```






### registerContractAddresses

```solidity
function registerContractAddresses(contract Market market, contract Certificate certificate) external
```

Registers the market and certificate contracts so that they can be referenced in this contract.
Called as part of the market contract system deployment process.

Emits a &#x60;ContractAddressesRegistered&#x60; event.


| Name | Type | Description |
| ---- | ---- | ----------- |
| market | contract Market | The address of the &#x60;Market&#x60; contract. |
| certificate | contract Certificate | The address of the &#x60;Certificate&#x60; contract. ##### Requirements: - Can only be used when the caller has the &#x60;DEFAULT_ADMIN_ROLE&#x60; - Can only be used when this contract is not paused |


### mintBatch

```solidity
function mintBatch(address to, uint256[] amounts, struct DecodedRemovalIdV0[] removals, uint256 projectId, uint256 scheduleStartTime, uint8 holdbackPercentage) external
```

Mints multiple removals at once (for a single supplier).

_If &#x60;to&#x60; is the market address, the removals are listed for sale in the market._

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The recipient of this batch of removals. Should be the supplier&#x27;s address or the market address. |
| amounts | uint256[] | Each removal&#x27;s tonnes of CO2 formatted. |
| removals | struct DecodedRemovalIdV0[] | The removals to mint (represented as an array of &#x60;DecodedRemovalIdV0&#x60;). These removals are used to encode the removal IDs. |
| projectId | uint256 | The project id for this batch of removals. |
| scheduleStartTime | uint256 | The start time of the schedule for this batch of removals. |
| holdbackPercentage | uint8 | The holdback percentage for this batch of removals. ##### Requirements: - Can only be used when the caller has the &#x60;CONSIGNER_ROLE&#x60; - Enforces the rules of &#x60;Removal._beforeTokenTransfer&#x60; - Can only be used when this contract is not paused - Cannot mint to a removal ID that already exists (use &#x60;addBalance&#x60; instead) |


### addBalance

```solidity
function addBalance(address to, uint256[] amounts, uint256[] ids) external
```

Mints additional balance for multiple removals at once.

_If &#x60;to&#x60; is the market address, the removals are listed for sale in the market._

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The supplier address or market address. |
| amounts | uint256[] | Each removal&#x27;s additional tonnes of CO2 formatted. |
| ids | uint256[] | The removal IDs to add balance for. ##### Requirements: - Can only be used when the caller has the &#x60;CONSIGNER_ROLE&#x60; - Can only be used when this contract is not paused - IDs must already have been minted via &#x60;mintBatch&#x60;. - Enforces the rules of &#x60;Removal._beforeTokenTransfer&#x60;. |


### consign

```solidity
function consign(address from, uint256 id, uint256 amount) external
```

Lists the provided &#x60;amount&#x60; of the specified removal &#x60;id&#x60; for sale in Nori&#x27;s marketplace.

_The Market contract implements &#x60;onERC1155Received&#x60;, which is invoked upon receipt of any tokens from
this contract, and handles the mechanics of listing this token for sale._

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The current owner of the specified token ID and amount |
| id | uint256 | The token ID of the removal token being listed for sale |
| amount | uint256 | The balance of this token ID to transfer to the Market contract |


### release

```solidity
function release(uint256 id, uint256 amount) external
```

Accounts for carbon that has failed to meet its permanence guarantee and has been released into
the atmosphere prematurely.

_Releases &#x60;amount&#x60; of removal &#x60;id&#x60; by burning it. The replacement of released removals that had
already been included in certificates is beyond the scope of this version of the contracts.

##### Requirements:

- Releasing burns first from unlisted balances, second from listed balances and third from certificates.
- If there is unlisted balance for this removal (e.g., owned by the supplier address encoded in the token ID),
that balance is burned up to &#x60;amount&#x60;.
- If the released amount has not yet been fully burned and the removal is listed, it is delisted from the market
and up to any remaining released amount is burned from the Market&#x27;s balance.
- Finally, if the released amount is still not fully accounted for, the removal must be owned by one or more
certificates. The remaining released amount is burned from the Certificate contract&#x27;s balance and certificate
balances are decremented iteratively across each certificate until the amount is exhausted (e.g., if a removal
of amount 3 releases an amount of 2.5 and that removal is owned by 3 certificates containing an amount of 1 each
from the released removal, the resulting certificate&#x27;s removal balances for this removal are: 0, 0, and 0.5).

- The caller must have the &#x60;RELEASER_ROLE&#x60;.
- The rules of &#x60;_burn&#x60; are enforced.
- Can only be used when the contract is not paused._

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The ID of the removal to release some amount of. |
| amount | uint256 | The amount of the removal to release. |


### marketAddress

```solidity
function marketAddress() external view returns (address)
```

The address of the &#x60;Market&#x60; contract.




### certificateAddress

```solidity
function certificateAddress() external view returns (address)
```

The address of the &#x60;Certificate&#x60; contract.




### getProjectId

```solidity
function getProjectId(uint256 id) external view returns (uint256)
```

Gets the project id (which is the removal&#x27;s schedule id in RestrictedNORI) for a given removal ID.


| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The removal token ID for which to retrieve the project id |


### getHoldbackPercentage

```solidity
function getHoldbackPercentage(uint256 id) external view returns (uint8)
```

Gets the holdback percentage for a removal.


| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The removal token ID for which to retrieve the holdback percentage. |


### getMarketBalance

```solidity
function getMarketBalance() external view returns (uint256)
```

The current total balance of all removal tokens owned by the &#x60;Market&#x60; contract.
This sum is maintained as a running total for efficient lookup during purchases.




### getOwnedTokenIds

```solidity
function getOwnedTokenIds(address owner) external view returns (uint256[])
```

Returns an array of all token IDs currently owned by &#x60;owner&#x60;.


| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The account for which to retrieve owned token IDs. |


### numberOfTokensOwnedByAddress

```solidity
function numberOfTokensOwnedByAddress(address account) external view returns (uint256)
```

The number of unique token IDs owned by the given &#x60;account&#x60;.
Maintained for efficient lookup of the number of distinct removal tokens owned by the Market.


| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account for which to retrieve the unique number of token ids owned. |


### decodeRemovalIdV0

```solidity
function decodeRemovalIdV0(uint256 id) external pure returns (struct DecodedRemovalIdV0)
```

Decodes a V0 removal ID into its component data.


| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The token ID to decode. |


### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) public
```

Transfers &#x60;amount&#x60; tokens of token type &#x60;id&#x60; from &#x60;from&#x60; to &#x60;to&#x60;.

_Calls &#x60;ERC1155Upgradeable.safeTransferFrom&#x60;

Emits a &#x60;TransferSingle&#x60; event.

##### Requirements:

- Can only be called by the &#x60;Market&#x60; contract.
- &#x60;to&#x60; cannot be the zero address.
- If the caller is not &#x60;from&#x60;, it must have been approved to spend &#x60;&#x60;from&#x60;&#x60;&#x27;s tokens via &#x60;setApprovalForAll&#x60;.
- &#x60;from&#x60; must have a balance of tokens of type &#x60;id&#x60; of at least &#x60;amount&#x60;.
- If &#x60;to&#x60; refers to a smart contract, it must implement &#x60;IERC1155Receiver.onERC1155Received&#x60; and return the
acceptance magic value._



### safeBatchTransferFrom

```solidity
function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data) public
```

Batched version of &#x60;safeTransferFrom&#x60;.

Emits a &#x60;TransferBatch&#x60; event.

Requirements:

- Can only be called by the &#x60;Market&#x60; contract.
- &#x60;ids&#x60; and &#x60;amounts&#x60; must have the same length.
- If &#x60;to&#x60; refers to a smart contract, it must implement {IERC1155Receiver-onERC1155BatchReceived} and return the
acceptance magic value.




### setApprovalForAll

```solidity
function setApprovalForAll(address operator, bool approved) public
```

Grants or revokes permission to &#x60;operator&#x60; to transfer the caller&#x27;s tokens, according to &#x60;approved&#x60;,

Emits an &#x60;ApprovalForAll&#x60; event.

##### Requirements:
- Can only be used when the contract is not paused.
- &#x60;operator&#x60; cannot be the caller.


| Name | Type | Description |
| ---- | ---- | ----------- |
| operator | address | The address to grant or revoke approval from. |
| approved | bool | Whether or not the &#x60;operator&#x60; is approved to transfer the caller&#x27;s tokens. |


### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

Returns true if this contract implements the interface defined by
&#x60;interfaceId&#x60;. See the corresponding
https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
to learn more about how these ids are created.
See [IERC165.supportsInterface](
https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.
This function call must use less than 30 000 gas.




### _createRemovals

```solidity
function _createRemovals(struct DecodedRemovalIdV0[] removals, uint256 projectId) internal returns (uint256[])
```

Called during &#x60;mintBatch&#x60;, creates the removal IDs from the removal data, validates
the new IDs to prevent minting a pre-existing ID, stores the project id in a mapping.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removals | struct DecodedRemovalIdV0[] | An array of &#x60;DecodedRemovalIdV0&#x60; structs containing data about each removal |
| projectId | uint256 | The project identifier for this batch of removals. |


### _createRemoval

```solidity
function _createRemoval(uint256 id, uint256 projectId) internal
```

Called by &#x60;_createRemovals&#x60;, validates the new IDs to prevent minting a pre-existing ID,
stores the project id in a mapping.


| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The removal ID being minted. |
| projectId | uint256 | The project id for this removal. |


### _releaseFromSupplier

```solidity
function _releaseFromSupplier(uint256 id, uint256 amount) internal
```

Burns &#x60;amount&#x60; of token ID &#x60;id&#x60; from the supplier address encoded in the ID.

Emits a &#x60;RemovalReleased&#x60; event.


| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The token ID to burn. |
| amount | uint256 | The amount to burn. |


### _releaseFromMarket

```solidity
function _releaseFromMarket(uint256 id, uint256 amount) internal
```

Burns &#x60;amount&#x60; of token ID &#x60;id&#x60; from the Market&#x27;s balance.

Emits a &#x60;RemovalReleased&#x60; event.


| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The token ID to burn. |
| amount | uint256 | The amount to burn. |


### _releaseFromCertificate

```solidity
function _releaseFromCertificate(uint256 id, uint256 amount) internal
```

Burns &#x60;amount&#x60; of token ID &#x60;id&#x60; from the Certificate&#x27;s balance. Updates the internal accounting in
Certificate that maps removal IDs and amounts to the certificates in which they were included by iteratively
releasing from affected certificates (&#x60;Certficiate.releaseRemoval&#x60;) until &#x60;amount&#x60; removals have been released.

Emits a &#x60;RemovalReleased&#x60; event.


| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The token ID to burn. |
| amount | uint256 | The amount to burn. |


### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256[] ids, uint256[] amounts, bytes data) internal virtual
```

Hook that is called before before any token transfer. This includes minting and burning, as well as
batched variants. Disables transfers to any address that is not the &#x60;Market&#x60; or &#x60;Certificate&#x60; contracts, the zero
address (for burning), or the supplier address that is encoded in the token ID itself.

_Follows the rules of hooks defined [here](
 https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)

##### Requirements:

- The contract must not be paused.
- Enforces the rules of &#x60;ERC1155Upgradeable._beforeTokenTransfer&#x60;.
- Enforces the rules of &#x60;ERC1155SupplyUpgradeable._beforeTokenTransfer&#x60;._



### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address operator, address from, address to, uint256[] ids, uint256[] amounts, bytes data) internal virtual
```

Hook that is called after any token transfer. This includes minting
and burning, as well as batched variants.
Updates the mapping from address to set of owned token IDs.

The same hook is called on both single and batched variants. For single
transfers, the length of the &#x60;id&#x60; and &#x60;amount&#x60; arrays will be 1.

Calling conditions (for each &#x60;id&#x60; and &#x60;amount&#x60; pair):

- When &#x60;from&#x60; and &#x60;to&#x60; are both non-zero, &#x60;amount&#x60; of &#x60;&#x60;from&#x60;&#x60;&#x27;s tokens
of token type &#x60;id&#x60; will be  transferred to &#x60;to&#x60;.
- When &#x60;from&#x60; is zero, &#x60;amount&#x60; tokens of token type &#x60;id&#x60; will be minted
for &#x60;to&#x60;.
- when &#x60;to&#x60; is zero, &#x60;amount&#x60; of &#x60;&#x60;from&#x60;&#x60;&#x27;s tokens of token type &#x60;id&#x60;
will be burned.
- &#x60;from&#x60; and &#x60;to&#x60; are never both zero.
- &#x60;ids&#x60; and &#x60;amounts&#x60; have the same, non-zero length.




### _updateOwnedTokenIds

```solidity
function _updateOwnedTokenIds(address from, address to, uint256[] ids) internal
```

Updates the mapping from address to set of owned token IDs.
Called during &#x60;_afterTokenTransfer&#x60;.


| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The address from which tokens were transferred. |
| to | address | The address to which tokens were transferred. |
| ids | uint256[] | The token ids that were transferred. |


### _validateRemoval

```solidity
function _validateRemoval(uint256 id) internal view
```

Validates that the provided &#x60;id&#x60; should be minted.
Reverts if a project id has already been set for &#x60;id&#x60;.


| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The ID to validate. |




