# FifoCrcMarketV0_1_1


**Execution cost**: No bound available

**Deployment cost**: less than 1153000 gas

**Combined cost**: No bound available

## Constructor




## Events
### CommodityReceived(address)


**Execution cost**: No bound available


Params:

1. **sender** *of type `address`*

--- 
### OwnerSet(address)


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

--- 
### OwnershipTransferred(address,address)


**Execution cost**: No bound available


Params:

1. **previousOwner** *of type `address`*
2. **newOwner** *of type `address`*

--- 
### SaleCreated(uint256,uint64,uint32,address,uint256,bytes,uint64)


**Execution cost**: No bound available


Params:

1. **tokenId** *of type `uint256`*
2. **category** *of type `uint64`*
3. **saleType** *of type `uint32`*
4. **seller** *of type `address`*
5. **value** *of type `uint256`*
6. **misc** *of type `bytes`*
7. **startedAt** *of type `uint64`*

--- 
### SaleSuccessful(uint256,uint256,address)


**Execution cost**: No bound available


Params:

1. **tokenId** *of type `uint256`*
2. **value** *of type `uint256`*
3. **buyer** *of type `address`*


## Methods
### tokenContract()


**Execution cost**: less than 713 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### getEarliestSale()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*
2. **output_1** *of type `uint256`*

--- 
### enableCommodityOperator()


**Execution cost**: No bound available




--- 
### canImplementInterfaceForAddress(address,bytes32)


**Execution cost**: less than 664 gas

**Attributes**: constant


Params:

1. **param_0** *of type `address`*
2. **param_1** *of type `bytes32`*

Returns:


1. **output_0** *of type `bytes32`*

--- 
### enableEIP777TokensOperator()


**Execution cost**: No bound available




--- 
### commoditiesForSale(uint256)


**Execution cost**: less than 794 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **output_0** *of type `int256`*

--- 
### commodityContract()


**Execution cost**: less than 768 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### getSalePrice(uint256)


**Execution cost**: less than 814 gas

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### getSaleSeller(uint256)


**Execution cost**: less than 824 gas

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### initialize(address,address[],address)


**Execution cost**: No bound available


Params:

1. **_eip820RegistryAddr** *of type `address`*
2. **_marketItems** *of type `address[]`*
3. **_owner** *of type `address`*


--- 
### initialized()
>
> returns the current initalization status


**Execution cost**: less than 430 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### madeOperatorForCommodity(address,address,address,uint256,uint256,bytes,bytes)
>
>This function is called by the CRC contract when this contract  is given authorization to send a particular commodity. When such happens, a sale for the CRC is created and added to the bottom of the FIFO queue
>
> this function uses erc820 introspection : handler invoked when  this contract is made an operator for a commodity


**Execution cost**: No bound available


Params:

1. **param_0** *of type `address`*
2. **from** *of type `address`*

    > the owner of the crc, and the sale proceed recipient

3. **param_2** *of type `address`*
4. **tokenId** *of type `uint256`*

    > the crc to remove from the FIFO sale queue

5. **value** *of type `uint256`*

    > the number of crcs in a bundle to list for sale

6. **userData** *of type `bytes`*

    > data passed by the user

7. **param_6** *of type `bytes`*


--- 
### madeOperatorForTokens(address,address,address,uint256,bytes,bytes)
>
> erc820 introspection : handler invoked when this contract  is made an operator for an erc777 token


**Execution cost**: No bound available


Params:

1. **param_0** *of type `address`*
2. **from** *of type `address`*
3. **param_2** *of type `address`*
4. **amount** *of type `uint256`*
5. **param_4** *of type `bytes`*
6. **param_5** *of type `bytes`*


--- 
### marketItems(uint256)


**Execution cost**: less than 969 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **tokenContract** *of type `address`*

--- 
### owner()
>
> Tells the address of the owner


**Execution cost**: less than 779 gas

**Attributes**: constant



Returns:

> the address of the owner

1. **output_0** *of type `address`*

--- 
### revokedOperatorForCommodity(address,address,address,uint256,uint256,bytes,bytes)
>
>This function is called by the CRC contract when this contract  has lost authorization for a particular commodity. Since authorizations are what create the sale listings, is the market later loses authorization,  then it needs to remove the sale from the queue (failure to do so would result in the market not being able to distribute CRCs to the buyer). Since there is also no way to  Modify the queue, it is adamant that the CRC is removed from the queue or the result will be a broken market. 
>
> this function uses erc820 introspection : handler invoked when  this contract is revoked an operator for a commodity


**Execution cost**: No bound available


Params:

1. **param_0** *of type `address`*
2. **param_1** *of type `address`*
3. **param_2** *of type `address`*
4. **tokenId** *of type `uint256`*

    > the crc to remove from the FIFO sale queue

5. **param_4** *of type `uint256`*
6. **param_5** *of type `bytes`*
7. **param_6** *of type `bytes`*


--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

    > The address to transfer ownership to.



[Back to the top ↑](#fifocrcmarketv0_1_1)
