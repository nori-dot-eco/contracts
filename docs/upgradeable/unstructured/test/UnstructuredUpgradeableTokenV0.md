# UnstructuredUpgradeableTokenV0
> UnstructuredUpgradeableTokenV0


**Execution cost**: No bound available

**Deployment cost**: less than 1444400 gas

**Combined cost**: No bound available


## Events
### Approval(address,address,uint256)


**Execution cost**: No bound available


Params:

1. **owner** *of type `address`*
2. **spender** *of type `address`*
3. **value** *of type `uint256`*

--- 
### AuthorizedOperator(address,address)


**Execution cost**: No bound available


Params:

1. **operator** *of type `address`*
2. **tokenHolder** *of type `address`*

--- 
### Burnt(address,uint256)


**Execution cost**: No bound available


Params:

1. **from** *of type `address`*
2. **amount** *of type `uint256`*

--- 
### Minted(address,uint256,address,bytes)


**Execution cost**: No bound available


Params:

1. **to** *of type `address`*
2. **amount** *of type `uint256`*
3. **operator** *of type `address`*
4. **operatorData** *of type `bytes`*

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


## Methods
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


**Execution cost**: less than 22689 gas


Params:

1. **_spender** *of type `address`*

    > The address of the account able to transfer the tokens

2. **_value** *of type `uint256`*

    > The amount of tokens to be approved for transfer


Returns:

> `true`, if the approve can't be done, it should fail.

1. **success** *of type `bool`*

--- 
### disableERC20()
>
>Disables the ERC-20 interface. This function can only be called  by the owner.


**Execution cost**: No bound available




--- 
### allowance(address,address)
>
>ERC20 backwards compatible allowance.  This function makes it easy to read the `allowed[]` map


**Execution cost**: less than 1459 gas

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


**Execution cost**: less than 614 gas

**Attributes**: constant



Returns:

> The decimls of the token. Forced to 18 in ERC777.

1. **output_0** *of type `uint8`*

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


**Execution cost**: less than 601 gas

**Attributes**: constant



Returns:

> the granularity of the token

1. **output_0** *of type `uint256`*

--- 
### isOperatorFor(address,address)
>
>Check whether the `_operator` address is allowed to manage the tokens held by `_tokenHolder` address.


**Execution cost**: less than 1385 gas

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
### balanceOf(address)
>
>Return the account balance of some account


**Execution cost**: less than 867 gas

**Attributes**: constant


Params:

1. **_tokenHolder** *of type `address`*

    > Address for which the balance is returned


Returns:

> the balance of `_tokenAddress`.

1. **output_0** *of type `uint256`*

--- 
### initialize(string,string,uint256,uint256,address,address)


**Execution cost**: No bound available


Params:

1. **_name** *of type `string`*
2. **_symbol** *of type `string`*
3. **_granularity** *of type `uint256`*
4. **_totalSupply** *of type `uint256`*
5. **_eip820RegistryAddr** *of type `address`*
6. **_owner** *of type `address`*


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
### enableERC20()
>
>Re enables the ERC-20 interface. This function can only be called  by the owner.


**Execution cost**: No bound available




--- 
### authorizeOperator(address)
>
>Authorize a third party `_operator` to manage (send) `msg.sender`'s tokens.


**Execution cost**: less than 22622 gas


Params:

1. **_operator** *of type `address`*

    > The operator that wants to be Authorized



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
### revokeOperator(address)
>
>Revoke a third party `_operator`'s rights to manage (send) `msg.sender`'s tokens.


**Execution cost**: less than 27987 gas


Params:

1. **_operator** *of type `address`*

    > The operator that wants to be Revoked



--- 
### owner()
>
> Tells the address of the owner


**Execution cost**: less than 842 gas

**Attributes**: constant



Returns:

> the address of the owner

1. **output_0** *of type `address`*

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
### symbol()


**Execution cost**: No bound available

**Attributes**: constant



Returns:

> the symbol of the token

1. **output_0** *of type `string`*

--- 
### totalSupply()


**Execution cost**: less than 513 gas

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
### transferOwnership(address)
>
> Allows the current owner to transfer control of the contract to a newOwner.


**Execution cost**: No bound available


Params:

1. **newOwner** *of type `address`*

    > The address to transfer ownership to.



[Back to the top ↑](#unstructuredupgradeabletokenv0)
