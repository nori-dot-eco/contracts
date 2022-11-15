// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

interface ICertificate {
  /**
   * @notice Returns the total number of certificates that have been minted.
   * @dev Includes burned certificates.
   * @return Total number of certificates that have been minted.
   */
  function totalMinted() external view returns (uint256);
}
