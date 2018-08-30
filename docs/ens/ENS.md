# ENS


**Execution cost**: No bound available

**Deployment cost**: No bound available

**Combined cost**: No bound available


## Events
### NewOwner(bytes32,bytes32,address)


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*
2. **label** *of type `bytes32`*
3. **owner** *of type `address`*

--- 
### NewResolver(bytes32,address)


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*
2. **resolver** *of type `address`*

--- 
### NewTTL(bytes32,uint64)


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*
2. **ttl** *of type `uint64`*

--- 
### Transfer(bytes32,address)


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*
2. **owner** *of type `address`*


## Methods
### owner(bytes32)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **node** *of type `bytes32`*

Returns:


1. **output_0** *of type `address`*

--- 
### resolver(bytes32)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **node** *of type `bytes32`*

Returns:


1. **output_0** *of type `address`*

--- 
### setOwner(bytes32,address)


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*
2. **owner** *of type `address`*


--- 
### setResolver(bytes32,address)


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*
2. **resolver** *of type `address`*


--- 
### setSubnodeOwner(bytes32,bytes32,address)


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*
2. **label** *of type `bytes32`*
3. **owner** *of type `address`*


--- 
### setTTL(bytes32,uint64)


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*
2. **ttl** *of type `uint64`*


--- 
### ttl(bytes32)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **node** *of type `bytes32`*

Returns:


1. **output_0** *of type `uint64`*

[Back to the top ↑](#ens)
