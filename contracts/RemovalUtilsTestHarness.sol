// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import {RemovalUtils, UnpackedRemovalIdV0} from "./RemovalUtils.sol";

/**
 * @dev Testbed contract for testing RemovalUtils library.
 *
 * Not intended for deployment in productionish environments.
 */

contract RemovalTestHarness {
  using RemovalUtils for uint256;

  function createRemovalId(bytes calldata removalData)
    public
    pure
    returns (uint256)
  {
    return RemovalUtils.createRemovalId(removalData);
  }

  function unpackRemovalId(uint256 removalId)
    public
    pure
    returns (UnpackedRemovalIdV0 memory)
  {
    return removalId.unpackRemovalId();
  }

  function version(uint256 removalId) public pure returns (uint8) {
    return removalId.version();
  }

  function methodology(uint256 removalId) public pure returns (uint8) {
    return removalId.methodology();
  }

  function methodologyVersion(uint256 removalId) public pure returns (uint8) {
    return removalId.methodologyVersion();
  }

  function vintage(uint256 removalId) public pure returns (uint16) {
    return removalId.vintage();
  }

  function countryCode(uint256 removalId) public pure returns (bytes2) {
    return removalId.countryCode();
  }

  function admin1Code(uint256 removalId) public pure returns (bytes2) {
    return removalId.admin1Code();
  }

  function supplierAddress(uint256 removalId) public pure returns (address) {
    return removalId.supplierAddress();
  }

  function subIdentifier(uint256 removalId) public pure returns (uint32) {
    return removalId.subIdentifier();
  }
}
