# IERC1820ImplementerUpgradeable







*Interface for an ERC1820 implementer, as defined in the https://eips.ethereum.org/EIPS/eip-1820#interface-implementation-erc1820implementerinterface[EIP]. Used by contracts that will be registered as implementers in the {IERC1820Registry}.*

## Methods

### canImplementInterfaceForAddress

```solidity
function canImplementInterfaceForAddress(bytes32 interfaceHash, address account) external view returns (bytes32)
```



*Returns a special value (`ERC1820_ACCEPT_MAGIC`) if this contract implements `interfaceHash` for `account`. See {IERC1820Registry-setInterfaceImplementer}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| interfaceHash | bytes32 | undefined
| account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined




