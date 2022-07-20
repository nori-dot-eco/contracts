// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

interface ICertificate {
  // todo extract interfaces for other contracts? foundry has `cast interface` to generate interfaces
  event ReceiveRemovalBatch(
    address from,
    address indexed recipient,
    uint256 indexed certificateId,
    uint256[] removalIds, // todo consider gas costs of NOT indexing arrays-- seems pointless to index arrays
    uint256[] removalAmounts
  );
}
