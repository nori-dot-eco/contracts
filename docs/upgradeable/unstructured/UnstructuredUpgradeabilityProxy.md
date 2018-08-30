# UnstructuredUpgradeabilityProxy
> UnstructuredUpgradeabilityProxy: This contract represents a proxy where       the implementation address to which it will delegate can be upgraded


**Execution cost**: less than 135 gas

**Deployment cost**: less than 88600 gas

**Combined cost**: less than 88735 gas

## Constructor




## Events
### ImplementationPositionSet(address)


**Execution cost**: No bound available


Params:

1. **impPosition** *of type `address`*

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
>Tells the address of the current implementation


**Execution cost**: less than 471 gas

**Attributes**: constant



Returns:

> address of the current implementation

1. **_impl** *of type `address`*

[Back to the top ↑](#unstructuredupgradeabilityproxy)
