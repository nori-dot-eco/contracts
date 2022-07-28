// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "../interfaces/IRemoval.sol";
import {RemovalIdLib} from "../RemovalIdLib.sol";

/**
 * @dev Testbed contract for testing RemovalIdLib library.
 *
 * Not intended for deployment in productionish environments.
 */
contract RemovalTestHarness {
  function createRemovalId(UnpackedRemovalIdV0 memory removalData)
    public
    pure
    returns (uint256)
  {
    return RemovalIdLib.createRemovalId(removalData);
  }

  function unpackRemovalIdV0(uint256 removalId)
    public
    pure
    returns (UnpackedRemovalIdV0 memory)
  {
    return RemovalIdLib.unpackRemovalIdV0(removalId);
  }
}
