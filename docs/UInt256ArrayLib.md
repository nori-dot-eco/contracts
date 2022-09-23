## UInt256ArrayLib


This library provides a set of functions to manipulate `uint256` arrays.

<i>The functions in this library use gas-efficient and concise syntax to improve both DX (via concision) and UX
(via gas efficiency).</i>



---

### fill

```solidity
function fill(uint256[] from, uint256 val) internal pure returns (uint256[] arr)
```

Fill an array.

<i>Sums all of the elements of a `uint256[]` array.

##### Equivalence:

```solidity
for (let i = 1; i < len + 1; i++) arr[i] = val;
```

##### Example usage:

```solidity
new uint256[](3).fill(1).sum(); // returns: [1, 1, 1]
```
-</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | uint256[] | The array to fill. |
| val | uint256 | The value to fill all of the indexes of the array with. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| arr | uint256[] | An array filled with the value of &#x60;val&#x60;. |

### sum

```solidity
function sum(uint256[] data) internal pure returns (uint256 total)
```

Sum an array.

<i>Sums all of the elements of a `uint256[]` array.

##### Equivalence:

```solidity
for (let i = 0; i < data.length + 1; i++) total += arr[i];
```

##### Example usage:

```solidity
new uint256[](10).fill(1).sum(); // sum: 10
```
-</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| data | uint256[] | The array to sum. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| total | uint256 | The sum total of the array. |

### slice

```solidity
function slice(uint256[] arr, uint256 from, uint256 to) internal pure returns (uint256[] ret)
```

Slice an array.

<i>Slice an array `arr` at index `from` to an index `to`.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| arr | uint256[] | The array to slice. |
| from | uint256 | The starting index of the slice. |
| to | uint256 | The ending index of the slice. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| ret | uint256[] | The sliced array. |

### copy

```solidity
function copy(uint256[] from, uint256[] to) internal pure returns (uint256[])
```

Copy an array.

<i>Copy an array `from` to an array `to`.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | uint256[] | The array to copy from. |
| to | uint256[] | The array to copy to. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256[] | The copied array. |



