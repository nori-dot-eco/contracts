## ArrayLengthMismatch

```solidity
error ArrayLengthMismatch(string array1Name, string array2Name)
```

Thrown when two arrays are not of equal length.


| Name | Type | Description |
| ---- | ---- | ----------- |
| array1Name | string | The name of the first array variable. |
| array2Name | string | The name of the second array variable. |


## FunctionDisabled

```solidity
error FunctionDisabled()
```

Thrown when an unsupported function is called.




## SenderNotRemovalContract

```solidity
error SenderNotRemovalContract()
```

Thrown when a function that can only be called by the Removal contract is called by any address other than
the Removal contract.




## NonexistentSchedule

```solidity
error NonexistentSchedule(uint256 scheduleId)
```

Thrown when a non-existent rNORI schedule is requested.


| Name | Type | Description |
| ---- | ---- | ----------- |
| scheduleId | uint256 | The schedule ID that does not exist. |


## ScheduleExists

```solidity
error ScheduleExists(uint256 scheduleId)
```

Thrown when an rNORI schedule already exists for the given `scheduleId`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| scheduleId | uint256 | The schedule ID that already exists. |


## InsufficientUnreleasedTokens

```solidity
error InsufficientUnreleasedTokens(uint256 scheduleId)
```

Thrown when rNORI does not have enough unreleased tokens to fulfill a request.


| Name | Type | Description |
| ---- | ---- | ----------- |
| scheduleId | uint256 | The schedule ID that does not have enough unreleased tokens. |


## InsufficientClaimableBalance

```solidity
error InsufficientClaimableBalance(address account, uint256 scheduleId)
```

Thrown when rNORI does not have enough claimable tokens to fulfill a withdrawal.


| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account that does not have enough claimable tokens. |
| scheduleId | uint256 | The schedule ID that does not have enough claimable tokens. |


## InvalidMinter

```solidity
error InvalidMinter(address account)
```

Thrown when the caller does not have the role required to mint the tokens.


| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | the account that does not have the role. |


## InvalidZeroDuration

```solidity
error InvalidZeroDuration()
```

Thrown when the rNORI duration provides is zero.




## RemovalNotFoundInYear

```solidity
error RemovalNotFoundInYear(uint256 removalId, uint256 year)
```

Thrown when a `removalId` does not have removals for the specified `year`.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal ID that does not have removals for the specified `year`. |
| year | uint256 | The year that does not have removals for the specified `removalId`. |


## UncapitalizedString

```solidity
error UncapitalizedString(bytes2 country, bytes2 subdivision)
```

Thrown when the bytes contain unexpected uncapitalized characters.


| Name | Type | Description |
| ---- | ---- | ----------- |
| country | bytes2 | the country that contains unexpected uncapitalized characters. |
| subdivision | bytes2 | the subdivision that contains unexpected uncapitalized characters. |


## MethodologyTooLarge

```solidity
error MethodologyTooLarge(uint8 methodology)
```

Thrown when a methodology is greater than the maximum allowed value.


| Name | Type | Description |
| ---- | ---- | ----------- |
| methodology | uint8 | the methodology that is greater than the maximum allowed value. |


## MethodologyVersionTooLarge

```solidity
error MethodologyVersionTooLarge(uint8 methodologyVersion)
```

Thrown when a methodology version is greater than the maximum allowed value.


| Name | Type | Description |
| ---- | ---- | ----------- |
| methodologyVersion | uint8 | the methodology version that is greater than the maximum allowed value. |


## UnsupportedIdVersion

```solidity
error UnsupportedIdVersion(uint8 idVersion)
```

Thrown when a removal ID uses an unsupported version.


| Name | Type | Description |
| ---- | ---- | ----------- |
| idVersion | uint8 | the removal ID version that is not supported. |


## ForbiddenTransferAfterMinting

```solidity
error ForbiddenTransferAfterMinting()
```

Thrown when a caller attempts to transfer a certificate.




## InsufficientSupply

```solidity
error InsufficientSupply()
```

Thrown when there is insufficient supply in the market.




## UnauthorizedWithdrawal

```solidity
error UnauthorizedWithdrawal()
```

Thrown when the caller is not authorized to withdraw.




## LowSupplyAllowlistRequired

```solidity
error LowSupplyAllowlistRequired()
```

Thrown when the supply of the market is too low to fulfill a request and the caller is not authorized to
access the reserve supply.




## Unauthorized

```solidity
error Unauthorized()
```

Thrown when the caller is not authorized to perform the action.




## InvalidData

```solidity
error InvalidData()
```

Thrown when transaction data contains invalid data.




## InvalidTokenTransfer

```solidity
error InvalidTokenTransfer(uint256 tokenId)
```

Thrown when the token specified by `tokenId` is transferred, but the type of transfer is unsupported.


| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The token ID that is used in the invalid transfer. |


## InvalidNoriFeePercentage

```solidity
error InvalidNoriFeePercentage()
```

Thrown when the specified fee percentage is not a valid value.




## ForbiddenTransfer

```solidity
error ForbiddenTransfer()
```

Thrown when a token is transferred, but the type of transfer is unsupported.




## RemovalNotYetMinted

```solidity
error RemovalNotYetMinted(uint256 tokenId)
```

Thrown when the removal specified by `tokenId` has not been minted yet.


| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The removal token ID that is not minted yet. |


## NoriFeeWalletZeroAddress

```solidity
error NoriFeeWalletZeroAddress()
```

Thrown when the caller specifies the zero address for the Nori fee wallet.




## InvalidHoldbackPercentage

```solidity
error InvalidHoldbackPercentage(uint8 holdbackPercentage)
```

Thrown when a holdback percentage greater than 100 is submitted to `mintBatch`.




## RemovalAlreadySoldOrConsigned

```solidity
error RemovalAlreadySoldOrConsigned(uint256 tokenId)
```

Thrown when attempting to list for sale a removal that already belongs to the Certificate or Market
contracts.




## ReplacementAmountMismatch

```solidity
error ReplacementAmountMismatch()
```

Thrown when replacement removal amounts do not sum to the specified total amount being replaced.




## ReplacementAmountExceedsNrtDeficit

```solidity
error ReplacementAmountExceedsNrtDeficit()
```

Thrown when attempting to replace more removals than the size of the deficit.




## CertificateNotYetMinted

```solidity
error CertificateNotYetMinted(uint256 tokenId)
```

Thrown when attempting to replace removals on behalf of a certificate that has not been minted yet.




## ERC20TransferFailed

```solidity
error ERC20TransferFailed()
```

Thrown when an ERC20 token transfer fails.




