# RootRegistryV0_1_0
> RootRegistryV0_1_0 


**Execution cost**: No bound available

**Deployment cost**: less than 1032600 gas

**Combined cost**: No bound available

## Constructor




## Events
### Initialized(address)


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*

--- 
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

--- 
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

--- 
### VersionSet(string,address,string,address)


**Execution cost**: No bound available


Params:

1. **contractName** *of type `string`*
2. **proxyAddress** *of type `address`*
3. **versionName** *of type `string`*
4. **newImplementation** *of type `address`*


## Methods
### owner()
>
> Tells the address of the owner


**Execution cost**: less than 714 gas

**Attributes**: constant



Returns:

> the address of the owner

1. **output_0** *of type `address`*

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
### eip165UpdateCache(address,bytes4)


**Execution cost**: No bound available


Params:

1. **_contract** *of type `address`*
2. **_interfaceId** *of type `bytes4`*


--- 
### getLatestProxyAddr(string)
>
>Gets the address of the latest proxt contract of a particular name


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contractName** *of type `string`*

    > String name of a contract (ie Registry)


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
### eip165InterfaceSupported_NoCache(address,bytes4)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contract** *of type `address`*
2. **_interfaceId** *of type `bytes4`*

Returns:


1. **output_0** *of type `bool`*

--- 
### eip165InterfaceSupported(address,bytes4)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contract** *of type `address`*
2. **_interfaceId** *of type `bytes4`*

Returns:


1. **output_0** *of type `bool`*

--- 
### getVersionForContractName(string,int256)
>
> pass -1 to get the latest, or a particular index to get a certain one


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contractName** *of type `string`*
2. **_index** *of type `int256`*

Returns:


1. **output_0** *of type `string`*
2. **output_1** *of type `address`*
3. **output_2** *of type `address`*

--- 
### getManager(address)
>
>GetManager


**Execution cost**: less than 1102 gas

**Attributes**: constant


Params:

1. **addr** *of type `address`*

Returns:


1. **output_0** *of type `address`*

--- 
### proxyAddr()


**Execution cost**: less than 746 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

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
### initialize(address)


**Execution cost**: less than 43465 gas


Params:

1. **owner** *of type `address`*


--- 
### setManager(address,address)
>
>Sets an external `manager` that will be able to call `setInterfaceImplementer()`  on behalf of the address.


**Execution cost**: less than 23255 gas


Params:

1. **addr** *of type `address`*

    > Address that you are defining the manager for.

2. **newManager** *of type `address`*

    > The address of the manager for the `addr` that will replace  the old one.  Set to 0x0 if you want to remove the manager.



--- 
### setVersion(string,address,string,address)


**Execution cost**: No bound available


Params:

1. **contractName** *of type `string`*
2. **proxyAddress** *of type `address`*
3. **versionName** *of type `string`*
4. **newImplementation** *of type `address`*


--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

    > The address to transfer ownership to.



--- 
### versions(bytes32,address,uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **param_0** *of type `bytes32`*
2. **param_1** *of type `address`*
3. **param_2** *of type `uint256`*

Returns:


1. **versionName** *of type `string`*
2. **implementation** *of type `address`*

[Back to the top ↑](#rootregistryv0_1_0)
