# VersionRegistry
> VersionRegistry


**Execution cost**: less than 362 gas

**Deployment cost**: less than 326000 gas

**Combined cost**: less than 326362 gas


## Events
### VersionSet(string,address,string,address)


**Execution cost**: No bound available


Params:

1. **contractName** *of type `string`*
2. **proxyAddress** *of type `address`*
3. **versionName** *of type `string`*
4. **newImplementation** *of type `address`*


## Methods
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

[Back to the top ↑](#versionregistry)
