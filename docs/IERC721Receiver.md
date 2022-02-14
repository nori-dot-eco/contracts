# IERC721Receiver



> ERC721 token receiver interface



*Interface for any contract that wants to support safeTransfers from ERC721 asset contracts.*

## Methods

### onERC721Received

```solidity
function onERC721Received(address operator, address from, uint256 tokenId, bytes data) external nonpayable returns (bytes4)
```

Handle the receipt of an NFT

*The ERC721 smart contract calls this function on the recipient after a `safeTransfer`. This function MUST return the function selector, otherwise the caller will revert the transaction. The selector to be returned can be obtained as `this.onERC721Received.selector`. This function MAY throw to revert and reject the transfer. Note: the ERC721 contract address is always the message sender.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| operator | address | The address which called `safeTransferFrom` function
| from | address | The address which previously owned the token
| tokenId | uint256 | The NFT identifier which is being transferred
| data | bytes | Additional data with no specified format

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes4 | undefined




