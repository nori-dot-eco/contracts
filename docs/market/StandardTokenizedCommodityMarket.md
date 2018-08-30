# StandardTokenizedCommodityMarket


**Execution cost**: less than 81926 gas

**Deployment cost**: less than 715000 gas

**Combined cost**: less than 796926 gas

## Constructor




## Events
### CommodityReceived(address)


**Execution cost**: No bound available


Params:

1. **sender** *of type `address`*

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

--- 
### Unpause()


**Execution cost**: No bound available




## Methods
### commodityContract()


**Execution cost**: less than 735 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### initialized()
>
> returns the current initialization status


**Execution cost**: less than 407 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### getSalePrice(uint256)


**Execution cost**: less than 814 gas

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### enableEIP777TokensOperator()


**Execution cost**: No bound available




--- 
### canImplementInterfaceForAddress(address,bytes32)


**Execution cost**: less than 937 gas

**Attributes**: constant


Params:

1. **param_0** *of type `address`*
2. **param_1** *of type `bytes32`*

Returns:


1. **output_0** *of type `bytes32`*

--- 
### initialize(address,address[],address)


**Execution cost**: No bound available


Params:

1. **_eip820RegistryAddr** *of type `address`*
2. **_marketItems** *of type `address[]`*
3. **_owner** *of type `address`*


--- 
### contractRegistry()


**Execution cost**: less than 812 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### getSaleSeller(uint256)


**Execution cost**: less than 780 gas

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### enableCommodityOperator()


**Execution cost**: No bound available




--- 
### marketItems(uint256)


**Execution cost**: less than 925 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **tokenContract** *of type `address`*

--- 
### owner()


**Execution cost**: less than 779 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### pause()
>
> called by the owner to pause, triggers stopped state


**Execution cost**: less than 21999 gas




--- 
### paused()


**Execution cost**: less than 602 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### renounceOwnership()
>
>Renouncing to ownership will leave the contract without an owner. It will not be possible to call the functions with the `onlyOwner` modifier anymore.
>
> Allows the current owner to relinquish control of the contract.


**Execution cost**: less than 22248 gas




--- 
### setContractRegistry(address)
>
>Sets the contract registry address


**Execution cost**: less than 21207 gas


Params:

1. **_contractRegistryAddr** *of type `address`*


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


**Execution cost**: less than 23090 gas


Params:

1. **_newOwner** *of type `address`*

    > The address to transfer ownership to.



--- 
### unpause()
>
> called by the owner to unpause, returns to normal state


**Execution cost**: less than 21757 gas




[Back to the top ↑](#standardtokenizedcommoditymarket)
