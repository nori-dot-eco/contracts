// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

interface ICertificate {
  event ReceiveRemovalBatch(
    address from,
    address indexed recipient,
    uint256 indexed certificateId,
    uint256[] removalIds,
    uint256[] removalAmounts
  );
}
