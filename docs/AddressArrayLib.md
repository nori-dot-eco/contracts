## AddressArrayLib


This library provides a set of functions to manipulate `address` arrays.

<i>The functions in this library use gas-efficient and concise syntax to improve both DX (via concision) and UX
(via gas efficiency).</i>



---

### fill

```solidity
function fill(address[] values, address value) internal pure returns (address[] filled)
```

Fill an array.

<i>Fills all the elements of an `address` array with a value.

##### Equivalence:

```solidity
for (let i = 1; i < len + 1; i++) filled[i] = value;
```

##### Example usage:

```solidity
new address[](3).fill(address(0); // returns: [address(0), address(0), address(0)]
```
-</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| values | address[] | The array to fill. |
| value | address | The value to fill all the indexes of the array with. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| filled | address[] | An array filled with the value of &#x60;value&#x60;. |



