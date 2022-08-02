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

  /**
   * @notice Emitted when a removal is released from a Certificate.
   * @param certificatedId The certificate to connected to the removal.
   * @param removalId The removal to update the balance for.
   * @param amount The amount to added or removed for the certificate.
   */
  event RemovalReleased(
    uint256 indexed certificatedId,
    uint256 indexed removalId,
    uint256 amount
  );
}
