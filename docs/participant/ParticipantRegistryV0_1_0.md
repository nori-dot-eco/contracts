# ParticipantRegistryV0_1_0


**Execution cost**: No bound available

**Deployment cost**: less than 373400 gas

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

1. **param_0** *of type `address`*
2. **param_1** *of type `bytes32`*

Returns:


1. **output_0** *of type `bytes32`*

--- 
### initialize(address,address)


**Execution cost**: No bound available


Params:

1. **_eip820RegistryAddr** *of type `address`*
2. **owner** *of type `address`*


--- 
### isAllowed(address,string)


**Execution cost**: No bound available


Params:

1. **_ifaceImpAddr** *of type `address`*
2. **ifaceLabel** *of type `string`*

Returns:


1. **output_0** *of type `bool`*

--- 
### owner()
>
> Tells the address of the owner


**Execution cost**: less than 559 gas

**Attributes**: constant



Returns:

> the address of the owner

1. **output_0** *of type `address`*

--- 
### participantTypes(bytes32,address)


**Execution cost**: less than 665 gas

**Attributes**: constant


Params:

1. **param_0** *of type `bytes32`*
2. **param_1** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

--- 
### toggleParticipantType(string,address,bool)


**Execution cost**: No bound available


Params:

1. **_participantType** *of type `string`*
2. **_impAddress** *of type `address`*
3. **_toggle** *of type `bool`*


--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

    > The address to transfer ownership to.



[Back to the top ↑](#participantregistryv0_1_0)
