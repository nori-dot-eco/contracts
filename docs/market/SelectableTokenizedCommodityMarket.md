# SelectableTokenizedCommodityMarket


**Execution cost**: less than 83220 gas

**Deployment cost**: less than 1927400 gas

**Combined cost**: less than 2010620 gas

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


**Execution cost**: less than 779 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### initialized()
>
> returns the current initialization status


**Execution cost**: less than 408 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### getSalePrice(uint256)


**Execution cost**: less than 902 gas

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### canImplementInterfaceForAddress(address,bytes32)


**Execution cost**: less than 1025 gas

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
### initialize(address,address[],address)


**Execution cost**: No bound available


Params:

1. **_eip820RegistryAddr** *of type `address`*
2. **_marketItems** *of type `address[]`*
3. **_owner** *of type `address`*


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
### contractRegistry()


**Execution cost**: less than 878 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### enableCommodityOperator()


**Execution cost**: No bound available




--- 
### getSaleSeller(uint256)


**Execution cost**: less than 824 gas

**Attributes**: constant


Params:

1. **_tokenId** *of type `uint256`*

Returns:


1. **output_0** *of type `address`*

--- 
### madeOperatorForCommodity(address,address,address,uint256,uint256,bytes,bytes)
>
> erc820 introspection : handler invoked when this contract is made an operator for a commodity


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
### renounceOwnership()
>
>Renouncing to ownership will leave the contract without an owner. It will not be possible to call the functions with the `onlyOwner` modifier anymore.
>
> Allows the current owner to relinquish control of the contract.


**Execution cost**: less than 22292 gas




--- 
### pause()
>
> called by the owner to pause, triggers stopped state


**Execution cost**: No bound available




--- 
### owner()


**Execution cost**: less than 823 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

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


**Execution cost**: less than 947 gas

**Attributes**: constant


Params:

1. **param_0** *of type `uint256`*

Returns:


1. **tokenContract** *of type `address`*

--- 
### paused()


**Execution cost**: less than 646 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### revokedOperatorForCommodity(address,address,address,uint256,uint256,bytes,bytes)
>
>NOT IMPLEMENTED YET, BUT NEEDED FOR INTERFACE FULFILLMENT This function is called by the CRC contract when this contract has lost authorization for a particular commodity. Since authorizations are what create the sale listings, is the market later loses authorization, then it needs to remove the sale from the queue (failure to do so would result in the market not being able to distribute CRCs to the buyer). Since there is also no way to Modify the queue, it is adamant that the CRC is removed from the queue or the result will be a broken market.
>
> this function uses erc820 introspection : handler invoked when this contract is revoked an operator for a commodity


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
### setContractRegistry(address)
>
>Sets the contract registry address


**Execution cost**: less than 21295 gas


Params:

1. **_contractRegistryAddr** *of type `address`*


--- 
### tokenContract()


**Execution cost**: less than 691 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: less than 23178 gas


Params:

1. **_newOwner** *of type `address`*

    > The address to transfer ownership to.



--- 
### unpause()
>
> called by the owner to unpause, returns to normal state


**Execution cost**: No bound available




[Back to the top ↑](#selectabletokenizedcommoditymarket)
