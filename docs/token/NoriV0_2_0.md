# NoriV0_2_0
> NoriV0_2_0 is a EIP777 token that uses unstructured storage for upgradeability


**Execution cost**: less than 63487 gas

**Deployment cost**: less than 2428200 gas

**Combined cost**: less than 2491687 gas

## Constructor




## Events
### AuthorizedOperator(address,address)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*
2. **tokenHolder** *of type `address`*

--- 
### OwnershipTransferred(address,address)


**Execution cost**: No bound available


Params:

1. **previousOwner** *of type `address`*
2. **newOwner** *of type `address`*

--- 
### Initialized(string,string,uint256,uint256,address,address)


**Execution cost**: No bound available


Params:

1. **name** *of type `string`*
2. **symbol** *of type `string`*
3. **granularity** *of type `uint256`*
4. **totalSupply** *of type `uint256`*
5. **contractRegistryAddr** *of type `address`*
6. **owner** *of type `address`*

--- 
### OwnershipRenounced(address)


**Execution cost**: No bound available


Params:

1. **previousOwner** *of type `address`*

--- 
### Minted(address,uint256,address,bytes)


**Execution cost**: No bound available


Params:

1. **to** *of type `address`*
2. **amount** *of type `uint256`*
3. **operator** *of type `address`*
4. **operatorData** *of type `bytes`*

--- 
### Burnt(address,uint256)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **amount** *of type `uint256`*

--- 
### Approval(address,address,uint256)


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*
2. **spender** *of type `address`*
3. **value** *of type `uint256`*

--- 
### Pause()


**Execution cost**: No bound available



--- 
### RevokedOperator(address,address)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*
2. **tokenHolder** *of type `address`*

--- 
### Sent(address,address,uint256,bytes,address,bytes)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **to** *of type `address`*
3. **amount** *of type `uint256`*
4. **userData** *of type `bytes`*
5. **operator** *of type `address`*
6. **operatorData** *of type `bytes`*

--- 
### Transfer(address,address,uint256)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **to** *of type `address`*
3. **value** *of type `uint256`*

--- 
### Unpause()


**Execution cost**: No bound available




## Methods
### owner()


**Execution cost**: less than 952 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### name()


**Execution cost**: No bound available

**Attributes**: constant



Returns:

> the name of the token

1. **output_0** *of type `string`*

--- 
### approve(address,uint256)
>
>ERC20 backwards compatible approve.  `msg.sender` approves `_spender` to spend `_value` tokens on its behalf.


**Execution cost**: No bound available


Params:

1. **_spender** *of type `address`*

    > The address of the account able to transfer the tokens

2. **_value** *of type `uint256`*

    > The amount of tokens to be approved for transfer


Returns:

> `true`, if the approve can't be done, it should fail.

1. **success** *of type `bool`*

--- 
### initialized()
>
> returns the current initialization status


**Execution cost**: less than 525 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### disableERC20()
>
>Disables the ERC-20 interface. This function can only be called  by the owner.


**Execution cost**: No bound available




--- 
### allowance(address,address)
>
>ERC20 backwards compatible allowance.  This function makes it easy to read the `allowed[]` map


**Execution cost**: No bound available

**Attributes**: constant


Params:

1. **_owner** *of type `address`*

    > The address of the account that owns the token

2. **_spender** *of type `address`*

    > The address of the account able to transfer the tokens


Returns:

> Amount of remaining tokens of _owner that _spender is allowed  to spend

1. **remaining** *of type `uint256`*

--- 
### decimals()
>
>For Backwards compatibility


**Execution cost**: No bound available

**Attributes**: constant



Returns:

> The decimls of the token. Forced to 18 in ERC777.

1. **output_0** *of type `uint8`*

--- 
### isOperatorFor(address,address)
>
>Check whether the `_operator` address is allowed to manage the tokens held by `_tokenHolder` address.


**Execution cost**: less than 1515 gas

**Attributes**: constant


Params:

1. **_operator** *of type `address`*

    > address to check if it has the right to manage the tokens

2. **_tokenHolder** *of type `address`*

    > address which holds the tokens to be managed


Returns:

> `true` if `_operator` is authorized for `_tokenHolder`

1. **output_0** *of type `bool`*

--- 
### authorizeOperator(address,uint256)
>
>Authorize a third party `_operator` to manage [only some] (send) `msg.sender`'s tokens.


**Execution cost**: No bound available


Params:

1. **_operator** *of type `address`*

    > The operator that wants to be Authorized

2. **_value** *of type `uint256`*


--- 
### granularity()


**Execution cost**: less than 645 gas

**Attributes**: constant



Returns:

> the granularity of the token

1. **output_0** *of type `uint256`*

--- 
### contractRegistry()


**Execution cost**: less than 1106 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `address`*

--- 
### burn(address,uint256)
>
>Burns `_value` tokens from `_tokenHolder`  Sample burn function to showcase the use of the `Burnt` event.


**Execution cost**: No bound available


Params:

1. **_tokenHolder** *of type `address`*

    > The address that will lose the tokens

2. **_value** *of type `uint256`*

    > The quantity of tokens to burn



--- 
### balanceOf(address)
>
>Return the account balance of some account


**Execution cost**: less than 933 gas

**Attributes**: constant


Params:

1. **_tokenHolder** *of type `address`*

    > Address for which the balance is returned


Returns:

> the balance of `_tokenAddress`.

1. **output_0** *of type `uint256`*

--- 
### authorizeOperator(address)
>
>Authorize a third party `_operator` to manage (send) `msg.sender`'s tokens.


**Execution cost**: No bound available


Params:

1. **_operator** *of type `address`*

    > The operator that wants to be Authorized



--- 
### initialize(string,string,uint256,uint256,address,address)


**Execution cost**: No bound available


Params:

1. **_name** *of type `string`*
2. **_symbol** *of type `string`*
3. **_granularity** *of type `uint256`*
4. **_totalSupply** *of type `uint256`*
5. **_contractRegistryAddr** *of type `address`*
6. **_owner** *of type `address`*


--- 
### mint(address,uint256,bytes)
>
>Generates `_value` tokens to be assigned to `_tokenHolder`


**Execution cost**: No bound available


Params:

1. **_tokenHolder** *of type `address`*

    > The address that will be assigned the new tokens

2. **_value** *of type `uint256`*

    > The quantity of tokens generated

3. **_operatorData** *of type `bytes`*

    > Data that will be passed to the recipient as a first transfer XXX: DO NOT SHIP TO PRODUCTION (use following instead :  function ownerMint(address _tokenHolder, uint256 _value, bytes _operatorData) public onlyOwner



--- 
### enableERC20()
>
>Re enables the ERC-20 interface. This function can only be called  by the owner.


**Execution cost**: No bound available




--- 
### send(address,uint256)
>
>Send `_value` amount of tokens to address `_to`


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*

    > The address of the recipient

2. **_value** *of type `uint256`*

    > The amount of tokens to be sent



--- 
### pause()
>
> called by the owner to pause, triggers stopped state


**Execution cost**: less than 21875 gas




--- 
### operatorSend(address,address,address,uint256,bytes,bytes)
>
>Send `_value` amount of tokens on behalf of the address `from` to the address `to`.


**Execution cost**: No bound available


Params:

1. **_operator** *of type `address`*
2. **_from** *of type `address`*

    > The address holding the tokens being sent

3. **_to** *of type `address`*

    > The address of the recipient

4. **_value** *of type `uint256`*

    > The amount of tokens to be sent

5. **_userData** *of type `bytes`*

    > Data generated by the user to be sent to the recipient

6. **_operatorData** *of type `bytes`*

    > Data generated by the operator to be sent to the recipient



--- 
### operatorSend(address,address,uint256,bytes,bytes)
>
>Send `_value` amount of tokens on behalf of the address `from` to the address `to`.


**Execution cost**: No bound available


Params:

1. **_from** *of type `address`*

    > The address holding the tokens being sent

2. **_to** *of type `address`*

    > The address of the recipient

3. **_value** *of type `uint256`*

    > The amount of tokens to be sent

4. **_userData** *of type `bytes`*

    > Data generated by the user to be sent to the recipient

5. **_operatorData** *of type `bytes`*

    > Data generated by the operator to be sent to the recipient



--- 
### transferFrom(address,address,uint256)
>
>ERC20 backwards compatible transferFrom.


**Execution cost**: No bound available


Params:

1. **_from** *of type `address`*

    > The address holding the tokens being transferred

2. **_to** *of type `address`*

    > The address of the recipient

3. **_value** *of type `uint256`*

    > The amount of tokens to be transferred


Returns:

> `true`, if the transfer can't be done, it should fail.

1. **success** *of type `bool`*

--- 
### send(address,uint256,bytes)
>
>Send `_value` amount of tokens to address `_to` passing `_userData` to the recipient


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*

    > The address of the recipient

2. **_value** *of type `uint256`*

    > The amount of tokens to be sent

3. **_userData** *of type `bytes`*


--- 
### paused()


**Execution cost**: less than 753 gas

**Attributes**: constant



Returns:


1. **output_0** *of type `bool`*

--- 
### renounceOwnership()
>
>Renouncing to ownership will leave the contract without an owner. It will not be possible to call the functions with the `onlyOwner` modifier anymore.
>
> Allows the current owner to relinquish control of the contract.


**Execution cost**: less than 22421 gas




--- 
### revokeOperator(address)
>
>Revoke a third party `_operator`'s rights to manage (send) `msg.sender`'s tokens.


**Execution cost**: No bound available


Params:

1. **_operator** *of type `address`*

    > The operator that wants to be Revoked



--- 
### setContractRegistry(address)


**Execution cost**: less than 21893 gas


Params:

1. **_contractRegistryAddr** *of type `address`*


--- 
### symbol()


**Execution cost**: No bound available

**Attributes**: constant



Returns:

> the symbol of the token

1. **output_0** *of type `string`*

--- 
### totalSupply()


**Execution cost**: less than 535 gas

**Attributes**: constant



Returns:

> the total supply of the token

1. **output_0** *of type `uint256`*

--- 
### transfer(address,uint256)
>
>ERC20 backwards compatible transfer.


**Execution cost**: No bound available


Params:

1. **_to** *of type `address`*

    > The address of the recipient

2. **_value** *of type `uint256`*

    > The amount of tokens to be transferred


Returns:

> `true`, if the transfer can't be done, it should fail.

1. **success** *of type `bool`*

--- 
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: less than 23439 gas


Params:

1. **_newOwner** *of type `address`*

    > The address to transfer ownership to.



--- 
### unpause()
>
> called by the owner to unpause, returns to normal state


**Execution cost**: less than 21630 gas




[Back to the top ↑](#noriv0_2_0)
