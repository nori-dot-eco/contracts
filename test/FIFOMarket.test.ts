import { assert } from 'console';

import type {
  NORI,
  Certificate,
  FIFOMarket,
  Removal,
  Certificate__factory,
  FIFOMarket__factory,
  NORI__factory,
  Removal__factory,
} from '../typechain-types';

import { expect, hardhat } from '@/test/helpers';

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
  await noriInstance.deployed();
  const removalInstance = await upgrades.deployProxy<Removal>(Removal, [], {
    initializer: 'initialize()',
  });
  await removalInstance.deployed();
  const certificateInstance = await upgrades.deployProxy<Certificate>(
    Certificate,
    [],
    {
      initializer: 'initialize()',
    }
  );
  await certificateInstance.deployed();

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
  await fifoMarketInstance.deployed();

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

      const parcelIdentifier = hardhat.ethers.utils.formatBytes32String(
        'someParcelIdentifier'
      );
      const listNow = true;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes32', 'bool'],
        [FIFOMarket.address, parcelIdentifier, listNow]
      );

      await Promise.all([
        Removal.mintBatch(
          supplier,
          [hardhat.ethers.utils.parseUnits(totalAvailableSupply)],
          [2018],
          packedData
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

      const initialFifoSupply = await FIFOMarket.numberOfNrtsInQueue();

      await NORI.connect(accounts[6]).send(
        FIFOMarket.address,
        hardhat.ethers.utils.parseUnits(totalPrice),
        hardhat.ethers.utils.hexZeroPad(buyer, 32)
      );

      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);
      const finalFifoSupply = await FIFOMarket.numberOfNrtsInQueue();

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
    it('should purchase removals and mint a certificate for a small purchase spanning several removals', async () => {
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

      const parcelIdentifier = hardhat.ethers.utils.formatBytes32String(
        'someParcelIdentifier'
      );
      const listNow = true;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes32', 'bool'],
        [FIFOMarket.address, parcelIdentifier, listNow]
      );
      await Promise.all([
        Removal.mintBatch(
          supplier,
          [
            hardhat.ethers.utils.parseUnits(removalBalance1),
            hardhat.ethers.utils.parseUnits(removalBalance2),
            hardhat.ethers.utils.parseUnits(removalBalance3),
          ],
          [2018, 2019, 2017],
          packedData
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

      const initialFifoSupply = await FIFOMarket.numberOfNrtsInQueue();
      expect(initialFifoSupply).to.equal(hardhat.ethers.utils.parseUnits('10'));
      await NORI.connect(accounts[6]).send(
        FIFOMarket.address,
        hardhat.ethers.utils.parseUnits(totalPrice),
        hardhat.ethers.utils.hexZeroPad(buyer, 32)
      );
      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);
      const finalFifoSupply = await FIFOMarket.numberOfNrtsInQueue();

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
    it('should purchase removals and mint a certificate for a large purchase spanning many removals', async () => {
      const {
        contracts: { NORI, Removal, Certificate, FIFOMarket },
      } = await setupTest();
      const { supplier, buyer, noriWallet } = await hardhat.getNamedAccounts();

      const removalBalances = [];
      const vintages = [];
      const tokenIds = [];
      for (let i = 0; i <= 20; i++) {
        removalBalances.push(hardhat.ethers.utils.parseUnits('50'));
        vintages.push(2018);
        tokenIds.push(i);
      }

      const purchaseAmount = '1000'; // purchase all supply
      const fee = '150';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const parcelIdentifier = hardhat.ethers.utils.formatBytes32String(
        'someParcelIdentifier'
      );
      const listNow = true;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes32', 'bool'],
        [FIFOMarket.address, parcelIdentifier, listNow]
      );
      await Promise.all([
        Removal.mintBatch(supplier, removalBalances, vintages, packedData),
        NORI.mint(
          buyer,
          hardhat.ethers.utils.parseUnits(buyerInitialNoriBalance),
          hardhat.ethers.utils.formatBytes32String('0x0'),
          hardhat.ethers.utils.formatBytes32String('0x0')
        ),
        Certificate.addMinter(FIFOMarket.address),
      ]);

      const accounts = await hardhat.ethers.getSigners();

      const initialFifoSupply = await FIFOMarket.numberOfNrtsInQueue();
      await NORI.connect(accounts[6]).send(
        FIFOMarket.address,
        hardhat.ethers.utils.parseUnits(totalPrice),
        hardhat.ethers.utils.hexZeroPad(buyer, 32)
      );
      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);
      const finalFifoSupply = await FIFOMarket.numberOfNrtsInQueue();

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
      const { supplier, investor1, investor2, buyer, noriWallet } =
        await hardhat.getNamedAccounts();

      const removalBalance1 = '3';
      const removalBalance2 = '3';
      const removalBalance3 = '4';
      const purchaseAmount = '10'; // purchase all supply
      const fee = '1.5';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const investor1InitialNoriBalance = '0';
      const investor2InitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const parcelIdentifier = hardhat.ethers.utils.formatBytes32String(
        'someParcelIdentifier'
      );
      const listNow = true;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes32', 'bool'],
        [FIFOMarket.address, parcelIdentifier, listNow]
      );
      await Promise.all([
        Removal.mintBatch(
          supplier,
          [hardhat.ethers.utils.parseUnits(removalBalance1)],
          [2018],
          packedData
        ),
        Removal.mintBatch(
          investor1,
          [hardhat.ethers.utils.parseUnits(removalBalance2)],
          [2018],
          packedData
        ),
        Removal.mintBatch(
          investor2,
          [hardhat.ethers.utils.parseUnits(removalBalance3)],
          [2018],
          packedData
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

      const initialFifoSupply = await FIFOMarket.numberOfNrtsInQueue();

      await NORI.connect(accounts[6]).send(
        FIFOMarket.address,
        hardhat.ethers.utils.parseUnits(totalPrice),
        hardhat.ethers.utils.hexZeroPad(buyer, 32)
      );

      const buyerFinalNoriBalance = await NORI.balanceOf(buyer);
      const supplierFinalNoriBalance = await NORI.balanceOf(supplier);
      const investor1FinalNoriBalance = await NORI.balanceOf(investor1);
      const investor2FinalNoriBalance = await NORI.balanceOf(investor2);

      const noriFinalNoriBalance = await NORI.balanceOf(noriWallet);
      const finalFifoSupply = await FIFOMarket.numberOfNrtsInQueue();

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
      expect(investor1FinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(investor1InitialNoriBalance)
          .add(hardhat.ethers.utils.parseUnits(removalBalance2, 18))
          .toString()
      );
      expect(investor2FinalNoriBalance).to.equal(
        hardhat.ethers.utils
          .parseUnits(investor2InitialNoriBalance)
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
        contracts: { NORI, Certificate, FIFOMarket },
      } = await setupTest();
      const { supplier, buyer, noriWallet } = await hardhat.getNamedAccounts();

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

      const totalAvailableSupply = '1';
      const purchaseAmount = '2';
      const fee = '.3';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const parcelIdentifier = hardhat.ethers.utils.formatBytes32String(
        'someParcelIdentifier'
      );
      const listNow = true;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes32', 'bool'],
        [FIFOMarket.address, parcelIdentifier, listNow]
      );
      await Promise.all([
        Removal.mintBatch(
          supplier,
          [hardhat.ethers.utils.parseUnits(totalAvailableSupply)],
          [2018],
          packedData
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
