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
    it('should purchase removals and mint a certificate when there is enough supply in a single removal', async () => {
      const {
        contracts: { NORI, Removal, Certificate, FIFOMarket },
      } = await setupTest();
      const { supplier, buyer, noriWallet } = await hardhat.getNamedAccounts();

      const totalAvailableSupply = '100';
      const purchaseAmount = '1';
      const fee = '.15';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
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

      const initialFifoSupply = await FIFOMarket.numberOfTonnesInQueue();

      await NORI.connect(accounts[6]).send(
        FIFOMarket.address,
        hardhat.ethers.utils.parseUnits(totalPrice),
        hardhat.ethers.utils.hexZeroPad(buyer, 32)
      );

      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);
      const finalFifoSupply = await FIFOMarket.numberOfTonnesInQueue();

      expect(buyerFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(buyerInitialNoriBalance)
          .sub(hardhat.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await Certificate.balanceOf(buyer, 0)).to.equal(
        hardhat.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hardhat.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );
    });
    it('should purchase removals and mint a certificate when there is enough supply spanning multiple removals', async () => {
      const {
        contracts: { NORI, Removal, Certificate, FIFOMarket },
      } = await setupTest();
      const { supplier, buyer, noriWallet } = await hardhat.getNamedAccounts();

      const removalBalance1 = '3';
      const removalBalance2 = '3';
      const removalBalance3 = '4';
      const purchaseAmount = '10'; // purchase all supply
      const fee = '1.5';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await Promise.all([
        Removal.mintBatch(
          supplier,
          [
            hardhat.ethers.utils.parseUnits(removalBalance1),
            hardhat.ethers.utils.parseUnits(removalBalance2),
            hardhat.ethers.utils.parseUnits(removalBalance3),
          ],
          [2018, 2019, 2017],
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
        [0, 1, 2],
        [
          hardhat.ethers.utils.parseUnits(removalBalance1),
          hardhat.ethers.utils.parseUnits(removalBalance2),
          hardhat.ethers.utils.parseUnits(removalBalance3),
        ],
        hardhat.ethers.utils.formatBytes32String('0x0')
      );

      const initialFifoSupply = await FIFOMarket.numberOfTonnesInQueue();
      await NORI.connect(accounts[6]).send(
        FIFOMarket.address,
        hardhat.ethers.utils.parseUnits(totalPrice),
        hardhat.ethers.utils.hexZeroPad(buyer, 32)
      );
      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);
      const finalFifoSupply = await FIFOMarket.numberOfTonnesInQueue();

      expect(buyerFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(buyerInitialNoriBalance)
          .sub(hardhat.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await Certificate.balanceOf(buyer, 0)).to.equal(
        hardhat.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hardhat.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );
    });
    it('should correctly pay suppliers when multiple different suppliers removals are used to fulfill an order', async () => {
      const {
        contracts: { NORI, Removal, Certificate, FIFOMarket },
      } = await setupTest();
      const { supplier, supplier2, supplier3, buyer, noriWallet } =
        await hardhat.getNamedAccounts();

      const removalBalance1 = '3';
      const removalBalance2 = '3';
      const removalBalance3 = '4';
      const purchaseAmount = '10'; // purchase all supply
      const fee = '1.5';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const supplier2InitialNoriBalance = '0';
      const supplier3InitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await Promise.all([
        Removal.mintBatch(
          supplier,
          [hardhat.ethers.utils.parseUnits(removalBalance1)],
          [2018],
          hardhat.ethers.utils.formatBytes32String('0x0')
        ),
        Removal.mintBatch(
          supplier2,
          [hardhat.ethers.utils.parseUnits(removalBalance2)],
          [2018],
          hardhat.ethers.utils.formatBytes32String('0x0')
        ),
        Removal.mintBatch(
          supplier3,
          [hardhat.ethers.utils.parseUnits(removalBalance3)],
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
        [hardhat.ethers.utils.parseUnits(removalBalance1)],
        hardhat.ethers.utils.formatBytes32String('0x0')
      );
      await Removal.connect(accounts[3]).safeBatchTransferFrom(
        supplier2,
        FIFOMarket.address,
        [1],
        [hardhat.ethers.utils.parseUnits(removalBalance2)],
        hardhat.ethers.utils.formatBytes32String('0x0')
      );
      await Removal.connect(accounts[4]).safeBatchTransferFrom(
        supplier3,
        FIFOMarket.address,
        [2],
        [hardhat.ethers.utils.parseUnits(removalBalance3)],
        hardhat.ethers.utils.formatBytes32String('0x0')
      );

      const initialFifoSupply = await FIFOMarket.numberOfTonnesInQueue();

      await NORI.connect(accounts[6]).send(
        FIFOMarket.address,
        hardhat.ethers.utils.parseUnits(totalPrice),
        hardhat.ethers.utils.hexZeroPad(buyer, 32)
      );

      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const supplier2FinalNoriBalance = await NORI.balanceOf(supplier2);
      const supplier3FinalNoriBalance = await NORI.balanceOf(supplier3);

      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);
      const finalFifoSupply = await FIFOMarket.numberOfTonnesInQueue();

      expect(buyerFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(buyerInitialNoriBalance)
          .sub(hardhat.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits(removalBalance1, 18))
          .toString()
      );
      expect(supplier2FinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(supplier2InitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits(removalBalance2, 18))
          .toString()
      );
      expect(supplier3FinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(supplier3InitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits(removalBalance3, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await Certificate.balanceOf(buyer, 0)).to.equal(
        hardhat.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hardhat.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );
    });
  });

  describe('Unsuccessful purchases', () => {
    it('should revert when the queue is completely empty', async () => {
      const {
        contracts: { NORI, Removal, Certificate, FIFOMarket },
      } = await setupTest();
      const { supplier, buyer, noriWallet } = await hardhat.getNamedAccounts();

      const totalAvailableSupply = '100';
      const purchaseAmount = '1';
      const fee = '.15';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
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
          hardhat.ethers.utils.parseUnits(totalPrice),
          hardhat.ethers.utils.hexZeroPad(buyer, 32)
        );
      } catch (err) {
        assert(err);
      }

      // no balances should change and no certificate balance should be minted
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
      const purchaseAmount = '2';
      const fee = '.3';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
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
          hardhat.ethers.utils.parseUnits(totalPrice), // todo, perform fee calculation
          hardhat.ethers.utils.hexZeroPad(buyer, 32)
        );
      } catch (err) {
        assert(err);
      }

      // no balances should change and no certificate balance should be minted
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
  });
});

// TODO: check that removals are getting burned correctly?
