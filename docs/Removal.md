## Removal

---

### BatchMintRemovalsData

```solidity
struct BatchMintRemovalsData {
  address marketAddress;
  bool list;
}

```

### \_tokenIdCounter

```solidity
uint256 _tokenIdCounter
```

### name

```solidity
string name
```

### indexToTokenId

```solidity
mapping(uint256 &#x3D;&gt; uint256) indexToTokenId
```

### \_tokenIdExists

```solidity
mapping(uint256 &#x3D;&gt; bool) _tokenIdExists
```

### initialize

```solidity
function initialize() public virtual
```

### setApprovalForAll

```solidity
function setApprovalForAll(address owner, address operator, bool approved) public virtual
```

_See {IERC1155-setApprovalForAll}._

### createRemovalId

```solidity
function createRemovalId(bytes removalData) public pure returns (uint256)
```

Packs data about a removal into a 256-bit token id for the removal.

_Performs some possible validations on the data before attempting to create the id._

| Name        | Type  | Description                                                             |
| ----------- | ----- | ----------------------------------------------------------------------- |
| removalData | bytes | removal data encoded as bytes, with the first byte storing the version. |

### decodeRemovalIdV0

```solidity
function decodeRemovalIdV0(uint256 removalId) public pure returns (struct DecodedRemovalIdV0)
```

Unpacks a V0 removal id into its component data.

### mintBatch

```solidity
function mintBatch(address to, uint256[] amounts, uint256[] ids, bytes data) public
```

_mints multiple removals at once (for a single supplier).
If &#x60;list&#x60; is true in the decoded BatchMintRemovalsData, also lists those removals for sale in the market.
amounts: [100 * (10 ** 18), 10 * (10 ** 18), 50 * (10 ** 18)] &lt;- 100 tonnes, 10 tonnes, 50 tonnes in standard erc20 units (wei)
token id 0 URI points to vintage information (e.g., 2018) nori.com/api/removal/0 -&gt; { amount: 100, supplier: 1, vintage: 2018, ... }
token id 1 URI points to vintage information (e.g., 2019) nori.com/api/removal/1 -&gt; { amount: 10, supplier: 1, vintage: 2019, ... }
token id 2 URI points to vintage information (e.g., 2020) nori.com/api/removal/2 -&gt; { amount: 50, supplier: 1, vintage: 2020, ... }_

| Name    | Type      | Description                                                                                                                                                                                                              |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| to      | address   | The supplier address                                                                                                                                                                                                     |
| amounts | uint256[] | Each removal&#x27;s tonnes of CO2 formatted as wei                                                                                                                                                                       |
| ids     | uint256[] | The token ids to use for this batch of removals. The id itself encodes the supplier&#x27;s ethereum address, a parcel identifier, the vintage, country code, state code, methodology identifer, and methodology version. |
| data    | bytes     | Encodes the market contract address and a unique identifier for the parcel from whence these removals came.                                                                                                              |

### safeBatchTransferFrom

```solidity
function safeBatchTransferFrom(address _from, address _to, uint256[] _ids, uint256[] _amounts, bytes _data) public
```

_used to initiate a sale of removals by transferring the removals to the market contract_

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

### \_beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256[] ids, uint256[] amounts, bytes data) internal
```

## Removal

---

### BatchMintRemovalsData

```solidity
struct BatchMintRemovalsData {
  address marketAddress;
  bool list;
}

```

### \_tokenIdCounter

```solidity
uint256 _tokenIdCounter
```

### name

```solidity
string name
```

### indexToTokenId

```solidity
mapping(uint256 &#x3D;&gt; uint256) indexToTokenId
```

### \_tokenIdExists

```solidity
mapping(uint256 &#x3D;&gt; bool) _tokenIdExists
```

### initialize

```solidity
function initialize() public virtual
```

### setApprovalForAll

```solidity
function setApprovalForAll(address owner, address operator, bool approved) public virtual
```

_See {IERC1155-setApprovalForAll}._

### createRemovalId

```solidity
function createRemovalId(bytes removalData) public pure returns (uint256)
```

Packs data about a removal into a 256-bit token id for the removal.

_Performs some possible validations on the data before attempting to create the id._

| Name        | Type  | Description                                                             |
| ----------- | ----- | ----------------------------------------------------------------------- |
| removalData | bytes | removal data encoded as bytes, with the first byte storing the version. |

### decodeRemovalIdV0

```solidity
function decodeRemovalIdV0(uint256 removalId) public pure returns (struct DecodedRemovalIdV0)
```

Unpacks a V0 removal id into its component data.

### mintBatch

```solidity
function mintBatch(address to, uint256[] amounts, uint256[] ids, bytes data) public
```

_mints multiple removals at once (for a single supplier).
If &#x60;list&#x60; is true in the decoded BatchMintRemovalsData, also lists those removals for sale in the market.
amounts: [100 * (10 ** 18), 10 * (10 ** 18), 50 * (10 ** 18)] &lt;- 100 tonnes, 10 tonnes, 50 tonnes in standard erc20 units (wei)
token id 0 URI points to vintage information (e.g., 2018) nori.com/api/removal/0 -&gt; { amount: 100, supplier: 1, vintage: 2018, ... }
token id 1 URI points to vintage information (e.g., 2019) nori.com/api/removal/1 -&gt; { amount: 10, supplier: 1, vintage: 2019, ... }
token id 2 URI points to vintage information (e.g., 2020) nori.com/api/removal/2 -&gt; { amount: 50, supplier: 1, vintage: 2020, ... }_

| Name    | Type      | Description                                                                                                                                                                                                              |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| to      | address   | The supplier address                                                                                                                                                                                                     |
| amounts | uint256[] | Each removal&#x27;s tonnes of CO2 formatted as wei                                                                                                                                                                       |
| ids     | uint256[] | The token ids to use for this batch of removals. The id itself encodes the supplier&#x27;s ethereum address, a parcel identifier, the vintage, country code, state code, methodology identifer, and methodology version. |
| data    | bytes     | Encodes the market contract address and a unique identifier for the parcel from whence these removals came.                                                                                                              |

### safeBatchTransferFrom

```solidity
function safeBatchTransferFrom(address _from, address _to, uint256[] _ids, uint256[] _amounts, bytes _data) public
```

_used to initiate a sale of removals by transferring the removals to the market contract_

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

### \_beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address operator, address from, address to, uint256[] ids, uint256[] amounts, bytes data) internal
```

### balanceOfIds

```solidity
function balanceOfIds(address account, uint256[] ids) external view returns (uint256[])
```
