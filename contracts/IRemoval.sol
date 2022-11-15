// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

interface IRemoval {
  /**
   * @notice Get the project ID (which is the removal's schedule ID in RestrictedNORI) for a given removal ID.
   * @param id The removal token ID for which to retrieve the project ID.
   * @return The project ID for the removal token ID.
   */
  function getProjectId(uint256 id) external view returns (uint256);
}
