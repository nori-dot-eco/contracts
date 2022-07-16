// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

interface IERC998ERC1155TopDown {
  event ReceiveChildBatch(
    address indexed from,
    address recipient,
    uint256 indexed parentTokenId,
    address indexed childContract,
    uint256[] childTokenIds,
    uint256[] childTokenAmounts
  );
}
