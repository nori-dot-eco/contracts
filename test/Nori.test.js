const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');

require('chai').should();

/** @type {import('web3')} */
const web3 = global.web3;
const Nori_V0 = Contracts.getFromLocal('Nori_V0');

Nori_V0.setProvider(web3.currentProvider);

contract('Nori_V0', accounts => {
  const from = accounts[0];

  describe('contract behaviors', () => {
    let nori;
    beforeEach(async () => {
      ZWeb3.initialize(web3.currentProvider);
      const project = await TestHelper();
      nori = await project.createProxy(Nori_V0, {
        initMethod: 'initialize',
        initArgs: [],
      });
      nori.setProvider(web3.currentProvider);
    });
    describe('initialize', () => {
      it('should have been given a symbol', async () => {
        (await nori.methods.symbol().call()).should.equal('NORI');
      });

      it('should have been given a name', async () => {
        (await nori.methods.name().call()).should.equal('Nori');
      });

      it('should have granted the deployer the minter role', async () => {
        (await nori.methods.isMinter(from).call()).should.equal(true);
      });

      it('should have granted the deployer the pauser role', async () => {
        (await nori.methods.isPauser(from).call()).should.equal(true);
      });

      it('should not be paused', async () => {
        (await nori.methods.paused().call()).should.equal(false);
      });
    });
  });
});
