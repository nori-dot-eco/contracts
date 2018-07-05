# UnstructuredOwnedUpgradeabilityProxy
> UnstructuredOwnedUpgradeabilityProxy


**Execution cost**: No bound available

**Deployment cost**: less than 408400 gas

**Combined cost**: No bound available

## Constructor



Params:

1. **registryAddr** *of type `address`*

## Events
### ImplementationPositionSet(address)


**Execution cost**: No bound available


Params:

1. **impPosition** *of type `address`*

--- 
### ProxyOwnershipTransferred(address,address)


**Execution cost**: No bound available


Params:

1. **previousOwner** *of type `address`*
2. **newOwner** *of type `address`*

--- 
### RegistryAddrSet(address)


**Execution cost**: No bound available


Params:

1. **registryAddress** *of type `address`*

--- 
### UpgradeabilityOwnerSet(address)


**Execution cost**: No bound available


Params:

1. **upgradeabilityOwner** *of type `address`*

--- 
### Upgraded(string,address)


**Execution cost**: No bound available


Params:

1. **version** *of type `string`*
2. **implementation** *of type `address`*

## Fallback


**Execution cost**: No bound available

**Attributes**: payable



## Methods
### implementation()
>
> Tells the address of the current implementation


**Execution cost**: less than 628 gas

**Attributes**: constant



Returns:

> address of the current implementation

1. **impl** *of type `address`*

--- 
### proxyOwner()
>
> Tells the address of the owner


**Execution cost**: less than 540 gas

**Attributes**: constant



Returns:

> the address of the owner

1. **owner** *of type `address`*

--- 
### registryAddr()
>
> Tells the address of the registry


**Execution cost**: less than 606 gas

**Attributes**: constant



Returns:

> the address of the registry

1. **registry** *of type `address`*

--- 
### transferProxyOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

    > The address to transfer ownership to.



--- 
### upgradeTo(string,string,address)
>
> Allows the proxy owner to upgrade the current version of the proxy.


**Execution cost**: No bound available


Params:

1. **contractName** *of type `string`*
2. **versionName** *of type `string`*
3. **implementation** *of type `address`*

    > representing the address of the new implementation to be set.



--- 
### upgradeToAndCall(string,string,address,bytes)
>
> Allows the proxy owner to upgrade the current version of the proxy and call the new implementation to initialize whatever is needed through a low level call.


**Execution cost**: No bound available

**Attributes**: payable


Params:

1. **contractName** *of type `string`*
2. **versionName** *of type `string`*
3. **implementation** *of type `address`*

    > representing the address of the new implementation to be set.

4. **data** *of type `bytes`*

    > represents the msg.data to bet sent in the low level call. This parameter may include the function signature of the implementation to be called with the needed payload



[Back to the top ↑](#unstructuredownedupgradeabilityproxy)
