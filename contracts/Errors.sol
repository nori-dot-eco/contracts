// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

/**
 * @notice Thrown when two arrays are not of equal length.
 */
error ArrayLengthMismatch(string array1Name, string array2Name);
/**
 * @notice Thrown when an unsupported function is called.
 */
error FunctionDisabled();
/**
 * @notice Thrown when a function that can only be called by the Removal contract is called by any address other than
 * the Removal contract.
 */
error SenderNotRemovalContract();
/**
 * @notice Thrown when a non-existent rNORI schedule is requested.
 */
error NonexistentSchedule(uint256 scheduleId);
/**
 * @notice Thrown when an rNORI schedule already exists for the given `scheduleId`.
 */
error ScheduleExists(uint256 scheduleId);
/**
 * @notice Thrown when rNORI does not have enough unreleased tokens to fulfill a request.
 */
error InsufficientUnreleasedTokens(uint256 scheduleId);
/**
 * @notice Thrown when rNORI does not have enough claimable tokens to fulfill a withdrawal.
 */
error InsufficientClaimableBalance(address account, uint256 scheduleId);
/**
 * @notice Thrown when the caller does not have the role required to mint the tokens.
 */
error InvalidMinter(address account);
/**
 * @notice Thrown when the rNORI duration provides is zero.
 */
error InvalidZeroDuration();
/**
 * @notice Thrown when a `removalId` does not have removals for the specified `year`.
 */
error RemovalNotFoundInYear(uint256 removalId, uint256 year);
/**
 * @notice Thrown when the bytes contains unexpected uncapitalized characters.
 */
error UncapitalizedString(bytes2 country, bytes2 subdivision);
/**
 * @notice Thrown when a methodology is greater than the maximum allowed value.
 */
error MethodologyTooLarge(uint8 methodology);
/**
 * @notice Thrown when a methodology version is greater than the maximum allowed value.
 */
error MethodologyVersionTooLarge(uint8 methodologyVersion);
/**
 * @notice Thrown when a removal ID uses an unsupported version.
 */
error UnsupportedIdVersion(uint8 idVersion);
/**
 * @notice Thrown when a caller attempts to transfer a certificate.
 */
error ForbiddenTransferAfterMinting();
/**
 * @notice Thrown when their is insufficient supply in the market.
 */
error InsufficientSupply();
/**
 * @notice Thrown when the caller is not authorized to withdraw.
 */
error UnauthorizedWithdrawal();
/**
 * @notice Thrown when the supply of the market is too low to fulfill a request and the caller is not authorized to
 * access the reserve supply.
 */
error LowSupplyAllowlistRequired();
/**
 * @notice Thrown when the caller is not authorized to perform the action.
 */
error Unauthorized();
/**
 * @notice Thrown when transaction data contains invalid data.
 */
error InvalidData();
/**
 * @notice Thrown when the token specified by `tokenId` is transferred but the type of transfer is unsupported.
 */
error InvalidTokenTransfer(uint256 tokenId);
/**
 * @notice Thrown when the specified fee percentage is not a valid value.
 */
error InvalidNoriFeePercentage();
/**
 * @notice Thrown when a token is transferred but the type of transfer is unsupported.
 */
error ForbiddenTransfer();
/**
 * @notice Thrown when a the removal specified by `tokenId` has not been minted yet.
 */
error RemovalNotYetMinted(uint256 tokenId);
/**
 * @notice Thrown when the market encounters a purchase that it does not have enough supply to fulfill.
 */
error IncorrectSupplyAllocation();
/**
 * @notice Thrown when the caller specifies the zero address for the Nori fee wallet.
 */
error NoriFeeWalletZeroAddress();
