# MintableCommodity


**Execution cost**: No bound available

**Deployment cost**: No bound available

**Combined cost**: No bound available


## Events
### Burnt(address,uint256)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **tokenId** *of type `uint256`*

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
### InsufficientPermission(address,bytes,uint256,bytes)


**Execution cost**: No bound available


Params:

1. **sender** *of type `address`*
2. **operatorData** *of type `bytes`*
3. **value** *of type `uint256`*
4. **misc** *of type `bytes`*

--- 
### OwnershipRenounced(address)


**Execution cost**: No bound available


Params:

1. **previousOwner** *of type `address`*

--- 
### OwnershipTransferred(address,address)


**Execution cost**: No bound available


Params:

1. **previousOwner** *of type `address`*
2. **newOwner** *of type `address`*

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


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_index** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### bundleAllowanceForAddress(address,address)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_operator** *of type `address`*
2. **_owner** *of type `address`*

Returns:


1. **count** *of type `uint256`*

--- 
### approve(address,uint256)


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_tokenId** *of type `uint256`*


--- 
### allowanceForAddress(address,address)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_operator** *of type `address`*
2. **_owner** *of type `address`*

Returns:


1. **totalValue** *of type `uint256`*

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
### send(address,uint256,bytes)


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


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_owner** *of type `address`*

Returns:


1. **count** *of type `uint256`*

--- 
### burn(address,uint256)


**Execution cost**: No bound available


Params:

1. **_tokenHolder** *of type `address`*
2. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `bool`*

--- 
### participantRegistry()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### mint(address,bytes,uint256,bytes)


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_operatorData** *of type `bytes`*
3. **_value** *of type `uint256`*
4. **_misc** *of type `bytes`*

Returns:


1. **output_0** *of type `uint64`*

--- 
### commodityBundleIndexToApproved(uint256)


**Execution cost**: No bound available

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


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_operator** *of type `address`*
2. **_tokenHolder** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

--- 
### getParticipantRegistry()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### commodityIndexToOwner(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### cumulativeAllowanceOf(address)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_operator** *of type `address`*

Returns:


1. **totalValue** *of type `uint256`*

--- 
### getTotalSupply()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

--- 
### commodityAllowedToAddress(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### initialized()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

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
### getTotalSupply(uint64)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_category** *of type `uint64`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### getTotalSupplyByCategory(uint64)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_category** *of type `uint64`*

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
### contractRegistry()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### commodityOperatorBundleApprovals(address,address,uint256)


**Execution cost**: No bound available

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


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `string`*

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
### setContractRegistry(address)


**Execution cost**: No bound available


Params:

1. **_contractRegistryAddr** *of type `address`*


--- 
### owner()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### revokeOperator(address,uint256)


**Execution cost**: No bound available


Params:

1. **_operator** *of type `address`*
2. **_tokenId** *of type `uint256`*


--- 
### name()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `string`*

--- 
### pause()


**Execution cost**: No bound available




--- 
### renounceOwnership()


**Execution cost**: No bound available




--- 
### setParticipantRegistry(address)


**Execution cost**: No bound available


Params:

1. **_participantRegistry** *of type `address`*


--- 
### onlyParticipantCallers()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### split(uint256,address,uint256)


**Execution cost**: No bound available


Params:

1. **tokenId** *of type `uint256`*
2. **to** *of type `address`*
3. **amount** *of type `uint256`*


--- 
### ownerOf(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **owner** *of type `address`*

--- 
### send(address,uint256)


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_tokenId** *of type `uint256`*


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
### paused()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### toggleParticipantCalling(bool)


**Execution cost**: No bound available


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


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*
2. **_tokenId** *of type `uint256`*


--- 
### transferOwnership(address)


**Execution cost**: No bound available


Params:

1. **_newOwner** *of type `address`*


--- 
### unpause()


**Execution cost**: No bound available




[Back to the top ↑](#mintablecommodity)
