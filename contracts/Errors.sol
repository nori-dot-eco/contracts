// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

error ArrayLengthMismatch(string array1Name, string array2Name);
error FunctionDisabled();
error SenderNotRemovalContract();
error NonexistentSchedule(uint256 scheduleId);
error InsufficientUnreleasedTokens(uint256 scheduleId);
error InsufficientClaimableBalance(address account, uint256 scheduleId);
error InvalidMinter(address account);
error InvalidZeroDuration();
error RemovalNotInQueue(uint256 removalId, uint256 queueVintage);
error RemovalAlreadyInQueue(uint256 removalId, uint256 queueVintage);
error UncapitalizedString(bytes2 country, bytes2 subdivision);
error MethodologyVersionTooLarge(uint8 methodologyVersion);
error UnsupportedIdVersion(uint8 idVersion);
error ForbiddenTransferAfterMinting();
error InsufficientSupply();
error UnauthorizedWithdrawal(); // todo consider allowing operators
error OutOfStock();
error LowSupplyAllowlistRequired();
error Unauthorized(); // todo perhaps use this for any authorization error
error InvalidData();
error InvalidCall();
error InvalidTokenTransfer(uint256 tokenId);
