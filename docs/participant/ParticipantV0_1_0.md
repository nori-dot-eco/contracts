# ParticipantV0_1_0


**Execution cost**: No bound available

**Deployment cost**: less than 259400 gas

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
### getParticipantRegistry()


**Execution cost**: less than 625 gas



Returns:


1. **output_0** *of type `address`*

--- 
### initialize(address,address,address)


**Execution cost**: No bound available


Params:

1. **_eip820RegistryAddr** *of type `address`*
2. **_participantRegistry** *of type `address`*
3. **_owner** *of type `address`*


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
### participantRegistry()


**Execution cost**: less than 581 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### setParticipantRegistry(address)


**Execution cost**: less than 20525 gas


Params:

1. **_participantRegistry** *of type `address`*


--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

    > The address to transfer ownership to.



[Back to the top ↑](#participantv0_1_0)
