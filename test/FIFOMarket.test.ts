import type {
  Certificate,
  Certificate__factory,
  FIFOMarket,
  FIFOMarket__factory,
  NORI,
  NORI__factory,
  Removal,
  Removal__factory,
} from '../typechain-types';

import { expect, hardhat } from '@/test/helpers';
import { assert } from 'console';
import { expectRevert } from '@openzeppelin/test-helpers';

const setupTest = hardhat.deployments.createFixture(async (hre) => {
  const { getNamedAccounts, upgrades, run, ethers } = hre;
  await run('deploy:erc1820');
  const { noriWallet } = await getNamedAccounts();
  const NORI = await ethers.getContractFactory<NORI__factory>('NORI');
  const Removal = await ethers.getContractFactory<Removal__factory>('Removal');
  const Certificate = await ethers.getContractFactory<Certificate__factory>(
    'Certificate'
  );
  const FIFOMarket = await ethers.getContractFactory<FIFOMarket__factory>(
    'FIFOMarket'
  );
  const noriInstance = await upgrades.deployProxy<NORI>(NORI, []);
  const removalInstance = await upgrades.deployProxy<Removal>(Removal, [], {
    initializer: 'initialize()',
  });
  const certificateInstance = await upgrades.deployProxy<Certificate>(
    Certificate,
    [],
    {
      initializer: 'initialize()',
    }
  );
  const fifoMarketInstance = await upgrades.deployProxy<FIFOMarket>(
    FIFOMarket,
    [
      removalInstance.address,
      noriInstance.address,
      certificateInstance.address,
      noriWallet,
      15,
    ],
    {
      initializer: 'initialize(address,address,address,address,uint256)',
    }
  );
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
  describe('Successful purchases', () => {
    it('should purchase removals and create a certificate when there is enough supply for sale', async () => {
      const {
        contracts: { NORI, Removal, Certificate, FIFOMarket },
      } = await setupTest();
      const { supplier, buyer, noriWallet } = await hardhat.getNamedAccounts();

      expect(NORI.address).to.be.properAddress;
      expect(Removal.address).to.be.properAddress;
      expect(Certificate.address).to.be.properAddress;
      expect(FIFOMarket.address).to.be.properAddress;

      const totalAvailableSupply = '100';
      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await Promise.all([
        Removal.mintBatch(
          supplier,
          [hardhat.ethers.utils.parseUnits(totalAvailableSupply)],
          [2018],
          hardhat.ethers.utils.formatBytes32String('0x0')
        ),
        NORI.mint(
          buyer,
          hardhat.ethers.utils.parseUnits(buyerInitialNoriBalance),
          hardhat.ethers.utils.formatBytes32String('0x0'),
          hardhat.ethers.utils.formatBytes32String('0x0')
        ),
        Certificate.addMinter(FIFOMarket.address),
      ]);
      const accounts = await hardhat.ethers.getSigners();
      await Removal.connect(accounts[2]).safeBatchTransferFrom(
        supplier,
        FIFOMarket.address,
        [0],
        [hardhat.ethers.utils.parseUnits(totalAvailableSupply)],
        hardhat.ethers.utils.formatBytes32String('0x0')
      );

      await NORI.connect(accounts[6]).send(
        FIFOMarket.address,
        hardhat.ethers.utils.parseUnits('1.15'),
        hardhat.ethers.utils.hexZeroPad(buyer, 32)
      );

      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);

      expect(buyerFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(buyerInitialNoriBalance)
          .sub(hardhat.ethers.utils.parseUnits('1.15', 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits('1', 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits('0.15', 18))
          .toString()
      );

      expect(await Certificate.balanceOf(buyer, 0)).to.equal(
        hardhat.ethers.utils.parseUnits('1', 18)
      );
    });
    // TODO Case: enough supply but spans multiple removals
  });

  describe('Unsuccessful purchases', () => {
    it('should revert when the queue is completely empty', async () => {
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
        NORI.mint(
          buyer,
          hardhat.ethers.utils.parseUnits(buyerInitialNoriBalance),
          hardhat.ethers.utils.formatBytes32String('0x0'),
          hardhat.ethers.utils.formatBytes32String('0x0')
        ),
        Certificate.addMinter(FIFOMarket.address),
      ]);
      const accounts = await hardhat.ethers.getSigners();

      try {
        await NORI.connect(accounts[6]).send(
          FIFOMarket.address,
          hardhat.ethers.utils.parseUnits('1.15'),
          hardhat.ethers.utils.hexZeroPad(buyer, 32)
        );
      } catch (err) {
        assert(err);
      }

      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);

      expect(buyerFinalNoriBalance).to.equal(
        hardhat.ethers.utils.parseUnits(buyerInitialNoriBalance).toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hardhat.ethers.utils.parseUnits(supplierInitialNoriBalance).toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hardhat.ethers.utils.parseUnits(noriInitialNoriBalance).toString()
      );

      expect(await Certificate.balanceOf(buyer, 0)).to.equal(
        hardhat.ethers.utils.parseUnits('0', 18)
      );
    });
    it('should revert when the non-empty queue does not have enough supply to fill the order', async () => {
      const {
        contracts: { NORI, Removal, Certificate, FIFOMarket },
      } = await setupTest();
      const { supplier, buyer, noriWallet } = await hardhat.getNamedAccounts();

      expect(NORI.address).to.be.properAddress;
      expect(Removal.address).to.be.properAddress;
      expect(Certificate.address).to.be.properAddress;
      expect(FIFOMarket.address).to.be.properAddress;

      const totalAvailableSupply = '1';
      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await Promise.all([
        Removal.mintBatch(
          supplier,
          [hardhat.ethers.utils.parseUnits(totalAvailableSupply)],
          [2018],
          hardhat.ethers.utils.formatBytes32String('0x0')
        ),
        NORI.mint(
          buyer,
          hardhat.ethers.utils.parseUnits(buyerInitialNoriBalance),
          hardhat.ethers.utils.formatBytes32String('0x0'),
          hardhat.ethers.utils.formatBytes32String('0x0')
        ),
        Certificate.addMinter(FIFOMarket.address),
      ]);
      const accounts = await hardhat.ethers.getSigners();
      await Removal.connect(accounts[2]).safeBatchTransferFrom(
        supplier,
        FIFOMarket.address,
        [0],
        [hardhat.ethers.utils.parseUnits(totalAvailableSupply)],
        hardhat.ethers.utils.formatBytes32String('0x0')
      );

      try {
        await NORI.connect(accounts[6]).send(
          FIFOMarket.address,
          hardhat.ethers.utils.parseUnits('2.30'), // todo, perform fee calculation
          hardhat.ethers.utils.hexZeroPad(buyer, 32)
        );
      } catch (err) {
        assert(err);
      }

      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);

      expect(buyerFinalNoriBalance).to.equal(
        hardhat.ethers.utils.parseUnits(buyerInitialNoriBalance).toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hardhat.ethers.utils.parseUnits(supplierInitialNoriBalance).toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hardhat.ethers.utils.parseUnits(noriInitialNoriBalance).toString()
      );

      expect(await Certificate.balanceOf(buyer, 0)).to.equal(
        hardhat.ethers.utils.parseUnits('0', 18)
      );
    });
    // TODO Case: non-empty queue, not enough supply
    // Question: what happens if you send 0 NORI to the FIFO?
  });
});
