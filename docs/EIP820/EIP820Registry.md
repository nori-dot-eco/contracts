# EIP820Registry


**Execution cost**: less than 562 gas

**Deployment cost**: less than 527200 gas

**Combined cost**: less than 527762 gas


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
### eip165InterfaceSupported(address,bytes4)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contract** *of type `address`*
2. **_interfaceId** *of type `bytes4`*

Returns:


1. **output_0** *of type `bool`*

--- 
### eip165InterfaceSupported_NoCache(address,bytes4)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contract** *of type `address`*
2. **_interfaceId** *of type `bytes4`*

Returns:


1. **output_0** *of type `bool`*

--- 
### eip165UpdateCache(address,bytes4)


**Execution cost**: No bound available


Params:

1. **_contract** *of type `address`*
2. **_interfaceId** *of type `bytes4`*


--- 
### getInterfaceImplementer(address,bytes32)
>
>Query if an address implements an interface and thru which contract


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **addr** *of type `address`*

    > Address that is being queried for the implementation of an interface

2. **iHash** *of type `bytes32`*

    > SHA3 of the name of the interface as a string  Example `web3.utils.sha3('EIP777Token`')`


Returns:

> The address of the contract that implements a specific interface  or 0x0 if `addr` does not implement this interface

1. **output_0** *of type `address`*

--- 
### getManager(address)
>
>GetManager


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **addr** *of type `address`*

Returns:


1. **output_0** *of type `address`*

--- 
### interfaceHash(string)
>
>Query the hash of an interface given a name


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **interfaceName** *of type `string`*

    > Name of the interfce


Returns:


1. **output_0** *of type `bytes32`*

--- 
### setInterfaceImplementer(address,bytes32,address)
>
>Sets the contract that will handle a specific interface; only  the address itself or a `manager` defined for that address can set it


**Execution cost**: No bound available


Params:

1. **addr** *of type `address`*

    > Address that you want to define the interface for

2. **iHash** *of type `bytes32`*

    > SHA3 of the name of the interface as a string  For example `web3.utils.sha3('Ieip777')` for the Ieip777

3. **implementer** *of type `address`*


--- 
### setManager(address,address)
>
>Sets an external `manager` that will be able to call `setInterfaceImplementer()`  on behalf of the address.


**Execution cost**: No bound available


Params:

1. **addr** *of type `address`*

    > Address that you are defining the manager for.

2. **newManager** *of type `address`*

    > The address of the manager for the `addr` that will replace  the old one.  Set to 0x0 if you want to remove the manager.



[Back to the top ↑](#eip820registry)
