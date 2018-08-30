# IContractRegistry


**Execution cost**: No bound available

**Deployment cost**: No bound available

**Combined cost**: No bound available




## Methods
### getContractInfoForVersion(string,string)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_contractName** *of type `string`*
2. **_versionName** *of type `string`*

Returns:


1. **output_0** *of type `uint256`*
2. **output_1** *of type `string`*
3. **output_2** *of type `address`*
4. **output_3** *of type `address`*

--- 
### getContractNameAndHashAtProxy(address)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_proxyAddress** *of type `address`*

Returns:


1. **output_0** *of type `string`*
2. **output_1** *of type `bytes32`*

--- 
### getLatestProxyAddr(string)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **contractName** *of type `string`*

Returns:


1. **output_0** *of type `address`*

--- 
### getVersionCountForContract(string,address)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **contractName** *of type `string`*
2. **proxyAddress** *of type `address`*

Returns:


1. **output_0** *of type `uint256`*

--- 
### getVersionForContractName(string,int256)


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **contractName** *of type `string`*
2. **index** *of type `int256`*

Returns:


1. **output_0** *of type `string`*
2. **output_1** *of type `address`*
3. **output_2** *of type `address`*

--- 
### initialized()


**Execution cost**: No bound available

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### setVersion(string,address,string,address)


**Execution cost**: No bound available


Params:

1. **contractName** *of type `string`*
2. **proxyAddress** *of type `address`*
3. **versionName** *of type `string`*
4. **newImplementation** *of type `address`*


--- 
### setVersionAsAdmin(string,address,string,address)


**Execution cost**: No bound available


Params:

1. **contractName** *of type `string`*
2. **proxyAddress** *of type `address`*
3. **versionName** *of type `string`*
4. **newImplementation** *of type `address`*


[Back to the top ↑](#icontractregistry)
