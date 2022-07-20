// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

// todo globally check all custom errrors use keyed arguments (e.g., Error({key:value})) vs Error(value);
// todo is there a best practice for defining errors? define in a lib, interface, contract, file, or something else?
error ArrayLengthMismatch(string array1Name, string array2Name);
error FunctionDisabled();
error MissingRole(bytes32 role);
error SenderNotRemovalContract();
