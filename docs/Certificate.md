## Certificate


This contract issues sequentially increasing ERC721 token ids to purchasers of certificates of carbon  removal in Nori&#x27;s marketplace. The carbon removals that supply each certificate are accounted for using ERC1155  tokens in the Removal contract. Upon purchase, ownership of the relevant Removal token ids and balances is  transfered to this contract.  Internally, &#x60;_removalBalancesOfCertificate&#x60; tracks the subset of those Removal  tokens and balances that belong to each specific certificate id.  
##### Additional behaviors and features:
 
- [Upgradeable](https://docs.openzeppelin.com/contracts/4.x/upgradeable)  
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance)  
- [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable): all functions that mutate state are  pausable  
- [Role-based access control](https://docs.openzeppelin.com/contracts/4.x/access-control)     
- &#x60;CERTIFICATE_OPERATOR_ROLE&#x60;: The only role that can transfer certificates after they are minted     
- &#x60;PAUSER_ROLE&#x60;: Can pause and unpause the contract     
- &#x60;DEFAULT_ADMIN_ROLE&#x60;: This is the only role that can add/revoke other accounts to any of the roles  
- [Can receive ERC1155 tokens](https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#IERC1155Receiver): A  certificate is minted and internal accounting ties the certificate to the ERC1155 tokens upon receipt.  
##### Inherits:
 
- [ERC721Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721)  
- [ERC721Burnable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#ERC721Burnable)  
- [MulticallUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Multicall)  
- [PausableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)  
- [AccessControlEnumerableUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/access)  
- [ContextUpgradeable](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)  
- [Initializable](https://docs.openzeppelin.com/contracts/4.x/api/proxy#Initializable)  
- [ERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#ERC165)  
##### Implements:
 
- [IERC721](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721)  
- [IERC721Metadata](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Metadata)  
- [IERC721Enumerable](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Enumerable)  
- [IAccessControlEnumerable](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControlEnumerable)  
- [IERC165Upgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165)  
##### Uses:
 
- [EnumerableSetUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#EnumerableSet)    for EnumerableSetUpgradeable.UintSet  
- [MathUpgradeable](https://docs.openzeppelin.com/contracts/4.x/api/utils#Math)




---

### Balance






```solidity
struct Balance {
  uint256 id;
  uint256 amount;
}
```

### CERTIFICATE_OPERATOR_ROLE

```solidity
bytes32 CERTIFICATE_OPERATOR_ROLE
```

Role conferring operator permissions.

<i>This role is assigned to operators which are the only addresses which can transfer certificates outside of  minting and burning.</i>



### _removalBalancesOfCertificate

```solidity
mapping(uint256 &#x3D;&gt; mapping(uint256 &#x3D;&gt; uint256)) _removalBalancesOfCertificate
```

Keeps track of the balances for each removal of a certificate.




### _purchaseAmounts

```solidity
mapping(uint256 &#x3D;&gt; uint256) _purchaseAmounts
```

Keeps track of the original purchase amount for a certificate.




### _removalsOfCertificate

```solidity
mapping(uint256 &#x3D;&gt; struct EnumerableSetUpgradeable.UintSet) _removalsOfCertificate
```

Keeps track of the removals used for a given certificate.




### _certificatesOfRemoval

```solidity
mapping(uint256 &#x3D;&gt; struct EnumerableSetUpgradeable.UintSet) _certificatesOfRemoval
```

Keeps track of the certificates created from a given removal.




### _removal

```solidity
contract Removal _removal
```

The Removal contract that accounts for carbon removal supply.




### _baseURIValue

```solidity
string _baseURIValue
```

Base URI for token metadata




### ReceiveRemovalBatch

```solidity
event ReceiveRemovalBatch(address from, address recipient, uint256 certificateId, uint256[] removalIds, uint256[] removalAmounts)
```

Emitted when a batch of removals is recieved to create a Certificate.


| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Address removals were sent from.  @param recipient Address to send the certificate token to.  @param certificateId The ID of the certificate the removals were used for.  @param removalIds The removal IDs used for the certificate.  @param removalAmounts The amounts from each removal used for the certificate. |
| recipient | address |  |
| certificateId | uint256 |  |
| removalIds | uint256[] |  |
| removalAmounts | uint256[] |  |


### RemovalReleased

```solidity
event RemovalReleased(uint256 certificatedId, uint256 removalId, uint256 amount)
```

Emitted when a removal is released from a Certificate.


| Name | Type | Description |
| ---- | ---- | ----------- |
| certificatedId | uint256 | The certificate to connected to the removal.  @param removalId The removal to update the balance for.  @param amount The amount removed from the certificate. |
| removalId | uint256 |  |
| amount | uint256 |  |


### ContractAddressesRegistered

```solidity
event ContractAddressesRegistered(contract Removal removal)
```

Emitted on updating the addresses for contracts.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | contract Removal | The address of the new &#x60;market&#x60; contract. |


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
function registerContractAddresses(contract Removal removal) external
```

Registers the address of the Removal contract.

<i>This function is called as part of the market deployment process to register relevant contract  addresses among market contracts.  Emits a &#x60;ContractAddressesRegistered&#x60; event.  
##### Requirements:
 
- Can only be used when the contract is not paused.  
- Can only be used when the caller has the &#x60;DEFAULT_ADMIN_ROLE&#x60;</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | contract Removal | The address of the Removal contract. |


### releaseRemoval

```solidity
function releaseRemoval(uint256 certificateId, uint256 removalId, uint256 amount) external
```

Removes &#x60;amount&#x60; of this &#x60;removalId&#x60; from the specified &#x60;certificateId&#x60; in the internal accounting  that keeps track of which removals belong to a given certificate.

<i>This function can only ever be called by the Removal contract, and should be called in the course of  executing Removal.release. Burning the corresponding removal balance from the Certificate contract happens  in Removal.release.  Emits a &#x60;RemovalReleased&#x60; event.  
##### Requirements:
 
- Can only be called by the Removal contract.  
- Can only be used when contract is not paused.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| certificateId | uint256 | The id of the certificate from which this removal is being released.  @param removalId The removal token to release.  @param amount The balance of the removal token to release. |
| removalId | uint256 |  |
| amount | uint256 |  |


### onERC1155BatchReceived

```solidity
function onERC1155BatchReceived(address, address, uint256[] removalIds, uint256[] removalAmounts, bytes data) external returns (bytes4)
```

Receives a batch of child tokens, the certificate recipient and amount must be encoded in the field data.

<i>See [IERC1155Receiver](  https://docs.openzeppelin.com/contracts/4.x/api/token/erc1155#ERC1155Receiver) for more.  
##### Requirements:
 
- Can only be used when the contract is not paused (enforced by &#x60;_beforeTokenTransfers&#x60;).  
- &#x60;_msgSender&#x60; must be the removal contract.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
|  | address |  |
|  | address |  |
| removalIds | uint256[] | The array of ERC1155 Removal token ids being received in this batch.  @param removalAmounts The array of balances being received for each corresponding token id.  @param data Bytes that encode the certificate&#x27;s recipient address and total amount.  @return selector the selector of the function. |
| removalAmounts | uint256[] |  |
| data | bytes |  |


### balanceOfRemoval

```solidity
function balanceOfRemoval(uint256 certificateTokenId, uint256 removalTokenId) external view returns (uint256)
```

Returns the balance of a removal token underlying a certificate.


| Name | Type | Description |
| ---- | ---- | ----------- |
| certificateTokenId | uint256 | The certificate token to retrieve the balance for.  @param removalTokenId The removal token for which to retrieve the balance for this certificate.  @return balance The balance of a removal used for this certificate. |
| removalTokenId | uint256 |  |


### removalAddress

```solidity
function removalAddress() external view returns (address)
```

Returns the address of the &#x60;Removal&#x60; contract.  @return removalAddress address of the &#x60;Removal&#x60; contract.




### totalMinted

```solidity
function totalMinted() external view returns (uint256)
```

Returns the total number of certificates that have been minted.

<i>Includes burned certificates.  @return totalMinted Total number of certificates that have been minted.</i>



### purchaseAmount

```solidity
function purchaseAmount(uint256 certificateId) external view returns (uint256)
```

Returns the original number of tonnes of carbon removals purchased when the specified certificate  was created.


| Name | Type | Description |
| ---- | ---- | ----------- |
| certificateId | uint256 | The certificate to retrieve the original amount for.  @return purchaseAmount The tonnes of carbon removal purchased for the certificate. |


### removalsOfCertificate

```solidity
function removalsOfCertificate(uint256 certificateId) external view returns (struct Certificate.Balance[])
```

Returns the list of removal IDs that comprise the given certificate ID.


| Name | Type | Description |
| ---- | ---- | ----------- |
| certificateId | uint256 | The certificate ID for which to retrieve underlying removal IDs.  @return removals The removals comprising the certificate. |


### certificatesOfRemoval

```solidity
function certificatesOfRemoval(uint256 removalId) external view returns (struct Certificate.Balance[])
```

Returns the list of certificate IDs the given removal ID has been included in, and the balance included  in each certificate.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal token ID for which to retrieve all relevant certificate IDs and balances.  @return certificates An array of Balance structs, each of which includes an &#x60;id&#x60; and &#x60;amount&#x60;. |


### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```


<i>See [IERC165.supportsInterface](  https://docs.openzeppelin.com/contracts/4.x/api/utils#IERC165-supportsInterface-bytes4-) for more.</i>



### setApprovalForAll

```solidity
function setApprovalForAll(address, bool) public pure
```


<i>Override to disable ERC721 operator approvals, since certificate tokens are non-transferable.</i>



### approve

```solidity
function approve(address, uint256) public pure
```


<i>Override to disable ERC721 operator approvals, since certificate tokens are non-transferable.</i>



### _beforeTokenTransfers

```solidity
function _beforeTokenTransfers(address from, address to, uint256 startTokenId, uint256 quantity) internal virtual
```

A hook that is called before all transfers and is used to disallow non-minting, non-burning, and non
- certificate-operator (conferred by the &#x60;CERTIFICATE_OPERATOR_ROLE&#x60; role) transfers.

<i>Follows the rules of hooks defined [here](   https://docs.openzeppelin.com/contracts/4.x/extending-contracts#rules_of_hooks).  
##### Requirements:
 
- Can only be used when this contract is not paused  
- Can only be used when the caller has the &#x60;CERTIFICATE_OPERATOR_ROLE&#x60;</i>



### _receiveRemovalBatch

```solidity
function _receiveRemovalBatch(address recipient, uint256 certificateAmount, uint256[] removalIds, uint256[] removalAmounts) internal
```

Creates a new certificate for a batch of removals.

<i>Called when a batch of ERC1155 Removal tokens are sent to this contract.  Mints a new certificate token to the next sequential ID and updates the internal data structures  that track the relationship between the certificate and its constituent removal tokens and balances.  Emits a &#x60;ReceiveRemovalBatch&#x60; event.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| recipient | address | The address receiving the new certificate.  @param certificateAmount The total number of tonnes of carbon removals represented by the new certificate.  @param removalIds The removal token IDs that are being included in the certificate.  @param removalAmounts The balances of each corresponding removal token that are being included in the certificate. |
| certificateAmount | uint256 |  |
| removalIds | uint256[] |  |
| removalAmounts | uint256[] |  |


### _msgSenderERC721A

```solidity
function _msgSenderERC721A() internal view returns (address)
```

Returns the sender of the transaction.

<i>In all cases currently, we expect that the &#x60;_msgSender()&#x60;, &#x60;_msgSenderERC721A()&#x60; and &#x60;msg.sender&#x60; all return  the same value. As such, this function is provided solely for compatibility with OpenZeppelin and ERC721A  contracts. For more, see [here](https://github.com/chiru-labs/ERC721A/pull/281) and [here](  https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Context.sol).  @return For regular transactions it returns msg.sender and for meta transactions it *can* be used to return the end  user (rather than the relayer)</i>



### _baseURI

```solidity
function _baseURI() internal view returns (string)
```

The baseUri for the certificate token.

<i>Base URI for computing &#x60;tokenURI&#x60;. If set, the resulting URI for each token will be the concatenation of the  &#x60;baseURI&#x60; and the &#x60;tokenId&#x60;. Empty by default, it can be overridden in child contracts.</i>



### _validateReceivedRemovalBatch

```solidity
function _validateReceivedRemovalBatch(uint256[] removalIds, uint256[] removalAmounts) internal pure
```

Validates the incoming batch of removal token data by comparing the lengths of ids and amounts.

<i>Reverts if the array lengths do not match.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removalIds | uint256[] | Array of removal token ids.  @param removalAmounts Array of amounts. |
| removalAmounts | uint256[] |  |




