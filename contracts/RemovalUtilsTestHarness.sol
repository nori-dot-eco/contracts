// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import {RemovalUtils} from "./RemovalUtils.sol";

/**
 * @dev Testbed contract for testing RemovalUtils library.
 *
 * Not intended for deployment in productionish environments.
 */

contract RemovalTestHarness {
  using RemovalUtils for *;

  function supplierAddressFromTokenId(uint256 tokenId)
    public
    pure
    returns (address)
  {
    return RemovalUtils.supplierAddressFromTokenId(tokenId);
  }

  function parcelIdFromTokenId(uint256 tokenId) public pure returns (uint256) {
    return RemovalUtils.parcelIdFromTokenId(tokenId);
  }

  function vintageFromTokenId(uint256 tokenId) public pure returns (uint256) {
    return RemovalUtils.vintageFromTokenId(tokenId);
  }

  function countryCodeFromTokenId(uint256 tokenId)
    public
    pure
    returns (string memory)
  {
    return RemovalUtils.countryCodeFromTokenId(tokenId);
  }

  function admin1CodeFromTokenId(uint256 tokenId)
    public
    pure
    returns (string memory)
  {
    return RemovalUtils.admin1CodeFromTokenId(tokenId);
  }

  function methodologyFromTokenId(uint256 tokenId)
    public
    pure
    returns (uint256)
  {
    return RemovalUtils.methodologyFromTokenId(tokenId);
  }

  function methodologyVersionFromTokenId(uint256 tokenId)
    public
    pure
    returns (uint256)
  {
    return RemovalUtils.methodologyVersionFromTokenId(tokenId);
  }
}
