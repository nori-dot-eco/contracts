# ICommodity


**Execution cost**: No bound available

**Deployment cost**: No bound available

**Combined cost**: No bound available


## Events
### Approved(address,address,uint256)


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
### balanceOf(address)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **owner** *of type `address`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### approve(address,uint256)


**Execution cost**: No bound available


Params:

1. **to** *of type `address`*
2. **tokenId** *of type `uint256`*


--- 
### authorizeOperator(address,uint256)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*
2. **tokenId** *of type `uint256`*


--- 
### isOperatorForOne(address,uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **operator** *of type `address`*
2. **tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `bool`*

--- 
### operatorSend(address,address,uint256,bytes,bytes)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **to** *of type `address`*
3. **tokenId** *of type `uint256`*
4. **userData** *of type `bytes`*
5. **operatorData** *of type `bytes`*


--- 
### operatorSendOne(address,address,uint256,bytes,bytes)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **to** *of type `address`*
3. **tokenId** *of type `uint256`*
4. **userData** *of type `bytes`*
5. **operatorData** *of type `bytes`*


--- 
### ownerOf(uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **tokenId** *of type `uint256`*

Returns:


1. **owner** *of type `address`*

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
### split(uint256,address,uint256)


**Execution cost**: No bound available


Params:

1. **tokenId** *of type `uint256`*
2. **to** *of type `address`*
3. **ammount** *of type `uint256`*


[Back to the top ↑](#icommodity)
