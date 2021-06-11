import { IERC165Instance } from '../../types/truffle-contracts';

const { makeInterfaceId } = require('@openzeppelin/test-helpers');
require('chai').should();

const INTERFACE_IDS = {
  ERC165: makeInterfaceId.ERC165(['supportsInterface(bytes4)']),
  ERC721: makeInterfaceId.ERC165([
    'balanceOf(address)',
    'ownerOf(uint256)',
    'approve(address,uint256)',
    'getApproved(uint256)',
    'setApprovalForAll(address,bool)',
    'isApprovedForAll(address,address)',
    'transferFrom(address,address,uint256)',
    'safeTransferFrom(address,address,uint256)',
    'safeTransferFrom(address,address,uint256,bytes)',
  ]),
  ERC721Enumerable: makeInterfaceId.ERC165([
    'totalSupply()',
    'tokenOfOwnerByIndex(address,uint256)',
    'tokenByIndex(uint256)',
  ]),
  ERC721Metadata: makeInterfaceId.ERC165([
    'name()',
    'symbol()',
    'tokenURI(uint256)',
  ]),
  ERC721Exists: makeInterfaceId.ERC165(['exists(uint256)']),
} as const;

export const shouldSupportInterfaces = async (
  contract: IERC165Instance,
  interfaces = [] as (keyof typeof INTERFACE_IDS)[]
) => {
  await Promise.all(
    interfaces.map(async (k) => {
      const interfaceId = INTERFACE_IDS[k];
      (await contract.methods.supportsInterface(interfaceId)).should.equal(
        true
      );
    })
  );
};
