/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import {UInt256ArrayLib, AddressArrayLib} from "@/contracts/ArrayLib.sol";

/**
 * @notice A harness contract for testing `UInt256ArrayLib` functionality.
 * @dev This is required for coverage to work with libraries.
 */
contract UInt256ArrayLibHarness {
  function fillUsingStandardImplementation(
    uint256[] memory values,
    uint256 value
  ) external pure returns (uint256[] memory filled) {
    filled = new uint256[](values.length);
    for (uint256 i = 0; i < values.length; ++i) filled[i] = value;
  }

  function fill(
    uint256[] memory values,
    uint256 value
  ) external pure returns (uint256[] memory) {
    return UInt256ArrayLib.fill({values: values, value: value});
  }

  function sliceUsingStandardImplementation(
    uint256[] memory values,
    uint256 from,
    uint256 to
  ) external pure returns (uint256[] memory sliced) {
    sliced = new uint256[](to);
    for (uint256 i = from; i < to; ++i) sliced[i] = values[0 + i];
  }

  function slice(
    uint256[] memory values,
    uint256 from,
    uint256 to
  ) external pure returns (uint256[] memory) {
    return UInt256ArrayLib.slice({values: values, from: from, to: to});
  }

  function sumUsingStandardImplementation(
    uint256[] memory values
  ) external pure returns (uint256 total) {
    for (uint256 i = 0; i < values.length; ++i) total += values[i];
  }

  function sum(uint256[] memory values) external pure returns (uint256) {
    return UInt256ArrayLib.sum({values: values});
  }
}

/**
 * @notice A harness contract for testing `AddressArrayLib` functionality.
 * @dev This is required for coverage to work with libraries.
 */
contract AddressArrayLibHarness {
  function fillUsingStandardImplementation(
    address[] memory values,
    address value
  ) external pure returns (address[] memory filled) {
    filled = new address[](values.length);
    for (uint256 i = 0; i < values.length; ++i) filled[i] = value;
  }

  function fill(
    address[] memory values,
    address value
  ) external pure returns (address[] memory) {
    return AddressArrayLib.fill({values: values, value: value});
  }
}
