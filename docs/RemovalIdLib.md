## RemovalIdLib




_Library encapsulating the logic around encoding and decoding removal token ids.

The token IDs used for a given ERC1155 token in Removal encode information about the carbon removal in the following
format(s), where the first byte encodes the format version:

Version 0:
[1byte][1byte][--2 bytes--][--2 bytes--][--2 bytes--][----------- 20 bytes------------- ][------4 bytes------]
tokIdV--meth&amp;v---vintage------country------subdivision------------ supplier address --------------subidentifier--

For methodology 1 (regenerative ag), the subidentifier serves as a parcel identifier._



---

### isCapitalized

```solidity
function isCapitalized(bytes2 characters) internal pure returns (bool valid)
```






### validate

```solidity
function validate(struct DecodedRemovalIdV0 removal) internal pure
```






### createRemovalId

```solidity
function createRemovalId(struct DecodedRemovalIdV0 removal) internal pure returns (uint256)
```

Packs data about a removal into a 256-bit token id for the removal.

_Performs some possible validations on the data before attempting to create the id._

| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | struct DecodedRemovalIdV0 | removal data struct to be packed into a uint256 ID |


### decodeRemovalIdV0

```solidity
function decodeRemovalIdV0(uint256 removalId) internal pure returns (struct DecodedRemovalIdV0)
```

Unpacks a V0 removal id into its component data.




### version

```solidity
function version(uint256 removalId) internal pure returns (uint8)
```

Extracts and returns the version field of a removal token id.




### methodology

```solidity
function methodology(uint256 removalId) internal pure returns (uint8)
```

Extracts and returns the methodology field of a removal token id.




### methodologyVersion

```solidity
function methodologyVersion(uint256 removalId) internal pure returns (uint8)
```

Extracts and returns the methodology version field of a removal token id.




### vintage

```solidity
function vintage(uint256 removalId) internal pure returns (uint16)
```

Extracts and returns the vintage field of a removal token id.




### countryCode

```solidity
function countryCode(uint256 removalId) internal pure returns (bytes2)
```

Extracts and returns the country code field of a removal token id.




### subdivisionCode

```solidity
function subdivisionCode(uint256 removalId) internal pure returns (bytes2)
```

Extracts and returns the subdivision field of a removal token id.




### supplierAddress

```solidity
function supplierAddress(uint256 removalId) internal pure returns (address)
```

Extracts and returns the supplier address field of a removal token ID.




### subIdentifier

```solidity
function subIdentifier(uint256 removalId) internal pure returns (uint32)
```

Extracts and returns the subIdentifier field of a removal token id.




### _extractValue

```solidity
function _extractValue(uint256 removalId, uint256 numBytesFieldLength, uint256 numBytesOffsetFromRight) private pure returns (uint256)
```



_Extracts a field of the specified length in bytes, at the specified location, from a removal id._





