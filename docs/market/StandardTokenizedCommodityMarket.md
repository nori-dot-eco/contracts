# StandardTokenizedCommodityMarket


**Execution cost**: No bound available

**Deployment cost**: less than 400800 gas

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


**Execution cost**: less than 658 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### enableCommodityOperator()


**Execution cost**: No bound available




--- 
### canImplementInterfaceForAddress(address,bytes32)


**Execution cost**: less than 532 gas

**Attributes**: constant


Params:

1. **addr** *of type `address`*
2. **interfaceHash** *of type `bytes32`*

Returns:


1. **output_0** *of type `bytes32`*

--- 
### enableEIP777TokensOperator()


**Execution cost**: No bound available




--- 
### getSalePrice(uint256)


**Execution cost**: less than 682 gas

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### getSaleSeller(uint256)


**Execution cost**: less than 714 gas

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
### marketItems(uint256)


**Execution cost**: less than 881 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **tokenContract** *of type `address`*

--- 
### owner()
>
> Tells the address of the owner


**Execution cost**: less than 669 gas

**Attributes**: constant



Returns:

> the address of the owner

1. **output_0** *of type `address`*

--- 
### tokenContract()


**Execution cost**: less than 603 gas

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



[Back to the top ↑](#standardtokenizedcommoditymarket)
