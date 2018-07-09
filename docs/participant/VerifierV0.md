# VerifierV0


**Execution cost**: No bound available

**Deployment cost**: less than 730000 gas

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
### isAllowed(address,string)


**Execution cost**: No bound available


Params:

1. **_ifaceImpAddr** *of type `address`*
2. **ifaceLabel** *of type `string`*

Returns:


1. **output_0** *of type `bool`*

--- 
### toggleParticipantType(bool)


**Execution cost**: No bound available


Params:

1. **_toggle** *of type `bool`*


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
### toggleInterface(string,address,bool)


**Execution cost**: No bound available


Params:

1. **_ifaceLabel** *of type `string`*
2. **_ifaceImpAddr** *of type `address`*
3. **_toggle** *of type `bool`*


--- 
### owner()
>
> Tells the address of the owner


**Execution cost**: less than 625 gas

**Attributes**: constant



Returns:

> the address of the owner

1. **output_0** *of type `address`*

--- 
### participantRegistry()


**Execution cost**: less than 647 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

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
### setParticipantRegistry(address)


**Execution cost**: less than 20547 gas


Params:

1. **_participantRegistry** *of type `address`*


--- 
### initialize(address,address,address)


**Execution cost**: No bound available


Params:

1. **_eip820RegistryAddr** *of type `address`*
2. **_participantRegistry** *of type `address`*
3. **_owner** *of type `address`*


--- 
### allowedInterfaces(bytes32,address)


**Execution cost**: less than 819 gas

**Attributes**: constant


Params:

1. **param_0** *of type `bytes32`*
2. **param_1** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

--- 
### getParticipantRegistry()


**Execution cost**: less than 757 gas



Returns:


1. **output_0** *of type `address`*

--- 
### toggleVerifier(address,bool)


**Execution cost**: less than 20744 gas


Params:

1. **_verifier** *of type `address`*
2. **_toggle** *of type `bool`*


--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

    > The address to transfer ownership to.



--- 
### verifiers(address)


**Execution cost**: less than 609 gas

**Attributes**: constant


Params:

1. **param_0** *of type `address`*

Returns:


1. **output_0** *of type `bool`*

[Back to the top ↑](#verifierv0)
