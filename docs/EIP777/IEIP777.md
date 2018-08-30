# IEIP777


**Execution cost**: No bound available

**Deployment cost**: No bound available

**Combined cost**: No bound available


## Events
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


## Methods
### authorizeOperator(address)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*


--- 
### name()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `string`*

--- 
### isOperatorFor(address,address)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **operator** *of type `address`*
2. **tokenHolder** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

--- 
### granularity()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

--- 
### initialized()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### balanceOf(address)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **owner** *of type `address`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### operatorSend(address,address,uint256,bytes,bytes)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **to** *of type `address`*
3. **amount** *of type `uint256`*
4. **userData** *of type `bytes`*
5. **operatorData** *of type `bytes`*


--- 
### operatorSend(address,address,address,uint256,bytes,bytes)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*
2. **from** *of type `address`*
3. **to** *of type `address`*
4. **amount** *of type `uint256`*
5. **userData** *of type `bytes`*
6. **operatorData** *of type `bytes`*


--- 
### revokeOperator(address)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*


--- 
### send(address,uint256,bytes)


**Execution cost**: No bound available


Params:

1. **to** *of type `address`*
2. **amount** *of type `uint256`*
3. **userData** *of type `bytes`*


--- 
### send(address,uint256)


**Execution cost**: No bound available


Params:

1. **to** *of type `address`*
2. **amount** *of type `uint256`*


--- 
### symbol()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `string`*

--- 
### totalSupply()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

[Back to the top ↑](#ieip777)
