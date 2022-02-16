import { assert } from 'console';

import type { Contracts } from '@/test/helpers';
import { expect, getDeployments } from '@/test/helpers';
import { hre } from '@/utils/hre';

const setupTest = hre.deployments.createFixture(
  async (): Promise<Contracts> => {
    await hre.deployments.fixture(); // ensure you start from a fresh deployments
    return getDeployments({ hre });
  }
);

describe('FIFOMarket', () => {
  describe('Successful purchases', () => {
    it('should purchase removals and mint a certificate when there is enough supply in a single removal', async () => {
      const { nori, removal, certificate, fifoMarket } = await setupTest();
      const { supplier, buyer, noriWallet } = await hre.getNamedAccounts();

      const totalAvailableSupply = '100';
      const purchaseAmount = '1';
      const fee = '.15';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await Promise.all([
        removal.mintBatch(
          supplier,
          [hre.ethers.utils.parseUnits(totalAvailableSupply)],
          [2018],
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        nori.mint(
          buyer,
          hre.ethers.utils.parseUnits(buyerInitialNoriBalance),
          hre.ethers.utils.formatBytes32String('0x0'),
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        certificate.addMinter(fifoMarket.address),
      ]);
      const accounts = await hre.ethers.getSigners();
      await removal
        .connect(accounts[2])
        .safeBatchTransferFrom(
          supplier,
          fifoMarket.address,
          [0],
          [hre.ethers.utils.parseUnits(totalAvailableSupply)],
          hre.ethers.utils.formatBytes32String('0x0')
        );

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      await nori
        .connect(accounts[6])
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );

      const buyerFinalNoriBalance = await nori.balanceOf(buyer);
      const supplierFinalNoriBalance = await nori.balanceOf(supplier);
      const noriFinalNoriBalance = await nori.balanceOf(noriWallet);
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      expect(buyerFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(buyerInitialNoriBalance)
          .sub(hre.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await certificate.balanceOf(buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );
    });
    it('should purchase removals and mint a certificate for a small purchase spanning several removals', async () => {
      const { nori, removal, certificate, fifoMarket } = await setupTest();
      const { supplier, buyer, noriWallet } = await hre.getNamedAccounts();

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
        removal.mintBatch(
          supplier,
          [
            hre.ethers.utils.parseUnits(removalBalance1),
            hre.ethers.utils.parseUnits(removalBalance2),
            hre.ethers.utils.parseUnits(removalBalance3),
          ],
          [2018, 2019, 2017],
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        nori.mint(
          buyer,
          hre.ethers.utils.parseUnits(buyerInitialNoriBalance),
          hre.ethers.utils.formatBytes32String('0x0'),
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        certificate.addMinter(fifoMarket.address),
      ]);
      const accounts = await hre.ethers.getSigners();
      await removal
        .connect(accounts[2])
        .safeBatchTransferFrom(
          supplier,
          fifoMarket.address,
          [0, 1, 2],
          [
            hre.ethers.utils.parseUnits(removalBalance1),
            hre.ethers.utils.parseUnits(removalBalance2),
            hre.ethers.utils.parseUnits(removalBalance3),
          ],
          hre.ethers.utils.formatBytes32String('0x0')
        );

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueue();
      expect(initialFifoSupply).to.equal(hre.ethers.utils.parseUnits('10'));
      await nori
        .connect(accounts[6])
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );
      const buyerFinalNoriBalance = await nori.balanceOf(buyer);
      const supplierFinalNoriBalance = await nori.balanceOf(supplier);
      const noriFinalNoriBalance = await nori.balanceOf(noriWallet);
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      expect(buyerFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(buyerInitialNoriBalance)
          .sub(hre.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await certificate.balanceOf(buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );
    });
    it('should purchase removals and mint a certificate for a large purchase spanning many removals', async () => {
      const { nori, removal, certificate, fifoMarket } = await setupTest();
      const { supplier, buyer, noriWallet } = await hre.getNamedAccounts();

      const removalBalances = [];
      const vintages = [];
      const tokenIds = [];
      for (let i = 0; i <= 20; i++) {
        removalBalances.push(hre.ethers.utils.parseUnits('50'));
        vintages.push(2018);
        tokenIds.push(i);
      }

      const purchaseAmount = '1000'; // purchase all supply
      const fee = '150';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await Promise.all([
        removal.mintBatch(
          supplier,
          removalBalances,
          vintages,
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        nori.mint(
          buyer,
          hre.ethers.utils.parseUnits(buyerInitialNoriBalance),
          hre.ethers.utils.formatBytes32String('0x0'),
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        certificate.addMinter(fifoMarket.address),
      ]);

      const accounts = await hre.ethers.getSigners();
      await removal
        .connect(accounts[2])
        .safeBatchTransferFrom(
          supplier,
          fifoMarket.address,
          tokenIds,
          removalBalances,
          hre.ethers.utils.formatBytes32String('0x0')
        );

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueue();
      await nori
        .connect(accounts[6])
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );
      const buyerFinalNoriBalance = await nori.balanceOf(buyer);
      const supplierFinalNoriBalance = await nori.balanceOf(supplier);
      const noriFinalNoriBalance = await nori.balanceOf(noriWallet);
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      expect(buyerFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(buyerInitialNoriBalance)
          .sub(hre.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await certificate.balanceOf(buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );
    });
    it('should correctly pay suppliers when multiple different suppliers removals are used to fulfill an order', async () => {
      const { nori, removal, certificate, fifoMarket } = await setupTest();
      const { supplier, investor1, investor2, buyer, noriWallet } =
        await hre.getNamedAccounts();

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

      await Promise.all([
        removal.mintBatch(
          supplier,
          [hre.ethers.utils.parseUnits(removalBalance1)],
          [2018],
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        removal.mintBatch(
          investor1,
          [hre.ethers.utils.parseUnits(removalBalance2)],
          [2018],
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        removal.mintBatch(
          investor2,
          [hre.ethers.utils.parseUnits(removalBalance3)],
          [2018],
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        nori.mint(
          buyer,
          hre.ethers.utils.parseUnits(buyerInitialNoriBalance),
          hre.ethers.utils.formatBytes32String('0x0'),
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        certificate.addMinter(fifoMarket.address),
      ]);

      const accounts = await hre.ethers.getSigners();

      await removal
        .connect(accounts[2])
        .safeBatchTransferFrom(
          supplier,
          fifoMarket.address,
          [0],
          [hre.ethers.utils.parseUnits(removalBalance1)],
          hre.ethers.utils.formatBytes32String('0x0')
        );
      await removal
        .connect(accounts[4])
        .safeBatchTransferFrom(
          investor1,
          fifoMarket.address,
          [1],
          [hre.ethers.utils.parseUnits(removalBalance2)],
          hre.ethers.utils.formatBytes32String('0x0')
        );
      await removal
        .connect(accounts[5])
        .safeBatchTransferFrom(
          investor2,
          fifoMarket.address,
          [2],
          [hre.ethers.utils.parseUnits(removalBalance3)],
          hre.ethers.utils.formatBytes32String('0x0')
        );

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      await nori
        .connect(accounts[6])
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );

      const buyerFinalNoriBalance = await nori.balanceOf(buyer);
      const supplierFinalNoriBalance = await nori.balanceOf(supplier);
      const investor1FinalNoriBalance = await nori.balanceOf(investor1);
      const investor2FinalNoriBalance = await nori.balanceOf(investor2);

      const noriFinalNoriBalance = await nori.balanceOf(noriWallet);
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueue();

      expect(buyerFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(buyerInitialNoriBalance)
          .sub(hre.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(removalBalance1, 18))
          .toString()
      );
      expect(investor1FinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(investor1InitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(removalBalance2, 18))
          .toString()
      );
      expect(investor2FinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(investor2InitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(removalBalance3, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await certificate.balanceOf(buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hre.ethers.utils.parseUnits(purchaseAmount, 18))
          .toString()
      );
    });
  });

  describe('Unsuccessful purchases', () => {
    it('should revert when the queue is completely empty', async () => {
      const { nori, certificate, fifoMarket } = await setupTest();
      const { supplier, buyer, noriWallet } = await hre.getNamedAccounts();

      const purchaseAmount = '1';
      const fee = '.15';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await Promise.all([
        nori.mint(
          buyer,
          hre.ethers.utils.parseUnits(buyerInitialNoriBalance),
          hre.ethers.utils.formatBytes32String('0x0'),
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        certificate.addMinter(fifoMarket.address),
      ]);
      const accounts = await hre.ethers.getSigners();

      try {
        await nori
          .connect(accounts[6])
          .send(
            fifoMarket.address,
            hre.ethers.utils.parseUnits(totalPrice),
            hre.ethers.utils.hexZeroPad(buyer, 32)
          );
      } catch (err) {
        assert(err);
      }

      // no balances should change and no certificate balance should be minted
      const buyerFinalNoriBalance = await nori.balanceOf(buyer);
      const supplierFinalNoriBalance = await nori.balanceOf(supplier);
      const noriFinalNoriBalance = await nori.balanceOf(noriWallet);

      expect(buyerFinalNoriBalance).to.equal(
        hre.ethers.utils.parseUnits(buyerInitialNoriBalance).toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils.parseUnits(supplierInitialNoriBalance).toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils.parseUnits(noriInitialNoriBalance).toString()
      );

      expect(await certificate.balanceOf(buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits('0', 18)
      );
    });
    it('should revert when the non-empty queue does not have enough supply to fill the order', async () => {
      const { nori, removal, certificate, fifoMarket } = await setupTest();
      const { supplier, buyer, noriWallet } = await hre.getNamedAccounts();

      const totalAvailableSupply = '1';
      const purchaseAmount = '2';
      const fee = '.3';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();
      const buyerInitialNoriBalance = '1000000';
      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await Promise.all([
        removal.mintBatch(
          supplier,
          [hre.ethers.utils.parseUnits(totalAvailableSupply)],
          [2018],
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        nori.mint(
          buyer,
          hre.ethers.utils.parseUnits(buyerInitialNoriBalance),
          hre.ethers.utils.formatBytes32String('0x0'),
          hre.ethers.utils.formatBytes32String('0x0')
        ),
        certificate.addMinter(fifoMarket.address),
      ]);
      const accounts = await hre.ethers.getSigners();
      await removal
        .connect(accounts[2])
        .safeBatchTransferFrom(
          supplier,
          fifoMarket.address,
          [0],
          [hre.ethers.utils.parseUnits(totalAvailableSupply)],
          hre.ethers.utils.formatBytes32String('0x0')
        );

      try {
        await nori.connect(accounts[6]).send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice), // todo, perform fee calculation
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );
      } catch (err) {
        assert(err);
      }

      // no balances should change and no certificate balance should be minted
      const buyerFinalNoriBalance = await nori.balanceOf(buyer);
      const supplierFinalNoriBalance = await nori.balanceOf(supplier);
      const noriFinalNoriBalance = await nori.balanceOf(noriWallet);

      expect(buyerFinalNoriBalance).to.equal(
        hre.ethers.utils.parseUnits(buyerInitialNoriBalance).toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils.parseUnits(supplierInitialNoriBalance).toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils.parseUnits(noriInitialNoriBalance).toString()
      );

      expect(await certificate.balanceOf(buyer, 0)).to.equal(
        hre.ethers.utils.parseUnits('0', 18)
      );
    });
  });
});

// TODO: check that removals are getting burned correctly?
