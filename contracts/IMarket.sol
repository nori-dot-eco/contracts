// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

interface IMarket {
  /**
   * @notice Releases a removal from the market.
   * @dev This function is called by the Removal contract when releasing removals.
   * @param removalId The ID of the removal to release.
   */
  function release(uint256 removalId) external;
}
