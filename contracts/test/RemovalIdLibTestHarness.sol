// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import {RemovalIdLib, DecodedRemovalIdV0} from "../RemovalIdLib.sol";

/**
 * @dev Testbed contract for testing RemovalIdLib library.
 *
 * Not intended for deployment in productionish environments.
 */
contract RemovalTestHarness {
  function createRemovalId(DecodedRemovalIdV0 memory removalData)
    public
    pure
    returns (uint256)
  {
    return RemovalIdLib.createRemovalId(removalData);
  }

  function decodeRemovalIdV0(uint256 removalId)
    public
    pure
    returns (DecodedRemovalIdV0 memory)
  {
    return RemovalIdLib.decodeRemovalIdV0(removalId);
  }
}
