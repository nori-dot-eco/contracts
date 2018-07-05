# SelectableCrcMarketV0_1_0


**Execution cost**: No bound available

**Deployment cost**: less than 933800 gas

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
### commodityContract()


**Execution cost**: less than 702 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### enableCommodityOperator()


**Execution cost**: No bound available




--- 
### canImplementInterfaceForAddress(address,bytes32)


**Execution cost**: less than 598 gas

**Attributes**: constant


Params:

1. **addr** *of type `address`*
2. **interfaceHash** *of type `bytes32`*

Returns:


1. **output_0** *of type `bytes32`*

--- 
### createSale(uint256,uint64,uint32,address,uint256,bytes)


**Execution cost**: No bound available


Params:

1. **_tokenId** *of type `uint256`*
2. **_category** *of type `uint64`*
3. **_saleType** *of type `uint32`*
4. **_seller** *of type `address`*
5. **_value** *of type `uint256`*
6. **_misc** *of type `bytes`*


--- 
### enableEIP777TokensOperator()


**Execution cost**: No bound available




--- 
### getSalePrice(uint256)


**Execution cost**: less than 748 gas

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### getSaleSeller(uint256)


**Execution cost**: less than 758 gas

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
### madeOperatorForCommodity(address,address,address,uint256,uint256,bytes,bytes)
>
> erc820 introspection : handler invoked when  this contract is made an operator for a commodity


**Execution cost**: No bound available


Params:

1. **param_0** *of type `address`*
2. **from** *of type `address`*
3. **param_2** *of type `address`*
4. **tokenId** *of type `uint256`*
5. **param_4** *of type `uint256`*
6. **userData** *of type `bytes`*
7. **param_6** *of type `bytes`*


--- 
### madeOperatorForTokens(address,address,address,uint256,bytes,bytes)
>
> erc820 introspection : handler invoked when this contract is made an operator for an erc777 token


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


**Execution cost**: less than 903 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **tokenContract** *of type `address`*

--- 
### owner()
>
> Tells the address of the owner


**Execution cost**: less than 714 gas

**Attributes**: constant



Returns:

> the address of the owner

1. **output_0** *of type `address`*

--- 
### tokenContract()


**Execution cost**: less than 647 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

    > The address to transfer ownership to.



[Back to the top ↑](#selectablecrcmarketv0_1_0)
