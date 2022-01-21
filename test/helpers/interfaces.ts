import { makeInterfaceId } from '@openzeppelin/test-helpers';
import type { Contract } from 'ethers';

import { expect } from '@/test/helpers';

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
};

export const shouldSupportInterfaces = async (
  contract: Contract,
  interfaces: (keyof typeof INTERFACE_IDS)[]
): Promise<void> => {
  await Promise.all(
    interfaces.map(async (k) => {
      const interfaceId = INTERFACE_IDS[k];
      expect(await contract.supportsInterface(interfaceId)).to.equal(true);
    })
  );
};
