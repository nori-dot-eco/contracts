// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

interface IMarket {
  /**
   * @notice Get the RestrictedNORI contract address.
   * @return Returns the address of the RestrictedNORI contract.
   */
  function restrictedNoriAddress() external view returns (address);

  /**
   * @notice Releases a removal from the market.
   * @dev This function is called by the Removal contract when releasing removals.
   *
   * @param removalId The ID of the removal to release.
   * @param amount The amount of that removal to release.
   */
  function release(uint256 removalId, uint256 amount) external;
}