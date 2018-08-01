const Web3 = require('web3');

const EIP820Registry = artifacts.require('./EIP820Registry.sol');
const FifoCrcMarketV0_1_1 = artifacts.require('./FifoCrcMarketV0_1_1.sol');

let registry;
let fifoCrcMarket;
let web3;
const EIP820RegistryTests = () => {
  before(async () => {
    registry = await EIP820Registry.new();
    fifoCrcMarket = await FifoCrcMarketV0_1_1.new();
    web3 = await new Web3();
  });
  // todo jaycen i dont think these tests are accurate (see multisig 820 tests for better examples?)
  contract('EIP820Registry', accounts => {
    describe('Check if FifoCrcMarket can implement ERC820', () => {
      it('should return a valid matching address', async () => {
        const interfaceHash = await registry.interfaceHash(
          'EIP777TokensRecipient'
        );
        assert.equal(interfaceHash, web3.sha3('EIP777TokensRecipient'));
        await registry.setInterfaceImplementer(
          accounts[0],
          interfaceHash,
          fifoCrcMarket.address,
          { from: accounts[0] }
        );
        const rImplementer = await registry.getInterfaceImplementer(
          accounts[0],
          interfaceHash
        );
        assert.equal(rImplementer, fifoCrcMarket.address);
      });
    });
  });
};

module.exports = {
  EIP820RegistryTests,
};
