## Removal

This contract uses ERC1155 tokens as an accounting system for keeping track of carbon that Nori has
verified to have been removed from the atmosphere. Each token ID encodes information about the source of the
removed carbon (see the [RemovalIdLib docs](../docs/RemovalIdLib.md) for encoding details), and each token represents
the smallest unit of carbon removal accounting. For example, in an agricultural methodology, a specific token ID
represents one parcel of land in a specific year. The total supply of that token ID is the number of tonnes of
carbon removed.

##### Additional behaviors and features:

###### Minting

- Only accounts with the CONSIGNOR_ROLE can mint removal tokens, which should only be account(s) controlled by Nori.
- When removal tokens are minted, additional data about those removals are stored in a mapping keyed by the token ID,
  such as a project ID and a holdback percentage (which determines the percentage of the sale proceeds from the token
  that will be routed to the RestrictedNORI contract). A restriction schedule is created per `projectId` (if necessary)
  in RestrictedNORI (see the [RestrictedNORI docs](../docs/RestrictedNORI.md)).
- Minting reverts when attempting to mint a token ID that already exists.
- The function `addBalance` can be used to mint additional balance to a token ID that already exists.

###### Listing

- _Listing_ refers to the process of listing removal tokens for sale in Nori's marketplace (the Market contract).
- Removals are listed for sale by transferring ownership of the tokens to the Market contract via
  `consign`. Alternatively, If the `to` argument to `mintBatch` is the address of the Market contract,
  removal tokens will be listed in the same transaction that they are minted.
- Only accounts with the CONSIGNOR_ROLE can list removals for sale in the market.

###### Releasing

- _Releasing_ refers to the process of accounting for carbon that has failed to meet its permanence guarantee
  and has been released into the atmosphere prematurely.
- This accounting is performed by burning the affected balance of a removal that has been released.
- Only accounts with the RELEASER_ROLE can initiate a release.
- When a removal token is released, balances are burned in a specific order until the released amount
  has been accounted for: Releasing burns first from unlisted balances, second from listed balances and third from the
  certificate contract (see `Removal.release` for more).
- Affected certificates will have any released balances replaced by new removals purchased by Nori, though an
  automated implementation of this process is beyond the scope of this version of the contracts.

###### Token ID encoding and decoding

- This contract uses the inlined library RemovalIdLib for uint256.
- When minting tokens, an array of structs containing information about each removal is passed as an argument to
  `mintBatch` and that data is used to generate the encoded token IDs for each removal.
- `decodeRemovalIdV0` is exposed externally for encoding and decoding Removal token IDs that contain uniquely
  identifying information about the removal. See the [RemovalIdLib docs](../docs/RemovalIdLib.md) for encoding details.

###### Additional behaviors and features

- [ERC-1155 functionality](https://eips.ethereum.org/EIPS/eip-1155)
- [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)
- [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all functions that mutate state are
  pausable
- [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)
- `CONSIGNOR_ROLE`: Can mint removal tokens and list them for sale in the Market contract.
- `RELEASER_ROLE`: Can release partial or full removal balances.
- `PAUSER_ROLE`: Can pause and unpause the contract.
- `DEFAULT_ADMIN_ROLE`: This is the only role that can add/revoke other accounts to any of the roles.

##### Inherits:

- [ERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc11555)
- [ERC1155Supply](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#ERC1155Supply)
- [MulticallUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Multicall)
- [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
- [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)
- [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)
- [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)

##### Implements:

- [IERC1155Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155)
- [IERC1155MetadataURI](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155MetadataURI)
- [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)
- [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)

##### Uses:

- [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)
- [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet) for
  `EnumerableSetUpgradeable.UintSet`

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

Role conferring the ability to mark a removal as released.

### \_market

```solidity
contract Market _market
```

The Market contract that removals can be bought and sold from.

### \_certificate

```solidity
contract Certificate _certificate
```

The Certificate contract that removals are retired into.

### \_projectIdToHoldbackPercentage

```solidity
mapping(uint256 => uint8) _projectIdToHoldbackPercentage
```

<i>Maps from a given project ID to the holdback percentage that will be used to determine what percentage of
proceeds are routed to the RestrictedNORI contract when removals from this project are sold.</i>

### \_removalIdToProjectId

```solidity
mapping(uint256 => uint256) _removalIdToProjectId
```

<i>Maps from a removal ID to the project ID it belongs to.</i>

### \_addressToOwnedTokenIds

```solidity
mapping(address => struct EnumerableSetUpgradeable.UintSet) _addressToOwnedTokenIds
```

Maps from an address to an EnumerableSet of the token IDs for which that address has a non-zero balance.

### \_currentMarketBalance

```solidity
uint256 _currentMarketBalance
```

The current balance of across all removals listed in the market contract.

### RegisterContractAddresses

```solidity
event RegisterContractAddresses(contract Market market, contract Certificate certificate)
```

Emitted on updating the addresses for contracts.

| Name        | Type                 | Description                                  |
| ----------- | -------------------- | -------------------------------------------- |
| market      | contract Market      | The address of the new market contract.      |
| certificate | contract Certificate | The address of the new certificate contract. |

### ReleaseRemoval

```solidity
event ReleaseRemoval(uint256 id, address fromAddress, uint256 amount)
```

Emitted on releasing a removal from a supplier, the market, or a certificate.

| Name        | Type    | Description                                |
| ----------- | ------- | ------------------------------------------ |
| id          | uint256 | The id of the removal that was released.   |
| fromAddress | address | The address the removal was released from. |
| amount      | uint256 | The amount that was released.              |

### Migrate

```solidity
event Migrate(address certificateRecipient, uint256 certificateAmount, uint256 certificateId, uint256[] removalIds, uint256[] removalAmounts)
```

Emitted when legacy removals are minted and then immediately used to migrate a legacy certificate.

| Name                 | Type      | Description                                                                                 |
| -------------------- | --------- | ------------------------------------------------------------------------------------------- |
| certificateRecipient | address   | The recipient of the certificate to mint via migration.                                     |
| certificateAmount    | uint256   | The total amount of the certificate to mint via migration (denominated in NRTs).            |
| certificateId        | uint256   | The ID of the certificate to mint via migration.                                            |
| removalIds           | uint256[] | The removal IDs to use to mint the certificate via migration.                               |
| removalAmounts       | uint256[] | The amounts for each corresponding removal ID to use to mint the certificate via migration. |

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

Initializes the Removal contract.

| Name    | Type   | Description                        |
| ------- | ------ | ---------------------------------- |
| baseURI | string | The base URI for the removal NFTs. |

### registerContractAddresses

```solidity
function registerContractAddresses(contract Market market, contract Certificate certificate) external
```

Registers the market and certificate contracts so that they can be referenced in this contract.
Called as part of the market contract system deployment process.

<i>Emits a `RegisterContractAddresses` event.

##### Requirements:

- Can only be used when the caller has the `DEFAULT_ADMIN_ROLE` role.
- Can only be used when this contract is not paused.</i>

| Name        | Type                 | Description                              |
| ----------- | -------------------- | ---------------------------------------- |
| market      | contract Market      | The address of the Market contract.      |
| certificate | contract Certificate | The address of the Certificate contract. |

### mintBatch

```solidity
function mintBatch(address to, uint256[] amounts, struct DecodedRemovalIdV0[] removals, uint256 projectId, uint256 scheduleStartTime, uint8 holdbackPercentage) external
```

Mints multiple removals at once (for a single supplier).

<i>If `to` is the market address, the removals are listed for sale in the market.

##### Requirements:

- Can only be used when the caller has the `CONSIGNOR_ROLE`
- Enforces the rules of `Removal._beforeTokenTransfer`
- Can only be used when this contract is not paused
- Cannot mint to a removal ID that already exists (use `addBalance` instead).</i>

| Name               | Type                        | Description                                                                                                                |
| ------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| to                 | address                     | The recipient of this batch of removals. Should be the supplier's address or the market address.                           |
| amounts            | uint256[]                   | Each removal's tonnes of CO2 formatted.                                                                                    |
| removals           | struct DecodedRemovalIdV0[] | The removals to mint (represented as an array of `DecodedRemovalIdV0`). These removals are used to encode the removal IDs. |
| projectId          | uint256                     | The project ID for this batch of removals.                                                                                 |
| scheduleStartTime  | uint256                     | The start time of the schedule for this batch of removals.                                                                 |
| holdbackPercentage | uint8                       | The holdback percentage for this batch of removals.                                                                        |

### addBalance

```solidity
function addBalance(address to, uint256[] amounts, uint256[] ids) external
```

Mints additional balance for multiple removals at once.

<i>If `to` is the market address, the removals are listed for sale in the market.

##### Requirements:

- Can only be used when the caller has the `CONSIGNOR_ROLE` role.
- Can only be used when this contract is not paused.
- IDs must already have been minted via `mintBatch`.
- Enforces the rules of `Removal._beforeTokenTransfer`.</i>

| Name    | Type      | Description                                        |
| ------- | --------- | -------------------------------------------------- |
| to      | address   | The supplier address or market address.            |
| amounts | uint256[] | Each removal's additional tonnes of CO2 formatted. |
| ids     | uint256[] | The removal IDs to add balance for.                |

### consign

```solidity
function consign(address from, uint256 id, uint256 amount) external
```

Lists the provided `amount` of the specified removal `id` for sale in Nori's marketplace.

<i>The Market contract implements `onERC1155Received`, which is invoked upon receipt of any tokens from
this contract, and handles the mechanics of listing this token for sale.</i>

| Name   | Type    | Description                                                     |
| ------ | ------- | --------------------------------------------------------------- |
| from   | address | The current owner of the specified token ID and amount          |
| id     | uint256 | The token ID of the removal token being listed for sale         |
| amount | uint256 | The balance of this token ID to transfer to the Market contract |

### migrate

```solidity
function migrate(uint256[] ids, uint256[] amounts, address certificateRecipient, uint256 certificateAmount) external
```

Transfers the provided `amounts` (denominated in NRTs) of the specified removal `ids` directly to the
Certificate contract to mint a legacy certificate. This function provides Nori the ability to execute a one-off
migration of legacy certificates and removals (legacy certificates and removals are those which existed prior to
our deployment to Polygon and covers all historic issuances and purchases up until the date that we start using the
Market contract).

<i>The Certificate contract implements `onERC1155BatchReceived`, which is invoked upon receipt of a batch of
removals (triggered via `_safeBatchTransferFrom`). This function circumvents the market contract's lifecycle by
transferring the removals from an account with the `CONSIGNOR_ROLE` role.

It is necessary that the consignor holds the removals because of the following:

- `ids` can be composed of a list of removal IDs that belong to one or more suppliers.
- `_safeBatchTransferFrom` only accepts one `from` address.
- `Certificate.onERC1155BatchReceived` will mint a _new_ certificate every time an additional batch is received, so
  we must ensure that all the removals comprising the certificate to be migrated come from a single batch.

##### Requirements:

- The caller must have the `CONSIGNOR_ROLE` role.
- The contract must not be paused.
- The specified removal IDs must exist (e.g., via a prior call to the `mintBatch` function).
- The rules of `Removal._beforeTokenTransfer` are enforced.</i>

| Name                 | Type      | Description                                                                                                                                                                                                    |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ids                  | uint256[] | An array of the removal IDs to add to transfer to the Certificate contract. This array can contain IDs of removals that belong to one or more supplier address (designated in the encoding of the removal ID). |
| amounts              | uint256[] | An array of the removal amounts to add to transfer to the Certificate contract. Each amount in this array corresponds to the removal ID with the same index in the `ids` parameter.                            |
| certificateRecipient | address   | The recipient of the certificate to be minted.                                                                                                                                                                 |
| certificateAmount    | uint256   | The total amount of the certificate.                                                                                                                                                                           |

### release

```solidity
function release(uint256 id, uint256 amount) external
```

Accounts for carbon that has failed to meet its permanence guarantee and has been released into
the atmosphere prematurely.

<i>Releases `amount` of removal `id` by burning it. The replacement of released removals that had
already been included in certificates is beyond the scope of this version of the contracts.

##### Requirements:

- Releasing burns first from unlisted balances, second from listed balances and third from certificates.
- If there is unlisted balance for this removal (e.g., owned by the supplier address encoded in the token ID),
  that balance is burned up to `amount`.
- If the released amount has not yet been fully burned and the removal is listed, it is delisted from the market
  and up to any remaining released amount is burned from the Market's balance.
- Finally, if the released amount is still not fully accounted for, the removal must be owned by one or more
  certificates. The remaining released amount is burned from the Certificate contract's balance.
- The caller must have the `RELEASER_ROLE`.
- The rules of `_burn` are enforced.
- Can only be used when the contract is not paused.</i>

| Name   | Type    | Description                                      |
| ------ | ------- | ------------------------------------------------ |
| id     | uint256 | The ID of the removal to release some amount of. |
| amount | uint256 | The amount of the removal to release.            |

### marketAddress

```solidity
function getMarketAddress() external view returns (address)
```

Get the address of the Market contract.

| Name | Type    | Description                         |
| ---- | ------- | ----------------------------------- |
| [0]  | address | The address of the Market contract. |

### certificateAddress

```solidity
function getCertificateAddress() external view returns (address)
```

Get the address of the Certificate contract.

| Name | Type    | Description                              |
| ---- | ------- | ---------------------------------------- |
| [0]  | address | The address of the Certificate contract. |

### getProjectId

```solidity
function getProjectId(uint256 id) external view returns (uint256)
```

Get the project ID (which is the removal's schedule ID in RestrictedNORI) for a given removal ID.

| Name | Type    | Description                                                |
| ---- | ------- | ---------------------------------------------------------- |
| id   | uint256 | The removal token ID for which to retrieve the project ID. |

| Name | Type    | Description                              |
| ---- | ------- | ---------------------------------------- |
| [0]  | uint256 | The project ID for the removal token ID. |

### getHoldbackPercentage

```solidity
function getHoldbackPercentage(uint256 id) external view returns (uint8)
```

Gets the holdback percentage for a removal.

| Name | Type    | Description                                                         |
| ---- | ------- | ------------------------------------------------------------------- |
| id   | uint256 | The removal token ID for which to retrieve the holdback percentage. |

| Name | Type  | Description                                       |
| ---- | ----- | ------------------------------------------------- |
| [0]  | uint8 | The holdback percentage for the removal token ID. |

### getMarketBalance

```solidity
function getMarketBalance() external view returns (uint256)
```

The current total balance of all removal tokens owned by the Market contract.
This sum is maintained as a running total for efficient lookup during purchases.

| Name | Type    | Description                                                           |
| ---- | ------- | --------------------------------------------------------------------- |
| [0]  | uint256 | The total balance of all removal tokens owned by the Market contract. |

### getOwnedTokenIds

```solidity
function getOwnedTokenIds(address owner) external view returns (uint256[])
```

Returns an array of all token IDs currently owned by `owner`.

| Name  | Type    | Description                                        |
| ----- | ------- | -------------------------------------------------- |
| owner | address | The account for which to retrieve owned token IDs. |

| Name | Type      | Description                                                             |
| ---- | --------- | ----------------------------------------------------------------------- |
| [0]  | uint256[] | An array of all Removal token IDs currently owned by &#x60;owner&#x60;. |

### numberOfTokensOwnedByAddress

```solidity
function numberOfTokensOwnedByAddress(address account) external view returns (uint256)
```

The number of unique token IDs owned by the given `account`.
Maintained for efficient lookup of the number of distinct removal tokens owned by the Market.

| Name    | Type    | Description                                                             |
| ------- | ------- | ----------------------------------------------------------------------- |
| account | address | The account for which to retrieve the unique number of token IDs owned. |

| Name | Type    | Description                                                                    |
| ---- | ------- | ------------------------------------------------------------------------------ |
| [0]  | uint256 | The number of unique Removal token IDs owned by the given &#x60;account&#x60;. |

### decodeRemovalIdV0

```solidity
function decodeRemovalIdV0(uint256 id) external pure returns (struct DecodedRemovalIdV0)
```

Decodes a V0 removal ID into its component data.

| Name | Type    | Description               |
| ---- | ------- | ------------------------- |
| id   | uint256 | The removal ID to decode. |

| Name | Type                      | Description                  |
| ---- | ------------------------- | ---------------------------- |
| [0]  | struct DecodedRemovalIdV0 | The decoded removal ID data. |

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) public
```

Transfers `amount` tokens of token type `id` from `from` to `to`.

<i>Calls `ERC1155Upgradeable.safeTransferFrom`

Emits a `TransferSingle` event.

##### Requirements:

- Can only be called by the Market contract.
- `to` cannot be the zero address.
- If the caller is not `from`, it must have been approved to spend `from`'s tokens via `setApprovalForAll`.
- `from` must have a balance of tokens of type `id` of at least `amount`.
- If `to` refers to a smart contract, it must implement `IERC1155Receiver.onERC1155Received` and return the
  acceptance magic value.</i>

| Name   | Type    | Description                                |
| ------ | ------- | ------------------------------------------ |
| from   | address | The address to transfer from.              |
| to     | address | The address to transfer to.                |
| id     | uint256 | The removal ID to transfer.                |
| amount | uint256 | The amount of removals to transfer.        |
| data   | bytes   | The data to pass to the receiver contract. |

### safeBatchTransferFrom

```solidity
function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data) public
```

Batched version of `safeTransferFrom`.

<i>Emits a `TransferBatch` event.

##### Requirements:

- Can only be called by the Market contract.
- `ids` and `amounts` must have the same length.
- If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155BatchReceived} and return the
  acceptance magic value.</i>

| Name    | Type      | Description                                |
| ------- | --------- | ------------------------------------------ |
| from    | address   | The address to transfer from.              |
| to      | address   | The address to transfer to.                |
| ids     | uint256[] | The removal IDs to transfer.               |
| amounts | uint256[] | The amounts of removals to transfer.       |
| data    | bytes     | The data to pass to the receiver contract. |

### setApprovalForAll

```solidity
function setApprovalForAll(address operator, bool approved) public
```

Grants or revokes permission to `operator` to transfer the caller's tokens, according to `approved`.

<i>Emits an `ApprovalForAll` event.

##### Requirements:

- Can only be used when the contract is not paused.
- `operator` cannot be the caller.</i>

| Name     | Type    | Description                                                                |
| -------- | ------- | -------------------------------------------------------------------------- |
| operator | address | The address to grant or revoke approval from.                              |
| approved | bool    | Whether or not the `operator` is approved to transfer the caller's tokens. |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

Returns true if this contract implements the interface defined by
`interfaceId`.

<i>See the corresponding [EIP section](https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified) to
learn more about how these ids are created.
See [IERC165.supportsInterface](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.
This function call must use less than 30,000 gas.</i>

| Name        | Type   | Description                                      |
| ----------- | ------ | ------------------------------------------------ |
| interfaceId | bytes4 | A bytes4 value which represents an interface ID. |

| Name | Type | Description                                                                                         |
| ---- | ---- | --------------------------------------------------------------------------------------------------- |
| [0]  | bool | True if this contract implements the interface defined by &#x60;interfaceId&#x60;, otherwise false. |

### \_createRemovals

```solidity
function _createRemovals(struct DecodedRemovalIdV0[] removals, uint256 projectId) internal returns (uint256[])
```

Called during `mintBatch`, creates the removal IDs from the removal data, validates
the new IDs to prevent minting a pre-existing ID, stores the project ID in a mapping.

| Name      | Type                        | Description                                                                 |
| --------- | --------------------------- | --------------------------------------------------------------------------- |
| removals  | struct DecodedRemovalIdV0[] | An array of `DecodedRemovalIdV0` structs containing data about each removal |
| projectId | uint256                     | The project IDentifier for this batch of removals.                          |

| Name | Type      | Description                                |
| ---- | --------- | ------------------------------------------ |
| [0]  | uint256[] | An array of removal IDs that were created. |

### \_createRemoval

```solidity
function _createRemoval(uint256 id, uint256 projectId) internal
```

Called by `_createRemovals`, validates the new IDs to prevent minting a pre-existing ID,
stores the project ID in a mapping.

| Name      | Type    | Description                      |
| --------- | ------- | -------------------------------- |
| id        | uint256 | The removal ID being minted.     |
| projectId | uint256 | The project ID for this removal. |

### \_releaseFromSupplier

```solidity
function _releaseFromSupplier(uint256 id, uint256 amount) internal
```

Burns `amount` of token ID `id` from the supplier address encoded in the ID.

<i>Emits a `ReleaseRemoval` event.</i>

| Name   | Type    | Description           |
| ------ | ------- | --------------------- |
| id     | uint256 | The token ID to burn. |
| amount | uint256 | The amount to burn.   |

### \_releaseFromMarket

```solidity
function _releaseFromMarket(uint256 id, uint256 amount) internal
```

Burns `amount` of token ID `id` from the Market's balance.

<i>Emits a `ReleaseRemoval` event.</i>

| Name   | Type    | Description           |
| ------ | ------- | --------------------- |
| id     | uint256 | The token ID to burn. |
| amount | uint256 | The amount to burn.   |

### \_releaseFromCertificate

```solidity
function _releaseFromCertificate(uint256 id, uint256 amount) internal
```

Burns `amount` of token ID `id` from the Certificate's balance.

<i>Emits a `ReleaseRemoval` event.</i>

| Name   | Type    | Description             |
| ------ | ------- | ----------------------- |
| id     | uint256 | The removal ID to burn. |
| amount | uint256 | The amount to burn.     |

### \_beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256[] ids, uint256[] amounts, bytes data) internal virtual
```

Hook that is called before any token transfer. This includes minting and burning, as well as
batched variants. Disables transfers to any address that is not the Market or Certificate contracts, the zero
address (for burning), the supplier address that is encoded in the token ID itself, or between consignors.

<i>Follows the rules of hooks defined [here](https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks)

##### Requirements:

- The contract must not be paused.
- Enforces the rules of `ERC1155Upgradeable._beforeTokenTransfer`.
- Enforces the rules of `ERC1155SupplyUpgradeable._beforeTokenTransfer`.</i>

| Name     | Type      | Description                                |
| -------- | --------- | ------------------------------------------ |
| operator | address   | The address to transfer from.              |
| from     | address   | The address to transfer from.              |
| to       | address   | The address to transfer to.                |
| ids      | uint256[] | The removal IDs to transfer.               |
| amounts  | uint256[] | The amounts of removals to transfer.       |
| data     | bytes     | The data to pass to the receiver contract. |

### \_afterTokenTransfer

```solidity
function _afterTokenTransfer(address operator, address from, address to, uint256[] ids, uint256[] amounts, bytes data) internal virtual
```

Hook that is called after any token transfer. This includes minting and burning, as well as batched
variants.

<i>Updates the mapping from address to set of owned token IDs.

The same hook is called on both single and batched variants. For single transfers, the length of the `id` and
`amount` arrays will be 1.

##### Requirements

- When `from` and `to` are both non-zero, `amount`s of `from`'s tokens with IDs `id`s will be transferred to `to`.
- When `from` is zero, `amount`s tokens of token type `id` will be minted for `to`.
- When `to` is zero, `amount`s of `from`'s tokens with IDs `id`s will be burned.
- `from` and `to` are never both zero.
- `ids` and `amounts` have the same, non-zero length.</i>

| Name     | Type      | Description                                |
| -------- | --------- | ------------------------------------------ |
| operator | address   | The address to transfer from.              |
| from     | address   | The address to transfer from.              |
| to       | address   | The address to transfer to.                |
| ids      | uint256[] | The removal IDs to transfer.               |
| amounts  | uint256[] | The amounts of removals to transfer.       |
| data     | bytes     | The data to pass to the receiver contract. |

### \_updateOwnedTokenIds

```solidity
function _updateOwnedTokenIds(address from, address to, uint256[] ids) internal
```

Updates the mapping from address to set of owned token IDs.

<i>Called during `_afterTokenTransfer`.</i>

| Name | Type      | Description                                     |
| ---- | --------- | ----------------------------------------------- |
| from | address   | The address from which tokens were transferred. |
| to   | address   | The address to which tokens were transferred.   |
| ids  | uint256[] | The token IDs that were transferred.            |

### \_validateRemoval

```solidity
function _validateRemoval(uint256 id) internal view
```

Validates that the provided `id` should be minted.

<i>Reverts if a project ID has already been set for `id`.</i>

| Name | Type    | Description         |
| ---- | ------- | ------------------- |
| id   | uint256 | The ID to validate. |
