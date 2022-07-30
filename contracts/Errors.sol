// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

error ArrayLengthMismatch(string array1Name, string array2Name);
error FunctionDisabled();
error MissingRole(bytes32 role);
error SenderNotRemovalContract();
error Unauthorized(); // todo perhaps use this for any authorization error
error InvalidData();
error InvalidCall();
error InvalidTokenTransfer(uint256 tokenId);
