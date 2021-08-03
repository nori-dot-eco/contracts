const {
  makeInterfaceId: { ERC165: makeInterfaceId },
} = require('openzeppelin-test-helpers');

const INTERFACE_IDS = {
  ERC165: makeInterfaceId(['supportsInterface(bytes4)']),
  ERC721: makeInterfaceId([
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
  ERC721Enumerable: makeInterfaceId([
    'totalSupply()',
    'tokenOfOwnerByIndex(address,uint256)',
    'tokenByIndex(uint256)',
  ]),
  ERC721Metadata: makeInterfaceId(['name()', 'symbol()', 'tokenURI(uint256)']),
  ERC721Exists: makeInterfaceId(['exists(uint256)']),
};

const shouldSupportInterfaces = async (contract, interfaces = []) => {
  await Promise.all(
    interfaces.map(async (k) => {
      const interfaceId = INTERFACE_IDS[k];
      (await contract.supportsInterface(interfaceId)).should.equal(true);
    })
  );
};

module.exports = {
  shouldSupportInterfaces,
};
