# MultiAdmin
> MultiAdmin: MultiSignature wallet - Allows multiple parties to agree on transactions before execution. It should be the only address which can upgrade contracts, routes in the contract registry, etc. It is to be controlled by the Nori Developers. This contract is derived from the Gnosis multi-sig wallet.


**Execution cost**: No bound available

**Deployment cost**: less than 1690200 gas

**Combined cost**: No bound available

## Constructor



Params:

1. **_owners** *of type `address[]`*
2. **_required** *of type `uint256`*
3. **_contractRegistryAddr** *of type `address`*

## Events
### Confirmation(address,uint256)


**Execution cost**: No bound available


Params:

1. **sender** *of type `address`*
2. **transactionId** *of type `uint256`*

--- 
### Deposit(address,uint256)


**Execution cost**: No bound available


Params:

1. **sender** *of type `address`*
2. **value** *of type `uint256`*

--- 
### Execution(uint256)


**Execution cost**: No bound available


Params:

1. **transactionId** *of type `uint256`*

--- 
### ExecutionFailure(uint256)


**Execution cost**: No bound available


Params:

1. **transactionId** *of type `uint256`*

--- 
### OwnerAddition(address)


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*

--- 
### OwnerRemoval(address)


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*

--- 
### ReceivedTokens(address,address,address,uint256,bytes,bytes)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*
2. **from** *of type `address`*
3. **to** *of type `address`*
4. **amount** *of type `uint256`*
5. **userData** *of type `bytes`*
6. **operatorData** *of type `bytes`*

--- 
### RequirementChange(uint256)


**Execution cost**: No bound available


Params:

1. **required** *of type `uint256`*

--- 
### Revocation(address,uint256)


**Execution cost**: No bound available


Params:

1. **sender** *of type `address`*
2. **transactionId** *of type `uint256`*

--- 
### Submission(uint256)


**Execution cost**: No bound available


Params:

1. **transactionId** *of type `uint256`*

## Fallback


**Execution cost**: less than 2099 gas

**Attributes**: payable



## Methods
### getTransactionIds(uint256,uint256,bool,bool)
>
> Returns list of transaction IDs in defined range.


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **from** *of type `uint256`*

    > Index start position of transaction array.

2. **to** *of type `uint256`*

    > Index end position of transaction array.

3. **pending** *of type `bool`*

    > Include pending transactions.

4. **executed** *of type `bool`*

    > Include executed transactions.


Returns:

> Returns array of transaction IDs.

1. **_transactionIds** *of type `uint256[]`*

--- 
### canImplementInterfaceForAddress(address,bytes32)


**Execution cost**: less than 1179 gas

**Attributes**: constant


Params:

1. **param_0** *of type `address`*
2. **param_1** *of type `bytes32`*

Returns:


1. **output_0** *of type `bytes32`*

--- 
### MAX_OWNER_COUNT()


**Execution cost**: less than 624 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

--- 
### addOwner(address)
>
> Allows to add a new owner. Transaction has to be sent by wallet.


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*

    > Address of new owner.



--- 
### getConfirmations(uint256)
>
> Returns array with owner addresses, which confirmed transaction.


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **transactionId** *of type `uint256`*

    > Transaction ID.


Returns:

> Returns array of owner addresses.

1. **_confirmations** *of type `address[]`*

--- 
### isOwner(address)


**Execution cost**: less than 631 gas

**Attributes**: constant


Params:

1. **param_0** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

--- 
### getTransactionCount(bool,bool)
>
> Returns total number of transactions after filers are applied.


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **pending** *of type `bool`*

    > Include pending transactions.

2. **executed** *of type `bool`*

    > Include executed transactions.


Returns:

> Total number of transactions after filters are applied.

1. **count** *of type `uint256`*

--- 
### executeTransaction(uint256)
>
> Allows anyone to execute a confirmed transaction.


**Execution cost**: No bound available


Params:

1. **transactionId** *of type `uint256`*

    > Transaction ID.



--- 
### isConfirmed(uint256)
>
> Returns the confirmation status of a transaction.


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **transactionId** *of type `uint256`*

    > Transaction ID.


Returns:

> Confirmation status.

1. **output_0** *of type `bool`*

--- 
### getConfirmationCount(uint256)
>
> Returns number of confirmations of a transaction.


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **transactionId** *of type `uint256`*

    > Transaction ID.


Returns:

> Number of confirmations.

1. **count** *of type `uint256`*

--- 
### confirmTransaction(uint256)
>
> Allows an owner to confirm a transaction.


**Execution cost**: No bound available


Params:

1. **transactionId** *of type `uint256`*

    > Transaction ID.



--- 
### getOwners()
>
> Returns list of owners.


**Execution cost**: No bound available

**Attributes**: constant



Returns:

> List of owner addresses.

1. **output_0** *of type `address[]`*

--- 
### changeRequirement(uint256)
>
> Allows to change the number of required confirmations. Transaction has to be sent by wallet.


**Execution cost**: No bound available


Params:

1. **_required** *of type `uint256`*

    > Number of required confirmations.



--- 
### confirmations(uint256,address)


**Execution cost**: less than 731 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*
2. **param_1** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

--- 
### contractRegistry()


**Execution cost**: less than 856 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### removeOwner(address)
>
> Allows to remove an owner. Transaction has to be sent by wallet.


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*

    > Address of owner.



--- 
### owners(uint256)


**Execution cost**: less than 859 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### replaceOwner(address,address)
>
> Allows to replace an owner with a new owner. Transaction has to be sent by wallet.


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*

    > Address of owner to be replaced.

2. **newOwner** *of type `address`*

    > Address of new owner.



--- 
### required()


**Execution cost**: less than 846 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

--- 
### revokeConfirmation(uint256)
>
> Allows an owner to revoke a confirmation for a transaction.


**Execution cost**: No bound available


Params:

1. **transactionId** *of type `uint256`*

    > Transaction ID.



--- 
### submitTransaction(address,uint256,bytes)
>
> Allows an owner to submit and confirm a transaction.


**Execution cost**: No bound available


Params:

1. **destination** *of type `address`*

    > Transaction target address.

2. **value** *of type `uint256`*

    > Transaction ether value.

3. **data** *of type `bytes`*

    > Transaction data payload.


Returns:

> Returns transaction ID.

1. **transactionId** *of type `uint256`*

--- 
### toggleTokenReceiver(bool)


**Execution cost**: No bound available


Params:

1. **_toggle** *of type `bool`*


--- 
### tokenReceiver()


**Execution cost**: less than 660 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### tokensReceived(address,address,address,uint256,bytes,bytes)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*
2. **from** *of type `address`*
3. **to** *of type `address`*
4. **amount** *of type `uint256`*
5. **userData** *of type `bytes`*
6. **operatorData** *of type `bytes`*


--- 
### transactionCount()


**Execution cost**: less than 736 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

--- 
### transactions(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **destination** *of type `address`*
2. **value** *of type `uint256`*
3. **data** *of type `bytes`*
4. **executed** *of type `bool`*

[Back to the top ↑](#multiadmin)
