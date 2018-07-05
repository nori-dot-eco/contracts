# Market


**Execution cost**: No bound available

**Deployment cost**: less than 311600 gas

**Combined cost**: No bound available

## Constructor




## Events
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


## Methods
### canImplementInterfaceForAddress(address,bytes32)


**Execution cost**: less than 466 gas

**Attributes**: constant


Params:

1. **addr** *of type `address`*
2. **interfaceHash** *of type `bytes32`*

Returns:


1. **output_0** *of type `bytes32`*

--- 
### enableCommodityOperator()


**Execution cost**: No bound available




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


**Execution cost**: less than 603 gas

**Attributes**: constant



Returns:

> the address of the owner

1. **output_0** *of type `address`*

--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

    > The address to transfer ownership to.



[Back to the top ↑](#market)
