// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import {RemovalUtils, UnpackedRemovalIdV0, RemovalId} from "../RemovalUtils.sol";

/**
 * @dev Testbed contract for testing RemovalUtils library.
 *
 * Not intended for deployment in productionish environments.
 */
contract RemovalTestHarness {
  using RemovalUtils for RemovalId;

  function createRemovalId(bytes calldata removalData)
    public
    pure
    returns (RemovalId)
  {
    // todo add struct version and remove non-struct version
    return RemovalUtils.createRemovalId(removalData);
  }

  function createRemovalIdFromStruct(
    UnpackedRemovalIdV0 memory removalData //pure
  ) public returns (RemovalId) {
    // todo add struct version and remove non-struct version
    return RemovalUtils.createRemovalIdFromStruct(removalData);
  }

  function unpackRemovalIdV0(RemovalId removalId)
    public
    pure
    returns (UnpackedRemovalIdV0 memory)
  {
    return removalId.unpackRemovalIdV0();
  }
}
