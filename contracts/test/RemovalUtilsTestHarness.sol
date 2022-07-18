// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import {RemovalUtils, UnpackedRemovalIdV0} from "../RemovalUtils.sol";

/**
 * @dev Testbed contract for testing RemovalUtils library.
 *
 * Not intended for deployment in productionish environments.
 */
contract RemovalTestHarness {
  function createRemovalId(bytes calldata removalData)
    public
    pure
    returns (uint256)
  {
    // todo add struct version and remove non-struct version
    return RemovalUtils.createRemovalId(removalData);
  }

  function createRemovalIdFromStruct(UnpackedRemovalIdV0 memory removalData)
    public
    pure
    returns (uint256)
  {
    // todo add struct version and remove non-struct version
    return RemovalUtils.createRemovalIdFromStruct(removalData);
  }

  function unpackRemovalIdV0(uint256 removalId)
    public
    pure
    returns (UnpackedRemovalIdV0 memory)
  {
    return RemovalUtils.unpackRemovalIdV0(removalId);
  }
}
