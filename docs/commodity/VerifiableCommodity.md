# VerifiableCommodity


**Execution cost**: No bound available

**Deployment cost**: No bound available

**Combined cost**: No bound available


## Events
### Burn(address,uint256)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **tokenId** *of type `uint256`*

--- 
### OwnerSet(address)


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

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
### Approved(address,address,uint256)


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*
2. **approved** *of type `address`*
3. **tokenId** *of type `uint256`*

--- 
### InsufficientPermission(address,uint256,bytes,uint64)


**Execution cost**: No bound available


Params:

1. **sender** *of type `address`*
2. **id** *of type `uint256`*
3. **data** *of type `bytes`*
4. **category** *of type `uint64`*

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
### Transfer(address,address,uint256)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **to** *of type `address`*
3. **tokenId** *of type `uint256`*

--- 
### Verified(uint256,bytes,uint64)


**Execution cost**: No bound available


Params:

1. **_commodityId** *of type `uint256`*
2. **_verifierData** *of type `bytes`*
3. **_category** *of type `uint64`*


## Methods
### owner()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


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


**Execution cost**: No bound available


Params:

1. **_tokenHolder** *of type `address`*
2. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `bool`*

--- 
### authorizeOperator(address)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **param_0** *of type `address`*


--- 
### approve(address,uint256)


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_tokenId** *of type `uint256`*


--- 
### balanceOf(address)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_owner** *of type `address`*

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


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_operator** *of type `address`*
2. **_tokenHolder** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

--- 
### commodityIndexToOwner(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### getParticipantRegistry()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### commodityAllowedToAddress(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### commodityIndexToApproved(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### isOperatorForOne(address,uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_operator** *of type `address`*
2. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `bool`*

--- 
### getTotalSupplyByCategory(uint64)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_category** *of type `uint64`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### getCommodityValueByIndex(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_index** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### getTotalSupply(uint64)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_category** *of type `uint64`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### getTotalSupply()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

--- 
### getCommodityCategoryByIndex(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_index** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### onlyParticipantCallers()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### operatorSendOne(address,address,uint256,bytes,bytes)


**Execution cost**: No bound available


Params:

1. **_from** *of type `address`*
2. **_to** *of type `address`*
3. **_tokenId** *of type `uint256`*
4. **_userData** *of type `bytes`*
5. **_operatorData** *of type `bytes`*


--- 
### operatorSend(address,address,uint256,bytes,bytes)


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


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **owner** *of type `address`*

--- 
### send(address,uint256,bytes)


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_tokenId** *of type `uint256`*
3. **_userData** *of type `bytes`*


--- 
### revokeOperator(address)


**Execution cost**: No bound available


Params:

1. **_operator** *of type `address`*


--- 
### participantRegistry()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### send(address,uint256)


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_tokenId** *of type `uint256`*


--- 
### setParticipantRegistry(address)


**Execution cost**: No bound available


Params:

1. **_participantRegistry** *of type `address`*


--- 
### split(uint256,address,uint256)


**Execution cost**: No bound available


Params:

1. **tokenId** *of type `uint256`*
2. **to** *of type `address`*
3. **ammount** *of type `uint256`*


--- 
### symbol()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `string`*

--- 
### toggleParticipantCalling(bool)


**Execution cost**: No bound available


Params:

1. **_toggle** *of type `bool`*


--- 
### transfer(address,uint256)


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_tokenId** *of type `uint256`*


--- 
### transferOwnership(address)


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*


--- 
### verify(uint256,bytes,uint64)


**Execution cost**: No bound available


Params:

1. **_commodityId** *of type `uint256`*
2. **_verifierData** *of type `bytes`*
3. **_category** *of type `uint64`*


[Back to the top ↑](#verifiablecommodity)
