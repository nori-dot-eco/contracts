// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import {RemovalUtils, UnpackedRemovalIdV0} from "./RemovalUtils.sol";

/**
 * @dev Testbed contract for testing RemovalUtils library.
 *
 * Not intended for deployment in productionish environments.
 */

contract RemovalTestHarness {
  using RemovalUtils for *;

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
    return RemovalUtils.unpackRemovalId(removalId);
  }

  function versionFromRemovalId(uint256 removalId)
    public
    pure
    returns (uint256)
  {
    return RemovalUtils.versionFromRemovalId(removalId);
  }

  function methodologyFromRemovalId(uint256 removalId)
    public
    pure
    returns (uint256)
  {
    return RemovalUtils.methodologyFromRemovalId(removalId);
  }

  function methodologyVersionFromRemovalId(uint256 removalId)
    public
    pure
    returns (uint256)
  {
    return RemovalUtils.methodologyVersionFromRemovalId(removalId);
  }

  function vintageFromRemovalId(uint256 removalId)
    public
    pure
    returns (uint256)
  {
    return RemovalUtils.vintageFromRemovalId(removalId);
  }

  function countryCodeFromRemovalId(uint256 removalId)
    public
    pure
    returns (string memory)
  {
    return RemovalUtils.countryCodeFromRemovalId(removalId);
  }

  function admin1CodeFromRemovalId(uint256 removalId)
    public
    pure
    returns (string memory)
  {
    return RemovalUtils.admin1CodeFromRemovalId(removalId);
  }

  function supplierAddressFromRemovalId(uint256 removalId)
    public
    pure
    returns (address)
  {
    return RemovalUtils.supplierAddressFromRemovalId(removalId);
  }

  function subIdentifierFromRemovalId(uint256 removalId)
    public
    pure
    returns (uint256)
  {
    return RemovalUtils.subIdentifierFromRemovalId(removalId);
  }
}
