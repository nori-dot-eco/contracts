## ArrayLengthMismatch

```solidity
error ArrayLengthMismatch(string array1Name, string array2Name)
```

Thrown when two arrays are not of equal length.




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




## ScheduleExists

```solidity
error ScheduleExists(uint256 scheduleId)
```

Thrown when an rNORI schedule already exists for the given `scheduleId`.




## InsufficientUnreleasedTokens

```solidity
error InsufficientUnreleasedTokens(uint256 scheduleId)
```

Thrown when rNORI does not have enough unreleased tokens to fulfill a request.




## InsufficientClaimableBalance

```solidity
error InsufficientClaimableBalance(address account, uint256 scheduleId)
```

Thrown when rNORI does not have enough claimable tokens to fulfill a withdrawal.




## InvalidMinter

```solidity
error InvalidMinter(address account)
```

Thrown when the caller does not have the role required to mint the tokens.




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




## UncapitalizedString

```solidity
error UncapitalizedString(bytes2 country, bytes2 subdivision)
```

Thrown when the bytes contains unexpected uncapitalized characters.




## MethodologyTooLarge

```solidity
error MethodologyTooLarge(uint8 methodology)
```

Thrown when a methodology is greater than the maximum allowed value.




## MethodologyVersionTooLarge

```solidity
error MethodologyVersionTooLarge(uint8 methodologyVersion)
```

Thrown when a methodology version is greater than the maximum allowed value.




## UnsupportedIdVersion

```solidity
error UnsupportedIdVersion(uint8 idVersion)
```

Thrown when a removal ID uses an unsupported version.




## ForbiddenTransferAfterMinting

```solidity
error ForbiddenTransferAfterMinting()
```

Thrown when a caller attempts to transfer a certificate.




## InsufficientSupply

```solidity
error InsufficientSupply()
```

Thrown when their is insufficient supply in the market.




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

Thrown when the token specified by `tokenId` is transferred but the type of transfer is unsupported.




## InvalidNoriFeePercentage

```solidity
error InvalidNoriFeePercentage()
```

Thrown when the specified fee percentage is not a valid value.




## ForbiddenTransfer

```solidity
error ForbiddenTransfer()
```

Thrown when a token is transferred but the type of transfer is unsupported.




## RemovalNotYetMinted

```solidity
error RemovalNotYetMinted(uint256 tokenId)
```

Thrown when a the removal specified by `tokenId` has not been minted yet.




## IncorrectSupplyAllocation

```solidity
error IncorrectSupplyAllocation()
```

Thrown when the market encounters a purchase that it does not have enough supply to fulfill.




## NoriFeeWalletZeroAddress

```solidity
error NoriFeeWalletZeroAddress()
```

Thrown when the caller specifies the zero address for the Nori fee wallet.




