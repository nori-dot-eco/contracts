# Pausable
> Pausable


**Execution cost**: less than 20555 gas

**Deployment cost**: less than 247200 gas

**Combined cost**: less than 267755 gas


## Events
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




## Methods
### owner()


**Execution cost**: less than 625 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### pause()
>
> called by the owner to pause, triggers stopped state


**Execution cost**: less than 21719 gas




--- 
### paused()


**Execution cost**: less than 429 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### renounceOwnership()
>
>Renouncing to ownership will leave the contract without an owner. It will not be possible to call the functions with the `onlyOwner` modifier anymore.
>
> Allows the current owner to relinquish control of the contract.


**Execution cost**: less than 22116 gas




--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: less than 22870 gas


Params:

1. **_newOwner** *of type `address`*

    > The address to transfer ownership to.



--- 
### unpause()
>
> called by the owner to unpause, returns to normal state


**Execution cost**: less than 21650 gas




[Back to the top ↑](#pausable)
