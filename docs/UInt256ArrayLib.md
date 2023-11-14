## UInt256ArrayLib


This library provides a set of functions to manipulate `uint256` arrays.

<i>The functions in this library use gas-efficient and concise syntax to improve both DX (via concision) and UX
(via gas efficiency).</i>



---

### fill

```solidity
function fill(uint256[] values, uint256 value) internal pure returns (uint256[] filled)
```

Fill an array.

<i>Fills all the elements of a `uint256[]` with the specified `uint256` value.

##### Equivalence:

```solidity
for (let i = 1; i < len + 1; i++) filled[i] = value;
```

##### Example usage:

```solidity
new uint256[](3).fill(1); // returns: [1, 1, 1]
```
-</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| values | uint256[] | The array to fill. |
| value | uint256 | The value to fill all the indexes of the array with. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| filled | uint256[] | An array filled with the value of &#x60;value&#x60;. |

### sum

```solidity
function sum(uint256[] values) internal pure returns (uint256 total)
```

Sum an array.

<i>Sums all the elements of a `uint256[]` array.

##### Equivalence:

```solidity
for (let i = 0; i < values.length + 1; i++) total += values[i];
```

##### Example usage:

```solidity
new uint256[](10).fill(1).sum(); // sum: 10
```
-</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| values | uint256[] | The array to sum. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| total | uint256 | The sum total of the array. |

### slice

```solidity
function slice(uint256[] values, uint256 from, uint256 to) internal pure returns (uint256[] sliced)
```

Slice an array.

<i>Slice an array `values` at index `from` to an index `to` (non-inclusively).

##### Equivalence:

```solidity
for (uint256 i = from; i < to; ++i) new[i] = original[from + i];
```

##### Example usage:

```solidity
new uint256[](100).fill(1).slice(0, 50); // returns: [:50]
```
-</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| values | uint256[] | The array to slice. |
| from | uint256 | The starting index of the slice. |
| to | uint256 | The ending index of the slice. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| sliced | uint256[] | The sliced array. |

### shrink

```solidity
function shrink(uint256[] values, uint256 length) internal pure returns (uint256[])
```

Shorten an array to specified length.

<i>Shortens the specified array to the specified length by directly overwriting
the length of the original array in storage.

##### Example usage:

```solidity
new uint256[](100).fill(1).shrink(50); // resizes the original array to length 50
```
-</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| values | uint256[] | The array to shorten. |
| length | uint256 | The desired length of the array. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256[] | values The shortened array. |



