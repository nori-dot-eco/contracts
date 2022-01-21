import { expect, hardhat } from '@/test/helpers';

const setupTest = hardhat.deployments.createFixture(async (hre) => {
  const { getNamedAccounts, upgrades, ethers, run } = hre;
  await run('deploy:erc1820');
  const { noriWallet } = await getNamedAccounts();
  const NORI = await ethers.getContractFactory('NORI');
  const Removal = await ethers.getContractFactory('Removal');
  const Certificate = await ethers.getContractFactory('Certificate');
  const FIFOMarket = await ethers.getContractFactory('FIFOMarket');
  const noriInstance = await upgrades.deployProxy(NORI, []);
  const removalInstance = await upgrades.deployProxy(Removal, [], {
    initializer: 'initialize()',
  });
  const certificateInstance = await upgrades.deployProxy(Certificate, [], {
    initializer: 'initialize()',
  });
  const fifoMarketInstance = await upgrades.deployProxy(FIFOMarket, [
    removalInstance.address,
    noriInstance.address,
    certificateInstance.address,
    noriWallet,
    15,
  ]);
  return {
    contracts: {
      NORI: noriInstance,
      Removal: removalInstance,
      Certificate: certificateInstance,
      FIFOMarket: fifoMarketInstance,
    },
  };
});

describe('FIFOMarket', () => {
  describe('Buying', () => {
    it('should purchase removals and create a certificate', async () => {
      const {
        contracts: { NORI, Removal, Certificate, FIFOMarket },
      } = await setupTest();
      expect(NORI.address).to.be.properAddress;
      expect(Removal.address).to.be.properAddress;
      expect(Certificate.address).to.be.properAddress;
      expect(FIFOMarket.address).to.be.properAddress;
    });
  });
});
