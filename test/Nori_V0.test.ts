import { expect, hardhat } from '@/test/helpers';

const setupTest = hardhat.deployments.createFixture(async (hre) => {
  const { upgrades, ethers } = hre;
  const NoriV0 = await ethers.getContractFactory('Nori_V0');
  const noriV0 = await upgrades.deployProxy(NoriV0, [], {
    initializer: 'initialize()',
  });
  return { noriV0, hre };
});

describe('Nori_V0', () => {
  describe('contract behaviors', () => {
    describe('initialize', () => {
      it('should have been given a symbol', async () => {
        const { noriV0 } = await setupTest();
        expect(await noriV0.symbol()).to.equal('NORI');
      });

      it('should have been given a name', async () => {
        const { noriV0 } = await setupTest();
        expect(await noriV0.name()).to.equal('Nori');
      });

      it('should have granted the deployer the minter role', async () => {
        const { noriV0, hre } = await setupTest();
        expect(
          await noriV0.isMinter((await hre.ethers.getSigners())[0].address)
        ).to.equal(true);
      });

      it('should have granted the deployer the pauser role', async () => {
        const { noriV0, hre } = await setupTest();
        expect(
          await noriV0.isPauser((await hre.ethers.getSigners())[0].address)
        ).to.equal(true);
      });

      it('should not be paused', async () => {
        const { noriV0 } = await setupTest();
        expect(await noriV0.paused()).to.equal(false);
      });
    });
  });
});
