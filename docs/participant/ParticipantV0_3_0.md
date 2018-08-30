# ParticipantV0_3_0


**Execution cost**: less than 61423 gas

**Deployment cost**: less than 516400 gas

**Combined cost**: less than 577823 gas

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
### participantRegistry()


**Execution cost**: less than 691 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### initialized()
>
> returns the current initialization status


**Execution cost**: less than 470 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

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
### getParticipantRegistry()


**Execution cost**: less than 757 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### initialize(address,address,address)


**Execution cost**: No bound available


Params:

1. **_contractRegistryAddr** *of type `address`*
2. **_participantRegistry** *of type `address`*
3. **_owner** *of type `address`*


--- 
### contractRegistry()


**Execution cost**: less than 713 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

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


**Execution cost**: less than 21889 gas




--- 
### paused()


**Execution cost**: less than 536 gas

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


**Execution cost**: less than 21108 gas


Params:

1. **_contractRegistryAddr** *of type `address`*


--- 
### setParticipantRegistry(address)


**Execution cost**: less than 20844 gas


Params:

1. **_participantRegistry** *of type `address`*


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


**Execution cost**: less than 21757 gas




[Back to the top ↑](#participantv0_3_0)
