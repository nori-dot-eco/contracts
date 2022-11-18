/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import {UInt256ArrayLib, AddressArrayLib} from "@/contracts/ArrayLib.sol";
import "@/test/helpers/test.sol";

contract UInt256ArrayLib_slice is Global {
  using UInt256ArrayLib for uint256[];

  function test() external {
    assertEq(this.standardImplementation(), this.libraryImplementation());
  }

  function test_gas() external {
    uint256 gasLeft = gasleft();
    this.standardImplementation();
    uint256 standardGasUsed = gasLeft - gasleft();
    gasLeft = gasleft();
    this.libraryImplementation();
    uint256 libraryGasUsed = gasLeft - gasleft();
    assertLt({a: libraryGasUsed, b: standardGasUsed});
  }

  /** @dev Calling slice() with invalid params (e.g., out of bounds access or non-sequential indices) should revert */
  function test_revertsWhenArgumentsAreInvalid() external {
    uint256[] memory values = _getTestValues();
    _validateOriginalValues({values: values});
    uint8[3][2] memory expectedSliceResults = [
      [0, uint8(values.length + 1), 0], // `to` is greater than the size of `values`
      [1, 0, 0] // `to` is less than `from`
    ];
    uint256[] memory empty = new uint256[](0);
    for (uint256 i = 0; i < expectedSliceResults.length; ++i) {
      vm.expectRevert();
      uint256[] memory sliceResult = values.slice({
        from: expectedSliceResults[i][0],
        to: expectedSliceResults[i][1]
      });
      assertEq({a: sliceResult.length, b: expectedSliceResults[i][2]});
      assertEq({a: sliceResult, b: empty});
      _validateOriginalValues({values: values});
    }
  }

  /** @dev Calling slice() on a memory array should not mutate its value or size */
  function test_shouldNotChangeOriginalArrayValuesOrSize() external {
    uint256[] memory values = _getTestValues();
    _validateOriginalValues({values: values});
    uint8[3][10] memory expectedSliceResults = [
      // from, to, length
      [0, 0, 0], // []
      [0, 1, 1], // [100]
      [0, 2, 2], // [100, 101]
      [0, 3, 3], // [100, 101, 102]
      [1, 1, 0], // []
      [1, 2, 1], // [101]
      [1, 3, 2], // [101, 102]
      [2, 2, 0], // []
      [2, 3, 1], // [102]
      [3, 3, 0] //  []
    ];
    uint256[][] memory slicedArrays = new uint256[][](
      expectedSliceResults.length
    );
    for (uint256 i = 0; i < expectedSliceResults.length; ++i) {
      uint256[] memory result = _toMemoryArray(expectedSliceResults[i]);
      uint256 from = result[0];
      uint256 to = result[1];
      uint256 length = result[2];
      slicedArrays[i] = values.slice({from: from, to: to});
      assertEq({a: slicedArrays[i].length, b: length});
      _validateOriginalValues({values: values});
    }
    uint256[] memory empty = new uint256[](0);
    assertEq({a: slicedArrays[0], b: empty});
    assertEq({a: slicedArrays[1], b: _toMemoryArray([values[0]])});
    assertEq({a: slicedArrays[2], b: _toMemoryArray([values[0], values[1]])});
    assertEq({
      a: slicedArrays[3],
      b: _toMemoryArray([values[0], values[1], values[2]])
    });
    assertEq({a: slicedArrays[4], b: empty});
    assertEq({a: slicedArrays[5], b: _toMemoryArray([values[1]])});
    assertEq({a: slicedArrays[6], b: _toMemoryArray([values[1], values[2]])});
    assertEq({a: slicedArrays[7], b: empty});
    assertEq({a: slicedArrays[8], b: _toMemoryArray([values[2]])});
    assertEq({a: slicedArrays[9], b: empty});
  }

  function test_reference() external view {
    this.standardImplementation();
  }

  function test_library() external view {
    this.libraryImplementation();
  }

  function standardImplementation()
    external
    pure
    returns (uint256[] memory arr)
  {
    uint256[] memory normal = new uint256[](100).fill(1);
    uint256 to = 50;
    arr = new uint256[](to);
    unchecked {
      for (uint256 i = 0; i < to; ++i) arr[i] = normal[0 + i];
    }
  }

  function libraryImplementation() external pure returns (uint256[] memory) {
    return new uint256[](100).fill(1).slice(0, 50);
  }

  /** @dev Used to validate that the original memory array has not mutated */
  function _validateOriginalValues(uint256[] memory values) private {
    uint256[] memory originalValues = _getTestValues();
    assertEq({a: originalValues.length, b: 3});
    assertEq({a: originalValues, b: values});
  }

  function _getTestValues() private pure returns (uint256[] memory values) {
    values = new uint256[](3);
    values[0] = 100;
    values[1] = 101;
    values[2] = 102;
    return values;
  }

  function _toMemoryArray(uint256[1] memory values)
    private
    pure
    returns (uint256[] memory arr)
  {
    arr = new uint256[](values.length);
    for (uint256 i = 0; i < values.length; ++i) arr[i] = values[i];
  }

  function _toMemoryArray(uint256[2] memory values)
    private
    pure
    returns (uint256[] memory arr)
  {
    arr = new uint256[](values.length);
    for (uint256 i = 0; i < values.length; ++i) arr[i] = values[i];
  }

  function _toMemoryArray(uint256[3] memory values)
    private
    pure
    returns (uint256[] memory arr)
  {
    arr = new uint256[](values.length);
    for (uint256 i = 0; i < values.length; ++i) arr[i] = values[i];
  }

  function _toMemoryArray(uint8[3] memory values)
    private
    pure
    returns (uint256[] memory arr)
  {
    arr = new uint256[](values.length);
    for (uint256 i = 0; i < values.length; ++i) arr[i] = values[i];
  }
}

contract UInt256ArrayLib_copy is Global {
  using UInt256ArrayLib for uint256[];

  function test() external {
    assertEq(this.standardImplementation(), this.libraryImplementation());
  }

  function test_reference() external view {
    this.standardImplementation();
  }

  function test_library() external view {
    this.libraryImplementation();
  }

  function standardImplementation()
    external
    pure
    returns (uint256[] memory arr)
  {
    uint256[] memory normal = new uint256[](100).fill(1);
    arr = new uint256[](100);
    for (uint256 i = 0; i < arr.length; ++i) normal[i] = arr[i];
  }

  function libraryImplementation() external pure returns (uint256[] memory) {
    return new uint256[](100).fill(1).copy(new uint256[](100));
  }
}

contract UInt256ArrayLib_fill is Global {
  using UInt256ArrayLib for uint256[];

  function test() external {
    assertEq(this.standardImplementation(), this.libraryImplementation());
  }

  function test_reference() external view {
    this.standardImplementation();
  }

  function test_library() external view {
    this.libraryImplementation();
  }

  function standardImplementation()
    external
    pure
    returns (uint256[] memory arr)
  {
    arr = new uint256[](100);
    for (uint256 i = 0; i < arr.length; ++i) arr[i] = 1;
  }

  function libraryImplementation() external pure returns (uint256[] memory) {
    return new uint256[](100).fill(1);
  }
}

contract UInt256ArrayLib_sum is Global {
  using UInt256ArrayLib for uint256[];

  function test() external {
    assertEq(this.standardImplementation(), this.libraryImplementation());
  }

  function test_library_overflow() external {
    uint256[] memory vals = new uint256[](2);
    vals[0] = type(uint256).max;
    vals[1] = 1;
    vm.expectRevert();
    vals.sum();
  }

  function test_library() external view {
    this.libraryImplementation();
  }

  function test_reference() external view {
    this.standardImplementation();
  }

  function standardImplementation() external pure returns (uint256 total) {
    uint256[] memory normal = new uint256[](100).fill(1);
    for (uint256 i = 0; i < normal.length; ++i) total += normal[i];
  }

  function libraryImplementation() external pure returns (uint256) {
    return new uint256[](100).fill(1).sum();
  }
}

contract AddressArrayLib_fill is Global {
  using AddressArrayLib for address[];

  function test() external {
    assertEq(this.standardImplementation(), this.libraryImplementation());
  }

  function test_reference() external view {
    this.standardImplementation();
  }

  function test_library() external view {
    this.libraryImplementation();
  }

  function standardImplementation()
    external
    pure
    returns (address[] memory arr)
  {
    arr = new address[](100);
    for (uint256 i = 0; i < arr.length; ++i) arr[i] = address(0);
  }

  function libraryImplementation() external pure returns (address[] memory) {
    return new address[](100).fill(address(0));
  }
}
