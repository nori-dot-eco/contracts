# ParticipantRegistryV0_2_0


**Execution cost**: less than 61557 gas

**Deployment cost**: less than 647800 gas

**Combined cost**: less than 709357 gas

## Constructor




## Events
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
### Unpause()


**Execution cost**: No bound available




## Methods
### participantTypes(bytes32,address)


**Execution cost**: less than 775 gas

**Attributes**: constant


Params:

1. **param_0** *of type `bytes32`*
2. **param_1** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

--- 
### initialized()
>
> returns the current initialization status


**Execution cost**: less than 396 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### initialize(address,address)


**Execution cost**: No bound available


Params:

1. **_contractRegistryAddr** *of type `address`*
2. **_owner** *of type `address`*


--- 
### canImplementInterfaceForAddress(address,bytes32)


**Execution cost**: less than 871 gas

**Attributes**: constant


Params:

1. **param_0** *of type `address`*
2. **param_1** *of type `bytes32`*

Returns:


1. **output_0** *of type `bytes32`*

--- 
### contractRegistry()


**Execution cost**: less than 724 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### isAllowed(address,string)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_ifaceImpAddr** *of type `address`*
2. **ifaceLabel** *of type `string`*

Returns:


1. **output_0** *of type `bool`*

--- 
### owner()


**Execution cost**: less than 669 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### pause()
>
> called by the owner to pause, triggers stopped state


**Execution cost**: less than 21763 gas




--- 
### paused()


**Execution cost**: less than 473 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### renounceOwnership()
>
>Renouncing to ownership will leave the contract without an owner. It will not be possible to call the functions with the `onlyOwner` modifier anymore.
>
> Allows the current owner to relinquish control of the contract.


**Execution cost**: less than 22160 gas




--- 
### setContractRegistry(address)
>
>Sets the contract registry address


**Execution cost**: less than 21119 gas


Params:

1. **_contractRegistryAddr** *of type `address`*


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


**Execution cost**: less than 23024 gas


Params:

1. **_newOwner** *of type `address`*

    > The address to transfer ownership to.



--- 
### unpause()
>
> called by the owner to unpause, returns to normal state


**Execution cost**: less than 21672 gas




[Back to the top ↑](#participantregistryv0_2_0)
