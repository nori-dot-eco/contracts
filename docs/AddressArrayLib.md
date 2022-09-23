## AddressArrayLib


This library provides a set of functions to manipulate `address` arrays.

<i>The functions in this library use gas-efficient and concise syntax to improve both DX (via concision) and UX
(via gas efficiency).</i>



---

### fill

```solidity
function fill(address[] from, address val) internal pure returns (address[] arr)
```

Fill an array.

<i>Fills all of the elements of an `address` array with a value.

##### Equivalence:

```solidity
for (let i = 1; i < len + 1; i++) arr[i] = val;
```

##### Example usage:

```solidity
new address[](3).fill(address(0); // returns: [address(0), address(0), address(0)]
```
-</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address[] | The array to fill. |
| val | address | The value to fill all of the indexes of the array with. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| arr | address[] | An array filled with the value of &#x60;val&#x60;. |



