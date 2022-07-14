// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

interface IERC998ERC1155TopDown {
  event ReceivedChild(
    address indexed from,
    uint256 indexed toTokenId,
    address indexed childContract,
    uint256 childTokenId,
    uint256 amount
  );
  event TransferSingleChild(
    uint256 indexed fromTokenId,
    address indexed to,
    address indexed childContract,
    uint256 childTokenId,
    uint256 amount
  );
  event TransferBatchChild(
    uint256 indexed fromTokenId,
    address indexed to,
    address indexed childContract,
    uint256[] childTokenIds,
    uint256[] amounts
  );
}
