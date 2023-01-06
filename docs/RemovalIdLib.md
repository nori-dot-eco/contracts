## RemovalIdLib


Library encapsulating the logic around encoding and decoding removal IDs.

<i>The token IDs used for a given ERC1155 token in Removal encode information about the carbon removal in the
following format(s), where the first byte encodes the format version:

##### Removal ID Version 0:

| Bytes Label | Description                                                 |
| ----------- | ----------------------------------------------------------- |
| tokIdV      | The token/removal ID version.                               |
| meth&v      | The removal's methodology version.                          |
| vintage     | The vintage of the removal.                                 |
| country     | The country that the removal occurred in.                   |
| subdiv      | The subdivision of the country that the removal occurred in.|
| supplier    | The supplier's original wallet address.                     |
| subid       | A unique sub-identifier (e.g., the parcel/field identifier).|

| tokIdV | meth&v | vintage | country | subdiv  | supplier | subid   |
| ------ | ------ | ------- | ------- | ------- | -------- | ------- |
| 1 byte | 1 byte | 2 bytes | 2 bytes | 2 bytes | 20 bytes | 4 bytes |</i>



---

### BITS_PER_BYTE

```solidity
uint256 BITS_PER_BYTE
```

The number of bits per byte.




### ID_VERSION_FIELD_LENGTH

```solidity
uint256 ID_VERSION_FIELD_LENGTH
```

The number of bytes allocated to the token/removal ID version.




### METHODOLOGY_DATA_FIELD_LENGTH

```solidity
uint256 METHODOLOGY_DATA_FIELD_LENGTH
```

The number of bytes allocated to the methodology version.




### VINTAGE_FIELD_LENGTH

```solidity
uint256 VINTAGE_FIELD_LENGTH
```

The number of bytes allocated to the vintage.




### COUNTRY_CODE_FIELD_LENGTH

```solidity
uint256 COUNTRY_CODE_FIELD_LENGTH
```

The number of bytes allocated to the ISO 3166-2 country code.




### ADMIN1_CODE_FIELD_LENGTH

```solidity
uint256 ADMIN1_CODE_FIELD_LENGTH
```

The number of bytes allocated to the administrative region of the ISO 3166-2 subdivision.




### ADDRESS_FIELD_LENGTH

```solidity
uint256 ADDRESS_FIELD_LENGTH
```

The number of bytes allocated to the supplier's original wallet address.




### SUBID_FIELD_LENGTH

```solidity
uint256 SUBID_FIELD_LENGTH
```

The number of bytes allocated to the sub-identifier.




### ID_VERSION_OFFSET

```solidity
uint256 ID_VERSION_OFFSET
```

The bit offset of the ID version.




### METHODOLOGY_DATA_OFFSET

```solidity
uint256 METHODOLOGY_DATA_OFFSET
```

The bit offset of the methodology data.




### VINTAGE_OFFSET

```solidity
uint256 VINTAGE_OFFSET
```

The bit offset of the vintage.




### COUNTRY_CODE_OFFSET

```solidity
uint256 COUNTRY_CODE_OFFSET
```

The bit offset of the country code.




### ADMIN1_CODE_OFFSET

```solidity
uint256 ADMIN1_CODE_OFFSET
```

The bit offset of the administrative region code.




### ADDRESS_OFFSET

```solidity
uint256 ADDRESS_OFFSET
```

The bit offset of the original supplier wallet address.




### SUBID_OFFSET

```solidity
uint256 SUBID_OFFSET
```

The bit offset of the sub-identifier.




### isCapitalized

```solidity
function isCapitalized(bytes2 characters) internal pure returns (bool valid)
```

Check whether the provided character bytes are capitalized.


| Name | Type | Description |
| ---- | ---- | ----------- |
| characters | bytes2 | the character bytes to check. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| valid | bool | True if the provided character bytes are capitalized, false otherwise. |

### validate

```solidity
function validate(struct DecodedRemovalIdV0 removal) internal pure
```

Validate the removal struct.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | struct DecodedRemovalIdV0 | The removal struct to validate. |


### createRemovalId

```solidity
function createRemovalId(struct DecodedRemovalIdV0 removal) internal pure returns (uint256)
```

Packs data about a removal into a 256-bit removal ID for the removal.

<i>Performs some possible validations on the data before attempting to create the ID.</i>

| Name | Type | Description |
| ---- | ---- | ----------- |
| removal | struct DecodedRemovalIdV0 | A removal in `DecodedRemovalIdV0` notation. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The removal ID. |

### decodeRemovalIdV0

```solidity
function decodeRemovalIdV0(uint256 removalId) internal pure returns (struct DecodedRemovalIdV0)
```

Unpacks a V0 removal ID into its component data.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal ID to unpack. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DecodedRemovalIdV0 | The removal ID in &#x60;DecodedRemovalIdV0&#x60; notation. |

### version

```solidity
function version(uint256 removalId) internal pure returns (uint8)
```

Extracts and returns the version field of a removal ID.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal ID to extract the version field from. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | The version field of the removal ID. |

### methodology

```solidity
function methodology(uint256 removalId) internal pure returns (uint8)
```

Extracts and returns the methodology field of a removal ID.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal ID to extract the methodology field from. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | The methodology field of the removal ID. |

### methodologyVersion

```solidity
function methodologyVersion(uint256 removalId) internal pure returns (uint8)
```

Extracts and returns the methodology version field of a removal ID.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal ID to extract the methodology version field from. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | The methodology version field of the removal ID. |

### vintage

```solidity
function vintage(uint256 removalId) internal pure returns (uint16)
```

Extracts and returns the vintage field of a removal ID.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal ID to extract the vintage field from. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint16 | The vintage field of the removal ID. |

### countryCode

```solidity
function countryCode(uint256 removalId) internal pure returns (bytes2)
```

Extracts and returns the country code field of a removal ID.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal ID to extract the country code field from. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes2 | The country code field of the removal ID. |

### subdivisionCode

```solidity
function subdivisionCode(uint256 removalId) internal pure returns (bytes2)
```

Extracts and returns the subdivision field of a removal ID.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal ID to extract the subdivision field from. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes2 | The subdivision field of the removal ID. |

### supplierAddress

```solidity
function supplierAddress(uint256 removalId) internal pure returns (address)
```

Extracts and returns the supplier address field of a removal ID.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal ID to extract the supplier address field from. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | The supplier address field of the removal ID. |

### subIdentifier

```solidity
function subIdentifier(uint256 removalId) internal pure returns (uint32)
```

Extract and returns the `subIdentifier` field of a removal ID.


| Name | Type | Description |
| ---- | ---- | ----------- |
| removalId | uint256 | The removal ID to extract the sub-identifier field from. |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint32 | The sub-identifier field of the removal ID. |



