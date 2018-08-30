# ERC820Registry


**Execution cost**: less than 556 gas

**Deployment cost**: less than 524400 gas

**Combined cost**: less than 524956 gas


## Events
### InterfaceImplementerSet(address,bytes32,address)


**Execution cost**: No bound available


Params:

1. **addr** *of type `address`*
2. **interfaceHash** *of type `bytes32`*
3. **implementer** *of type `address`*

--- 
### ManagerChanged(address,address)


**Execution cost**: No bound available


Params:

1. **addr** *of type `address`*
2. **newManager** *of type `address`*


## Methods
### getInterfaceImplementer(address,bytes32)
>
>Query if an address implements an interface and through which contract.


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_addr** *of type `address`*

    > Address being queried for the implementer of an interface.   (If _addr == 0 them `msg.sender` is assumed.)

2. **_interfaceHash** *of type `bytes32`*

    > keccak256 hash of the name of the interface as a string.   E.g. `web3.utils.keccak256(abi.encodePacked('ERC777Token'))`


Returns:

> The address of the contract which implements the interface `_interfaceHash` for `_addr`   or `0x0` if `_addr` did not registeran implemeter for this interface.

1. **output_0** *of type `address`*

--- 
### getManager(address)
>
>Get the manager of an address


**Execution cost**: less than 1102 gas

**Attributes**: constant


Params:

1. **_addr** *of type `address`*

Returns:

> Address of the manager for a given address.

1. **output_0** *of type `address`*

--- 
### implementsERC165Interface(address,bytes4)
>
> This function may modify the state when updating the cache. But since it can also be called from   `getInterfaceImplementer`, it must be a view function. If called directly, from within a transaction, the   ERC165 will be updated.


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contract** *of type `address`*
2. **_interfaceId** *of type `bytes4`*

Returns:


1. **output_0** *of type `bool`*

--- 
### implementsERC165InterfaceNoCache(address,bytes4)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contract** *of type `address`*
2. **_interfaceId** *of type `bytes4`*

Returns:


1. **output_0** *of type `bool`*

--- 
### interfaceHash(string)
>
>Compute the keccak256 hash of an interface given its name


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **interfaceName** *of type `string`*

    > Name of the interface


Returns:

> The keccak256 hash of an interface name

1. **output_0** *of type `bytes32`*

--- 
### setInterfaceImplementer(address,bytes32,address)
>
>Sets the contract that will handle a specific interface.   Only a `manager` defined for that address can set it.   (Each address is the manager for itself until a new manager is defined)


**Execution cost**: No bound available


Params:

1. **_addr** *of type `address`*

    > Address to define the interface for (if _addr == 0 them `msg.sender` is assumed)

2. **_interfaceHash** *of type `bytes32`*

    > keccak256 hash of the name of the interface as a string For example,   `web3.utils.keccak256(abi.encodePacked('ERC777TokensRecipient'))` for the ERC777TokensRecipient interface.

3. **_implementer** *of type `address`*


--- 
### setManager(address,address)
>
>Sets the `_newManager` as manager for the `_addr` address.   The new manager will be able to call `setInterfaceImplementer` for `_addr`.


**Execution cost**: less than 23369 gas


Params:

1. **_addr** *of type `address`*

    > Address for which to set the new manager. (Pass 0x0 to use msg.sender as the address.)

2. **_newManager** *of type `address`*

    > The address of the new manager for `addr`. (Pass `0x0` to reset the manager to `_addr`.)



--- 
### updateERC165Cache(address,bytes4)


**Execution cost**: No bound available


Params:

1. **_contract** *of type `address`*
2. **_interfaceId** *of type `bytes4`*


[Back to the top ↑](#erc820registry)
