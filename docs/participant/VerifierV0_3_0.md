# VerifierV0_3_0


**Execution cost**: less than 62169 gas

**Deployment cost**: less than 1246400 gas

**Combined cost**: less than 1308569 gas

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


**Execution cost**: less than 757 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### setContractRegistry(address)
>
>Sets the contract registry address


**Execution cost**: less than 21262 gas


Params:

1. **_contractRegistryAddr** *of type `address`*


--- 
### canImplementInterfaceForAddress(address,bytes32)


**Execution cost**: less than 1003 gas

**Attributes**: constant


Params:

1. **param_0** *of type `address`*
2. **param_1** *of type `bytes32`*

Returns:


1. **output_0** *of type `bytes32`*

--- 
### getParticipantRegistry()


**Execution cost**: less than 889 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### paused()


**Execution cost**: less than 558 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### forward(address,uint256,bytes,string)
>
> dynamic function (name + params) forwarderexample: forward(CRC, 0, 'Minting Data Here', ISomeInterface)


**Execution cost**: No bound available


Params:

1. **destination** *of type `address`*
2. **value** *of type `uint256`*
3. **data** *of type `bytes`*
4. **ifaceLabel** *of type `string`*


--- 
### allowedInterfaces(bytes32,address)


**Execution cost**: less than 951 gas

**Attributes**: constant


Params:

1. **param_0** *of type `bytes32`*
2. **param_1** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

--- 
### renounceOwnership()
>
>Renouncing to ownership will leave the contract without an owner. It will not be possible to call the functions with the `onlyOwner` modifier anymore.
>
> Allows the current owner to relinquish control of the contract.


**Execution cost**: less than 22226 gas




--- 
### pause()
>
> called by the owner to pause, triggers stopped state


**Execution cost**: No bound available




--- 
### owner()


**Execution cost**: less than 735 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### initialized()
>
> returns the current initialization status


**Execution cost**: less than 492 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### contractRegistry()


**Execution cost**: less than 779 gas

**Attributes**: constant



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
### isAllowed(address,string)


**Execution cost**: No bound available


Params:

1. **_ifaceImpAddr** *of type `address`*
2. **ifaceLabel** *of type `string`*

Returns:


1. **output_0** *of type `bool`*

--- 
### setParticipantRegistry(address)


**Execution cost**: less than 20866 gas


Params:

1. **_participantRegistry** *of type `address`*


--- 
### toggleInterface(string,address,bool)


**Execution cost**: No bound available


Params:

1. **_ifaceLabel** *of type `string`*
2. **_ifaceImpAddr** *of type `address`*
3. **_toggle** *of type `bool`*


--- 
### toggleParticipantType(bool)


**Execution cost**: No bound available


Params:

1. **_toggle** *of type `bool`*


--- 
### toggleVerifier(address,bool)


**Execution cost**: less than 21173 gas


Params:

1. **_verifier** *of type `address`*
2. **_toggle** *of type `bool`*


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




--- 
### verifiers(address)


**Execution cost**: less than 675 gas

**Attributes**: constant


Params:

1. **param_0** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

[Back to the top ↑](#verifierv0_3_0)
