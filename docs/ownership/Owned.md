# Owned
> Owned
>
> Author: Adrià Massanet <adria@codecontext.io>


**Execution cost**: less than 20518 gas

**Deployment cost**: less than 184600 gas

**Combined cost**: less than 205118 gas

## Constructor




## Events
### OwnershipRemoved()


**Execution cost**: No bound available



--- 
### OwnershipRequested(address,address)


**Execution cost**: No bound available


Params:

1. **by** *of type `address`*
2. **to** *of type `address`*

--- 
### OwnershipTransferred(address,address)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **to** *of type `address`*


## Methods
### acceptOwnership()
>
>Can only be called by the `newOwnerCandidate`, accepts the  transfer of ownership


**Execution cost**: less than 42580 gas




--- 
### changeOwnership(address)
>
>`owner` can step down and assign some other address to this role
>
> In this 2nd option for ownership transfer `changeOwnership()` can  be called and it will immediately assign ownership to the `newOwner`


**Execution cost**: less than 42695 gas


Params:

1. **_newOwner** *of type `address`*

    > The address of the new owner



--- 
### newOwnerCandidate()


**Execution cost**: less than 647 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### owner()


**Execution cost**: less than 625 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### proposeOwnership(address)
>
>`onlyOwner` Proposes to transfer control of the contract to a  new owner
>
> In this 1st option for ownership transfer `proposeOwnership()` must  be called first by the current `owner` then `acceptOwnership()` must be  called by the `newOwnerCandidate`


**Execution cost**: less than 22403 gas


Params:

1. **_newOwnerCandidate** *of type `address`*

    > The address being proposed as the new owner



--- 
### removeOwnership(address)
>
>Decentralizes the contract, this operation cannot be undone
>
> In this 3rd option for ownership transfer `removeOwnership()` can  be called and it will immediately assign ownership to the 0x0 address;  it requires a 0xdece be input as a parameter to prevent accidental use


**Execution cost**: less than 41837 gas


Params:

1. **_dac** *of type `address`*

    > `0xdac` has to be entered for this function to work



[Back to the top ↑](#owned)
