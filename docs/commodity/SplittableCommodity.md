# SplittableCommodity


**Execution cost**: No bound available

**Deployment cost**: less than 2018200 gas

**Combined cost**: No bound available


## Events
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
### OwnerSet(address)


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

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
### Burnt(address,uint256)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **amount** *of type `uint256`*

--- 
### Minted(address,uint256,address,bytes)


**Execution cost**: No bound available


Params:

1. **to** *of type `address`*
2. **amount** *of type `uint256`*
3. **operator** *of type `address`*
4. **operatorData** *of type `bytes`*

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
### Burn(address,uint256)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **tokenId** *of type `uint256`*

--- 
### Approved(address,address,uint256)


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*
2. **approved** *of type `address`*
3. **tokenId** *of type `uint256`*

--- 
### OwnershipTransferred(address,address)


**Execution cost**: No bound available


Params:

1. **previousOwner** *of type `address`*
2. **newOwner** *of type `address`*

--- 
### RevokedOperator(address,address)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*
2. **tokenHolder** *of type `address`*

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


## Methods
### owner()
>
> Tells the address of the owner


**Execution cost**: less than 996 gas

**Attributes**: constant



Returns:

> the address of the owner

1. **output_0** *of type `address`*

--- 
### commodities(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **category** *of type `uint64`*
2. **timeRegistered** *of type `uint64`*
3. **parentId** *of type `uint64`*
4. **value** *of type `uint256`*
5. **locked** *of type `bool`*
6. **misc** *of type `bytes`*

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
### authorizeOperator(address)
>
>Authorize a third party '_operator' to manage (send) 'msg.sender''s tokens. 


**Execution cost**: less than 689 gas

**Attributes**: constant


Params:

1. **param_0** *of type `address`*


--- 
### approve(address,uint256)
>
>Grant another address the right to transfer a specific crc via  transferFrom(). This is the preferred flow for transfering NFTs to contracts.
>
> Required for ERC-721 compliance.


**Execution cost**: less than 23112 gas


Params:

1. **_to** *of type `address`*

    > The address to be granted transfer approval. Pass address(0) to  clear all approvals.

2. **_tokenId** *of type `uint256`*

    > The ID of the crc that can be transferred if this call succeeds.



--- 
### balanceOf(address)
>
>Returns the number of crcs owned by a specific address.


**Execution cost**: less than 933 gas

**Attributes**: constant


Params:

1. **_owner** *of type `address`*

    > The owner address to check.


Returns:


1. **count** *of type `uint256`*

--- 
### authorizeOperator(address,uint256)


**Execution cost**: No bound available


Params:

1. **_operator** *of type `address`*
2. **_tokenId** *of type `uint256`*


--- 
### totalSupply()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

--- 
### name()
>
>Return the name of the token 


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `string`*

--- 
### initialize(string,string,address,address,address)


**Execution cost**: No bound available


Params:

1. **_name** *of type `string`*
2. **_symbol** *of type `string`*
3. **_eip820RegistryAddr** *of type `address`*
4. **_participantRegistry** *of type `address`*
5. **_owner** *of type `address`*


--- 
### isOperatorFor(address,address)
>
>Check whether '_operator' is allowed to manage the tokens held by '_tokenHolder'. 


**Execution cost**: less than 1647 gas

**Attributes**: constant


Params:

1. **_operator** *of type `address`*
2. **_tokenHolder** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

--- 
### commodityIndexToOwner(uint256)


**Execution cost**: less than 914 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### getTotalSupply(uint64)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_category** *of type `uint64`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### commodityAllowedToAddress(uint256)


**Execution cost**: less than 958 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### commodityIndexToApproved(uint256)


**Execution cost**: less than 980 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### isOperatorForOne(address,uint256)
>
>Check whether '_operator' is allowed to manage the tokens held by '_tokenHolder'. 


**Execution cost**: less than 1071 gas

**Attributes**: constant


Params:

1. **_operator** *of type `address`*
2. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `bool`*

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
### getCommodityValueByIndex(uint256)


**Execution cost**: less than 1143 gas

**Attributes**: constant


Params:

1. **_index** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### mint(address,bytes,uint256,bytes)
>
>Generates `_value` tokens to be assigned to `_tokenHolder`


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_operatorData** *of type `bytes`*

    > Data that will be passed to the recipient as a first transfer XXX: DO NOT SHIP TO PRODUCTION -- maybe we can get rid of ownermint if we allow any to creat crc category 0

3. **_value** *of type `uint256`*
4. **_misc** *of type `bytes`*

Returns:


1. **output_0** *of type `uint64`*

--- 
### getParticipantRegistry()


**Execution cost**: less than 1238 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### getTotalSupply()


**Execution cost**: less than 1028 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

--- 
### getCommodityCategoryByIndex(uint256)


**Execution cost**: less than 1325 gas

**Attributes**: constant


Params:

1. **_index** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### setParticipantRegistry(address)


**Execution cost**: less than 20654 gas


Params:

1. **_participantRegistry** *of type `address`*


--- 
### onlyParticipantCallers()


**Execution cost**: less than 602 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### send(address,uint256)
>
>Send '_value' amount of tokens to address '_to'. 


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_tokenId** *of type `uint256`*


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
### ownerOf(uint256)
>
>Returns the address currently assigned ownership of a given Commodity.


**Execution cost**: less than 920 gas

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **owner** *of type `address`*

--- 
### participantRegistry()


**Execution cost**: less than 1106 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### revokeOperator(address)
>
>Revoke a third party '_operator''s rights to manage (send) 'msg.sender''s tokens. 


**Execution cost**: less than 23100 gas


Params:

1. **_operator** *of type `address`*


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
### split(uint256,address,uint256)


**Execution cost**: No bound available


Params:

1. **_tokenId** *of type `uint256`*
2. **_to** *of type `address`*
3. **_ammount** *of type `uint256`*


--- 
### symbol()
>
>Return the symbol of the token 


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `string`*

--- 
### toggleParticipantCalling(bool)


**Execution cost**: less than 21074 gas


Params:

1. **_toggle** *of type `bool`*


--- 
### transfer(address,uint256)
>
>Transfers a commodity to another address. If transferring to a smart contract be VERY CAREFUL to ensure that it is aware of ERC-721 .


**Execution cost**: less than 105923 gas


Params:

1. **_to** *of type `address`*

    > The address of the recipient, can be a user or contract.

2. **_tokenId** *of type `uint256`*

    > The ID of the commodity to transfer.



--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

    > The address to transfer ownership to.



[Back to the top ↑](#splittablecommodity)
