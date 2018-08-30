# SplittableCommodity


**Execution cost**: less than 65674 gas

**Deployment cost**: less than 4191800 gas

**Combined cost**: less than 4257474 gas


## Events
### Burnt(address,uint256)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **tokenId** *of type `uint256`*

--- 
### OwnershipTransferred(address,address)


**Execution cost**: No bound available


Params:

1. **previousOwner** *of type `address`*
2. **newOwner** *of type `address`*

--- 
### InsufficientPermission(address,bytes,uint256,bytes)


**Execution cost**: No bound available


Params:

1. **sender** *of type `address`*
2. **operatorData** *of type `bytes`*
3. **value** *of type `uint256`*
4. **misc** *of type `bytes`*

--- 
### Approval(address,address,uint256)


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*
2. **approved** *of type `address`*
3. **tokenId** *of type `uint256`*

--- 
### AuthorizedOperator(address,address)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*
2. **tokenHolder** *of type `address`*

--- 
### OwnershipRenounced(address)


**Execution cost**: No bound available


Params:

1. **previousOwner** *of type `address`*

--- 
### Minted(address,uint256,address,bytes)


**Execution cost**: No bound available


Params:

1. **to** *of type `address`*
2. **amount** *of type `uint256`*
3. **operator** *of type `address`*
4. **operatorData** *of type `bytes`*

--- 
### Approved(address,address,uint256)


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*
2. **approved** *of type `address`*
3. **tokenId** *of type `uint256`*

--- 
### Minted(address,uint256,uint256,address,bytes)


**Execution cost**: No bound available


Params:

1. **to** *of type `address`*
2. **commodityId** *of type `uint256`*
3. **amount** *of type `uint256`*
4. **operator** *of type `address`*
5. **operatorData** *of type `bytes`*

--- 
### Pause()


**Execution cost**: No bound available



--- 
### RevokedOperator(address,address)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*
2. **tokenHolder** *of type `address`*

--- 
### Send(address,address,uint256,bytes,address,bytes)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **to** *of type `address`*
3. **tokenId** *of type `uint256`*
4. **userData** *of type `bytes`*
5. **operator** *of type `address`*
6. **operatorData** *of type `bytes`*

--- 
### Sent(address,address,uint256,bytes,address,bytes)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **to** *of type `address`*
3. **amount** *of type `uint256`*
4. **userData** *of type `bytes`*
5. **operator** *of type `address`*
6. **operatorData** *of type `bytes`*

--- 
### Split(address,uint256,uint64,address,bytes)


**Execution cost**: No bound available


Params:

1. **to** *of type `address`*
2. **amount** *of type `uint256`*
3. **parentId** *of type `uint64`*
4. **operator** *of type `address`*
5. **operatorData** *of type `bytes`*

--- 
### Transfer(address,address,uint256)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **to** *of type `address`*
3. **tokenId** *of type `uint256`*

--- 
### Unpause()


**Execution cost**: No bound available




## Methods
### getCommodityValueByIndex(uint256)


**Execution cost**: less than 1297 gas

**Attributes**: constant


Params:

1. **_index** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### bundleAllowanceForAddress(address,address)
>
>Returns the number of crc bundles owned by a specific address.


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_operator** *of type `address`*

    > The operator address to check.

2. **_owner** *of type `address`*

    > The owner address to check.


Returns:


1. **count** *of type `uint256`*

--- 
### approve(address,uint256)
>
>Grant another address the right to transfer a specific crc via  transferFrom(). This is the preferred flow for transferring NFTs to contracts.
>
> Required for ERC-721 compliance.


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*

    > The address to be granted transfer approval. Pass address(0) to  clear all approvals.

2. **_tokenId** *of type `uint256`*

    > The ID of the crc that can be transferred if this call succeeds.



--- 
### allowanceForAddress(address,address)
>
>Returns the total operator value of crc allowances for all bundles of   a givven address


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_operator** *of type `address`*

    > The _operator address to check allowances of.

2. **_owner** *of type `address`*

    > The address of one of the commodity owners that the operator   has an allowance for.


Returns:

> totalValue The total allowance value of an operator for a given owner

1. **totalValue** *of type `uint256`*

--- 
### balanceOf(address)
>
>Returns the total value of crcs owned by a specific address.


**Execution cost**: less than 1043 gas

**Attributes**: constant


Params:

1. **_owner** *of type `address`*

    > The owner address to check.


Returns:


1. **count** *of type `uint256`*

--- 
### authorizeOperator(address,uint256)
>
>Grant another address the right to transfer a specific crc.
>
> This is the function used to create a sale in a market contract.  In combination with ERC820, it dials a contract address, and if it is listed as the market contract, creates a sale in the context of that contract. Note: it can also be used to authorize any third party as a sender of the bundle.


**Execution cost**: No bound available


Params:

1. **_operator** *of type `address`*

    > The address of a third party operator who can manage this commodity id

2. **_tokenId** *of type `uint256`*

    > the commodity id of which you want to give a third part operator transfer   permissions for



--- 
### send(address,uint256,bytes)
>
>Send '_value' amount of tokens to address '_to'. 


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_tokenId** *of type `uint256`*
3. **_userData** *of type `bytes`*


--- 
### commodities(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **category** *of type `uint64`*
2. **timeRegistered** *of type `uint64`*
3. **parentId** *of type `uint256`*
4. **value** *of type `uint256`*
5. **locked** *of type `bool`*
6. **misc** *of type `bytes`*

--- 
### bundleBalanceOf(address)
>
>Returns the number of crc bundles owned by a specific address.


**Execution cost**: less than 1417 gas

**Attributes**: constant


Params:

1. **_owner** *of type `address`*

    > The owner address to check.


Returns:


1. **count** *of type `uint256`*

--- 
### burn(address,uint256)
>
>Sample burn function to showcase the use of the 'Burn' event. 


**Execution cost**: No bound available


Params:

1. **_tokenHolder** *of type `address`*
2. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `bool`*

--- 
### participantRegistry()


**Execution cost**: less than 1238 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### mint(address,bytes,uint256,bytes)
>
>Generates `_value` tokens to be assigned to `_tokenHolder`


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_operatorData** *of type `bytes`*

    > Data that will be passed to the recipient as a first transfer

3. **_value** *of type `uint256`*
4. **_misc** *of type `bytes`*

Returns:


1. **output_0** *of type `uint64`*

--- 
### commodityBundleIndexToApproved(uint256)


**Execution cost**: less than 1662 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### initialize(string,string,address,address,address)


**Execution cost**: No bound available


Params:

1. **_name** *of type `string`*
2. **_symbol** *of type `string`*
3. **_contractRegistryAddr** *of type `address`*
4. **_participantRegistry** *of type `address`*
5. **_owner** *of type `address`*


--- 
### isOperatorFor(address,address)
>
>Check whether '_operator' is allowed to manage the tokens held by '_tokenHolder'. 


**Execution cost**: less than 1867 gas

**Attributes**: constant


Params:

1. **_operator** *of type `address`*
2. **_tokenHolder** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

--- 
### getParticipantRegistry()


**Execution cost**: less than 1458 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### commodityIndexToOwner(uint256)


**Execution cost**: less than 1024 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### cumulativeAllowanceOf(address)
>
>Returns the total operator value of crc allowances for all bundles of   a given address


**Execution cost**: less than 1461 gas

**Attributes**: constant


Params:

1. **_operator** *of type `address`*

    > The _operator address to check allowances of.   has an allowance for.


Returns:

> totalValue The total allowance value of an operator for a given owner

1. **totalValue** *of type `uint256`*

--- 
### getTotalSupply()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

--- 
### commodityAllowedToAddress(uint256)


**Execution cost**: less than 1090 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### initialized()
>
> returns the current initialization status


**Execution cost**: less than 525 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### isOperatorForOne(address,uint256)
>
>Check whether '_operator' is allowed to manage the tokens held by '_tokenHolder'. 


**Execution cost**: less than 1203 gas

**Attributes**: constant


Params:

1. **_operator** *of type `address`*
2. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `bool`*

--- 
### getTotalSupply(uint64)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_category** *of type `uint64`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### getTotalSupplyByCategory(uint64)
>
>Returns the total number of crcs currently in existence. todo jaycen can this be uint64 and also should this instead return .value of all comms?


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_category** *of type `uint64`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### getCommodityCategoryByIndex(uint256)


**Execution cost**: less than 1501 gas

**Attributes**: constant


Params:

1. **_index** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### contractRegistry()


**Execution cost**: less than 1282 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### commodityOperatorBundleApprovals(address,address,uint256)


**Execution cost**: less than 1132 gas

**Attributes**: constant


Params:

1. **param_0** *of type `address`*
2. **param_1** *of type `address`*
3. **param_2** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### operatorSend(address,address,uint256,bytes,address,bytes,bool)


**Execution cost**: No bound available


Params:

1. **_from** *of type `address`*
2. **_to** *of type `address`*
3. **_tokenId** *of type `uint256`*
4. **_userData** *of type `bytes`*
5. **_operator** *of type `address`*
6. **_operatorData** *of type `bytes`*
7. **_preventLocking** *of type `bool`*


--- 
### symbol()
>
>Return the symbol of the token 


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `string`*

--- 
### operatorSendOne(address,address,uint256,bytes,bytes)
>
>Send '_value' amount of tokens from the address '_from' to the address '_to'. 


**Execution cost**: No bound available


Params:

1. **_from** *of type `address`*
2. **_to** *of type `address`*
3. **_tokenId** *of type `uint256`*
4. **_userData** *of type `bytes`*
5. **_operatorData** *of type `bytes`*


--- 
### setContractRegistry(address)
>
>Sets the contract registry address


**Execution cost**: less than 21966 gas


Params:

1. **_contractRegistryAddr** *of type `address`*


--- 
### owner()


**Execution cost**: less than 1150 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### revokeOperator(address,uint256)
>
>Revoke a third party '_operator''s rights to manage (send) 'msg.sender''s tokens. 


**Execution cost**: No bound available


Params:

1. **_operator** *of type `address`*
2. **_tokenId** *of type `uint256`*


--- 
### name()
>
>Return the name of the token 


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `string`*

--- 
### pause()
>
> called by the owner to pause, triggers stopped state


**Execution cost**: No bound available




--- 
### renounceOwnership()
>
>Renouncing to ownership will leave the contract without an owner. It will not be possible to call the functions with the `onlyOwner` modifier anymore.
>
> Allows the current owner to relinquish control of the contract.


**Execution cost**: less than 22600 gas




--- 
### setParticipantRegistry(address)


**Execution cost**: less than 21064 gas


Params:

1. **_participantRegistry** *of type `address`*


--- 
### onlyParticipantCallers()


**Execution cost**: less than 731 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### split(uint256,address,uint256)


**Execution cost**: No bound available


Params:

1. **_tokenId** *of type `uint256`*
2. **_to** *of type `address`*
3. **_amount** *of type `uint256`*


--- 
### ownerOf(uint256)
>
>Returns the address currently assigned ownership of a given Commodity.


**Execution cost**: less than 1080 gas

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **owner** *of type `address`*

--- 
### send(address,uint256)
>
>Send '_value' amount of tokens to address '_to'. 


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_tokenId** *of type `uint256`*


--- 
### operatorSend(address,address,uint256,bytes,bytes)
>
>Send '_value' amount of tokens from the address '_from' to the address '_to'. 


**Execution cost**: No bound available


Params:

1. **param_0** *of type `address`*
2. **param_1** *of type `address`*
3. **param_2** *of type `uint256`*
4. **param_3** *of type `bytes`*
5. **param_4** *of type `bytes`*


--- 
### paused()


**Execution cost**: less than 819 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### toggleParticipantCalling(bool)


**Execution cost**: less than 21654 gas


Params:

1. **_toggle** *of type `bool`*


--- 
### totalSupply()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

--- 
### transfer(address,uint256)
>
>Transfers a commodity to another address. If transferring to a smart contract be VERY CAREFUL to ensure that it is aware of ERC-721 .


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*

    > The address of the recipient, can be a user or contract.

2. **_tokenId** *of type `uint256`*

    > The ID of the commodity to transfer.



--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: less than 23860 gas


Params:

1. **_newOwner** *of type `address`*

    > The address to transfer ownership to.



--- 
### unpause()
>
> called by the owner to unpause, returns to normal state


**Execution cost**: No bound available




[Back to the top ↑](#splittablecommodity)
