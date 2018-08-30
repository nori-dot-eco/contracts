# ENSRegistry
> The ENS registry contract


**Execution cost**: less than 20696 gas

**Deployment cost**: less than 350000 gas

**Combined cost**: less than 370696 gas

## Constructor




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
>
> Returns the address that owns the specified node.


**Execution cost**: less than 634 gas

**Attributes**: constant


Params:

1. **node** *of type `bytes32`*

    > The specified node.


Returns:

> address of the owner.

1. **output_0** *of type `address`*

--- 
### resolver(bytes32)
>
> Returns the address of the resolver for the specified node.


**Execution cost**: less than 618 gas

**Attributes**: constant


Params:

1. **node** *of type `bytes32`*

    > The specified node.


Returns:

> address of the resolver.

1. **output_0** *of type `address`*

--- 
### setOwner(bytes32,address)
>
> Transfers ownership of a node to a new address. May only be called by the current owner of the node.


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*

    > The node to transfer ownership of.

2. **owner** *of type `address`*

    > The address of the new owner.



--- 
### setResolver(bytes32,address)
>
> Sets the resolver address for the specified node.


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*

    > The node to update.

2. **resolver** *of type `address`*

    > The address of the resolver.



--- 
### setSubnodeOwner(bytes32,bytes32,address)
>
> Transfers ownership of a subnode keccak256(node, label) to a new address. May only be called by the owner of the parent node.


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*

    > The parent node.

2. **label** *of type `bytes32`*

    > The hash of the label specifying the subnode.

3. **owner** *of type `address`*

    > The address of the new owner.



--- 
### setTTL(bytes32,uint64)
>
> Sets the TTL for the specified node.


**Execution cost**: No bound available


Params:

1. **node** *of type `bytes32`*

    > The node to update.

2. **ttl** *of type `uint64`*

    > The TTL in seconds.



--- 
### ttl(bytes32)
>
> Returns the TTL of a node, and any records associated with it.


**Execution cost**: less than 579 gas

**Attributes**: constant


Params:

1. **node** *of type `bytes32`*

    > The specified node.


Returns:

> ttl of the node.

1. **output_0** *of type `uint64`*

[Back to the top ↑](#ensregistry)
