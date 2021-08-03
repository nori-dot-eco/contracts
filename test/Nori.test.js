const { ethers, upgrades } = require('hardhat');

require('chai').should();

const setupTest = async () => {
  const Nori = await ethers.getContractFactory('Nori_V0');
  const nori = await upgrades.deployProxy(Nori, [], {
    initializer: 'initialize()',
  });
  await nori.deployed();
  return { nori };
};

describe('Nori_V0', (accounts) => {
  describe('contract behaviors', () => {
    describe('initialize', () => {
      it('should have been given a symbol', async () => {
        const { nori } = await setupTest();
        (await nori.symbol()).should.equal('NORI');
      });

      it('should have been given a name', async () => {
        const { nori } = await setupTest();
        (await nori.name()).should.equal('Nori');
      });

      it('should have granted the deployer the minter role', async () => {
        console.log('accounts', accounts);
        console.log((await ethers.getSigners())[0].address);

        const { nori } = await setupTest();
        (
          await nori.isMinter((await ethers.getSigners())[0].address)
        ).should.equal(true);
      });

      it('should have granted the deployer the pauser role', async () => {
        const { nori } = await setupTest();
        (
          await nori.isPauser((await ethers.getSigners())[0].address)
        ).should.equal(true);
      });

      it('should not be paused', async () => {
        const { nori } = await setupTest();
        (await nori.paused()).should.equal(false);
      });
    });
  });
});
