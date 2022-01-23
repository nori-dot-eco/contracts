import { ethers } from 'hardhat';
import { hexZeroPad } from 'ethers/lib/utils';

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
      const { supplier, buyer, noriWallet } = await hardhat.getNamedAccounts();

      expect(NORI.address).to.be.properAddress;
      expect(Removal.address).to.be.properAddress;
      expect(Certificate.address).to.be.properAddress;
      expect(FIFOMarket.address).to.be.properAddress;

      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await Promise.all([
        Removal.mintBatch(
          supplier,
          [ethers.utils.parseUnits('100')],
          [2018],
          ethers.utils.formatBytes32String('0x0')
        ),
        NORI.mint(
          buyer,
          ethers.utils.parseUnits(buyerInitialNoriBalance),
          ethers.utils.formatBytes32String('0x0'),
          ethers.utils.formatBytes32String('0x0')
        ),
        Certificate.addMinter(FIFOMarket.address),
      ]);
      const accounts = await ethers.getSigners();
      await Removal.connect(accounts[2]).safeBatchTransferFrom(
        supplier,
        FIFOMarket.address,
        [0],
        [ethers.utils.parseUnits('100')],
        ethers.utils.formatBytes32String('0x0')
      );

      await Certificate.connect(accounts[0]);
      await NORI.connect(accounts[6]).send(
        FIFOMarket.address,
        ethers.utils.parseUnits('1.15'),
        hexZeroPad(buyer, 32)
      );

      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);

      expect(buyerFinalNoriBalance).to.equal(
        ethers.utils
          .parseUnits(buyerInitialNoriBalance)
          .sub(ethers.utils.parseUnits('1.15', 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(ethers.utils.parseUnits('1', 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(ethers.utils.parseUnits('0.15', 18))
          .toString()
      );

      expect(await Certificate.balanceOf(buyer, 0)).to.equal(
        ethers.utils.parseUnits('1', 18)
      );
    });
  });
});
