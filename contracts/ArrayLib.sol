// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

/**
 * @title A library for `uint256[]`.
 * @author Nori Inc.
 * @notice This library provides a set of functions to manipulate `uint256` arrays.
 * @dev The functions in this library use gas-efficient and concise syntax to improve both DX (via concision) and UX
 * (via gas efficiency).
 */
library UInt256ArrayLib {
  /**
   * @notice Fill an array.
   * @dev Fills all the elements of a `uint256[]` with the specified `uint256` value.
   *
   * ##### Equivalence:
   *
   * ```solidity
   * for (let i = 1; i < len + 1; i++) filled[i] = value;
   * ```
   *
   * ##### Example usage:
   *
   * ```solidity
   * new uint256[](3).fill(1); // returns: [1, 1, 1]
   * ```
   * -
   * @param values The array to fill.
   * @param value The value to fill all the indexes of the array with.
   * @return filled An array filled with the value of `value`.
   */
  function fill(
    uint256[] memory values,
    uint256 value
  ) internal pure returns (uint256[] memory filled) {
    uint256 len = values.length;
    filled = new uint256[](len);
    assembly {
      for {
        let i := 1
      } lt(i, add(len, 1)) {
        i := add(i, 1)
      } {
        mstore(add(filled, mul(32, i)), value)
      }
    }
  }

  /**
   * @notice Sum an array.
   * @dev Sums all the elements of a `uint256[]` array.
   *
   * ##### Equivalence:
   *
   * ```solidity
   * for (let i = 0; i < values.length + 1; i++) total += values[i];
   * ```
   *
   * ##### Example usage:
   *
   * ```solidity
   * new uint256[](10).fill(1).sum(); // sum: 10
   * ```
   * -
   * @param values The array to sum.
   * @return total The sum total of the array.
   */
  function sum(uint256[] memory values) internal pure returns (uint256 total) {
    assembly {
      let len := mload(values)
      let element := add(values, 32)
      for {
        let end := add(element, mul(len, 32))
      } lt(element, end) {
        element := add(element, 32)
      } {
        let initialTotal := total
        total := add(total, mload(element))
        if lt(total, initialTotal) {
          revert(0, 0)
        }
      }
    }
  }

  /**
   * @notice Slice an array.
   * @dev Slice an array `values` at index `from` to an index `to` (non-inclusively).
   *
   * ##### Equivalence:
   *
   * ```solidity
   * for (uint256 i = from; i < to; ++i) new[i] = original[from + i];
   * ```
   *
   * ##### Example usage:
   *
   * ```solidity
   * new uint256[](100).fill(1).slice(0, 50); // returns: [:50]
   * ```
   * -
   * @param values The array to slice.
   * @param from The starting index of the slice.
   * @param to The ending index of the slice.
   * @return sliced The sliced array.
   */
  function slice(
    uint256[] memory values,
    uint256 from,
    uint256 to
  ) internal pure returns (uint256[] memory sliced) {
    assert(from <= to);
    assert(to <= values.length);
    uint256 len;
    unchecked {
      len = to - from;
    }
    sliced = new uint256[](len);
    assembly {
      for {
        let i := 1
      } lt(i, add(len, 1)) {
        i := add(i, 1)
      } {
        mstore(
          add(sliced, mul(32, i)),
          mload(add(values, mul(32, add(from, i))))
        )
      }
    }
  }

  /**
   * @notice Shorten an array to specified length.
   * @dev Shortens the specified array to the specified length by directly overwriting
   * the length of the original array in storage.
   *
   * ##### Example usage:
   *
   * ```solidity
   * new uint256[](100).fill(1).cutToLength(50); // resizes the original array to length 50
   * ```
   * -
   * @param values The array to shorten.
   * @param length The desired length of the array.
   * @return values The shortened array.
   */
  function cutToLength(
    uint256[] memory values,
    uint256 length
  ) internal pure returns (uint256[] memory) {
    assert(length <= values.length);
    uint256 location;
    assembly {
      location := values
      mstore(location, length)
    }
    return values;
  }
}

/**
 * @title A library for `address[]`.
 * @author Nori Inc.
 * @notice This library provides a set of functions to manipulate `address` arrays.
 * @dev The functions in this library use gas-efficient and concise syntax to improve both DX (via concision) and UX
 * (via gas efficiency).
 */
library AddressArrayLib {
  /**
   * @notice Fill an array.
   * @dev Fills all the elements of an `address` array with a value.
   *
   * ##### Equivalence:
   *
   * ```solidity
   * for (let i = 1; i < len + 1; i++) filled[i] = value;
   * ```
   *
   * ##### Example usage:
   *
   * ```solidity
   * new address[](3).fill(address(0); // returns: [address(0), address(0), address(0)]
   * ```
   * -
   * @param values The array to fill.
   * @param value The value to fill all the indexes of the array with.
   * @return filled An array filled with the value of `value`.
   */
  function fill(
    address[] memory values,
    address value
  ) internal pure returns (address[] memory filled) {
    uint256 len = values.length;
    filled = new address[](len);
    assembly {
      for {
        let i := 1
      } lt(i, add(len, 1)) {
        i := add(i, 1)
      } {
        mstore(add(filled, mul(32, i)), value)
      }
    }
  }
}
