# RootRegistryV0_2_0
> RootRegistryV0_2_0: Keeps track of the latest version of the contract registry


**Execution cost**: less than 62477 gas

**Deployment cost**: less than 1536000 gas

**Combined cost**: less than 1598477 gas

## Constructor




## Events
### Initialized(address)


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*

--- 
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



--- 
### VersionSet(string,address,string,address)


**Execution cost**: No bound available


Params:

1. **contractName** *of type `string`*
2. **proxyAddress** *of type `address`*
3. **versionName** *of type `string`*
4. **newImplementation** *of type `address`*


## Methods
### renounceOwnership()
>
>Renouncing to ownership will leave the contract without an owner. It will not be possible to call the functions with the `onlyOwner` modifier anymore.
>
> Allows the current owner to relinquish control of the contract.


**Execution cost**: less than 22270 gas




--- 
### getContractNameAndHashAtProxy(address)
>
>Gets a contract name and contract name's hash at a given proxy address


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_proxyAddress** *of type `address`*

    > The address of a particular proxy


Returns:

> the contract name and name hash in use at the given proxy address

1. **output_0** *of type `string`*
2. **output_1** *of type `bytes32`*

--- 
### getContractInfoForVersion(string,string)
>
>Gets a contract version info for a particular contract name and proxy using the version name
>
> This function will loop through the entire history of a particular contract starting with the earliest proxy history.


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contractName** *of type `string`*

    > String name of a contract (i.e. CRC)

2. **_versionName** *of type `string`*

    > The name of a particular version you are looking for (using SemVer 2.0, i.e. '0.2.0')


Returns:

> The index at which the given contract exists, the name of the version, the logic implementation, and the address of the proxy used by this versions parent

1. **output_0** *of type `uint256`*
2. **output_1** *of type `string`*
3. **output_2** *of type `address`*
4. **output_3** *of type `address`*

--- 
### pause()
>
> called by the owner to pause, triggers stopped state


**Execution cost**: less than 21999 gas




--- 
### registeredContractCount()


**Execution cost**: less than 758 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `uint256`*

--- 
### paused()


**Execution cost**: less than 580 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### getLatestProxyAddr(string)
>
>Gets the address of the latest proxy contract of a particular name.
>
> Internally invokes _getLatestProxyAddr


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contractName** *of type `string`*

    > String name of a contract (ie Registry)


Returns:

> the address of the latest proxy for the provided contract name

1. **output_0** *of type `address`*

--- 
### initialize(address)
>
>The contract initializer
>
> Always use this function to set the contract state after constructing since when using an upgradeable proxy mechanism, state set inside the constructor will not persist to the proxy.


**Execution cost**: less than 47519 gas


Params:

1. **_owner** *of type `address`*

    > The owner of the contract



--- 
### getVersionForContractName(string,int256)
>
>Sets a version for a particular contract by assigning a contract name an associated proxy, version name (using SemVer 2.0) and its logic implementation


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contractName** *of type `string`*

    > String name of a contract (ie Registry)

2. **_index** *of type `int256`*

    > the proxy contract's positional index inside of 'versions'. Pass -1 to get the latest proxy's history (in most cases, you should default to this), or a particular index to get the particular history for a given index. Note: The first index (0) is only used pre-initialization and is not a valid version (0_0_0) nor implementation address (0x0). If you want the earliest index, pass: _index = 1


Returns:

> The version name, the logic implementation, and the latest proxy address

1. **output_0** *of type `string`*
2. **output_1** *of type `address`*
3. **output_2** *of type `address`*

--- 
### initialized()
>
>returns the current initialization status


**Execution cost**: less than 515 gas

**Attributes**: constant



Returns:

> a boolean state representing wether or not the contract has been initialized yet

1. **output_0** *of type `bool`*

--- 
### getVersionHistoryForContractName(string)
>
>Returns the entire history for a given contract name


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contractName** *of type `string`*

    > String name of a contract (i.e. CRC)


Returns:

> Will return the history as the Version struct within an array

1. **output_0** *of type `tuple[]`*

--- 
### owner()


**Execution cost**: less than 779 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### getVersionCountForContract(string,address)
>
>Gets the number of Versions for a particular ContractName at a particular proxy address


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contractName** *of type `string`*

    > String name of a contract (i.e. CRC)

2. **_proxyAddress** *of type `address`*

    > The address os a particular Proxy used by the given contract name


Returns:

> the count of version existing for the provided contract name and proxy

1. **output_0** *of type `uint256`*

--- 
### setVersion(string,address,string,address)
>
>Sets a version for a particular contract by assigning a contract name an associated proxy, version name (using SemVer 2.0) and its logic implementation
>
> This function can only be used by a particular contract's proxy.


**Execution cost**: No bound available


Params:

1. **_contractName** *of type `string`*

    > String name of a contract (ie Registry)

2. **_proxyAddress** *of type `address`*

    > the Proxy contract's address

3. **_versionName** *of type `string`*

    > the version name (which MUST be incremented each time new logic is set) using SemVer 2.0

4. **_newImplementation** *of type `address`*

    > the contract containing the logic of the proposed contract name



--- 
### setVersionAsAdmin(string,address,string,address)
>
>Sets a version for a particular contract by assigning a contract name an associated proxy, version name (using SemVer 2.0) and its logic implementation
>
> This function can only be used by the admin. Additionally, it is not recomended to ever use this function unless you truly understand the implications it has inside the proxy contract and this registry alike. In most cases, the only appropriate time to use this function is during the very first registration of a contract at a proxy. In all other cases, the `setVersion` function should be called directly from the proxy's `upgradeTo` or `upgradeToAndCall` function (both of which will not work until this function was used during the FIRST deployment/registration of the proxy).


**Execution cost**: No bound available


Params:

1. **_contractName** *of type `string`*

    > String name of a contract (ie Registry)

2. **_proxyAddress** *of type `address`*

    > the Proxy contract's address

3. **_versionName** *of type `string`*

    > the version name (which MUST be incremented each time new logic is set) using SemVer 2.0

4. **_newImplementation** *of type `address`*

    > the contract containing the logic of the proposed contract name



--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: less than 23112 gas


Params:

1. **_newOwner** *of type `address`*

    > The address to transfer ownership to.



--- 
### unpause()
>
> called by the owner to unpause, returns to normal state


**Execution cost**: less than 21779 gas




--- 
### versions(bytes32,address,uint256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **param_0** *of type `bytes32`*
2. **param_1** *of type `address`*
3. **param_2** *of type `uint256`*

Returns:


1. **index** *of type `uint256`*
2. **versionName** *of type `string`*
3. **implementation** *of type `address`*

[Back to the top ↑](#rootregistryv0_2_0)
