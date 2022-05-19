import type { BigNumberish } from 'ethers';
import { BigNumber } from 'ethers';

import { formatTokenAmount } from '@/utils/units';
import {
  expect,
  mockDepositNoriToPolygon,
  setupTest,
  createRemovalTokenId,
} from '@/test/helpers';

const setupTestLocal = async (
  {
    buyerInitialBPNoriBalance = formatTokenAmount(1_000_000),
    removalDataToList = [],
  }: {
    buyerInitialBPNoriBalance?: BigNumberish;
    removalDataToList?: {
      amount: number;
      vintage?: number;
      supplier?: string;
    }[];
  } = {
    buyerInitialBPNoriBalance: formatTokenAmount(1_000_000),
    removalDataToList: [],
  }
): Promise<
  Awaited<ReturnType<typeof setupTest>> & { listedRemovalIds: BigNumber[] }
> => {
  const { hre, contracts, removal, fifoMarket, ...rest } = await setupTest();
  let tokenIds: BigNumber[] = [];
  if (removalDataToList.length > 0) {
    const { supplier } = hre.namedAccounts;
    const defaultStartingVintage = 2016;
    tokenIds = await Promise.all(
      removalDataToList.map((removalData, index) => {
        return createRemovalTokenId(removal, {
          supplierAddress: removalData.supplier ?? supplier,
          vintage: removalData.vintage ?? defaultStartingVintage + index,
        });
      })
    );
    const removalBalances = removalDataToList.map((removalData) =>
      hre.ethers.utils.parseUnits(removalData.amount.toString())
    );

    const packedData = hre.ethers.utils.defaultAbiCoder.encode(
      ['address', 'bool'],
      [fifoMarket.address, true]
    );
    await removal.mintBatch(supplier, removalBalances, tokenIds, packedData);
  }
  await mockDepositNoriToPolygon({
    hre,
    contracts,
    amount: buyerInitialBPNoriBalance,
    to: hre.namedAccounts.buyer,
    signer: hre.namedSigners.buyer,
  });
  return {
    hre,
    contracts,
    listedRemovalIds: tokenIds,
    removal,
    fifoMarket,
    ...rest,
  };
};

describe('FIFOMarket', () => {
  describe('initialization', () => {
    describe('roles', () => {
      for (const { role } of [
        { role: 'DEFAULT_ADMIN_ROLE' },
        { role: 'ALLOWLIST_ROLE' },
      ] as const) {
        it(`will assign the role ${role} to the deployer and set the DEFAULT_ADMIN_ROLE as the role admin`, async () => {
          const { fifoMarket, hre } = await setupTest();
          expect(
            await fifoMarket.hasRole(
              await fifoMarket[role](),
              hre.namedAccounts.admin
            )
          ).to.be.true;
          expect(await fifoMarket.getRoleAdmin(await fifoMarket[role]())).to.eq(
            await fifoMarket.DEFAULT_ADMIN_ROLE()
          );
          expect(
            await fifoMarket.getRoleMemberCount(await fifoMarket[role]())
          ).to.eq(1);
        });
      }
    });
  });
  describe('role access', () => {
    describe('DEFAULT_ADMIN_ROLE', () => {
      it(`accounts with the role "DEFAULT_ADMIN_ROLE" can set the priority restricted threshold while accounts without this role cannot`, async () => {
        const role = 'DEFAULT_ADMIN_ROLE';
        const accountWithRole = 'admin';
        const accountWithoutRole = 'buyer';
        const { fifoMarket, hre } = await setupTest();

        const { namedAccounts, namedSigners } = hre;
        const roleId = await fifoMarket[role]();
        expect(await fifoMarket.hasRole(roleId, namedAccounts[accountWithRole]))
          .to.be.true;

        const newThreshold = ethers.utils.parseUnits('100');

        expect(
          await fifoMarket
            .connect(namedSigners[accountWithRole])
            .setPriorityRestrictedThreshold(newThreshold)
        )
          .to.emit(fifoMarket, 'PriorityRestrictedThresholdSet')
          .withArgs(newThreshold);

        expect(await fifoMarket.priorityRestrictedThreshold()).to.equal(
          BigNumber.from(newThreshold)
        );

        await expect(
          fifoMarket
            .connect(namedSigners[accountWithoutRole])
            .setPriorityRestrictedThreshold(newThreshold)
        ).to.be.revertedWith(
          `AccessControl: account ${namedAccounts[
            accountWithoutRole
          ].toLowerCase()} is missing role ${roleId}`
        );
      });
    });
    describe('ALLOWLIST_ROLE', () => {
      it(`accounts with the role "ALLOWLIST_ROLE" can purchase supply when inventory is below threshold while accounts without this role cannot`, async () => {
        const role = 'ALLOWLIST_ROLE';
        const accountWithRole = 'admin';
        const accountWithoutRole = 'buyer';
        const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
        const totalAvailableSupply = 50;
        const { bpNori, fifoMarket, hre } = await setupTestLocal({
          buyerInitialBPNoriBalance,
          removalDataToList: [{ amount: totalAvailableSupply }],
        });
        const { namedAccounts, namedSigners } = hre;
        const { buyer } = hre.namedAccounts;

        const priorityRestrictedThreshold = '100';

        await fifoMarket.setPriorityRestrictedThreshold(
          ethers.utils.parseUnits(priorityRestrictedThreshold)
        );

        await expect(
          bpNori
            .connect(namedSigners[accountWithoutRole])
            .send(
              fifoMarket.address,
              hre.ethers.utils.parseUnits(totalAvailableSupply.toString()),
              hre.ethers.utils.hexZeroPad(buyer, 32)
            )
        ).to.be.revertedWith('Low supply and buyer not on allowlist');

        const roleId = await fifoMarket[role]();
        expect(
          await fifoMarket.hasRole(roleId, namedAccounts[accountWithoutRole])
        ).to.be.false;
        expect(await fifoMarket.hasRole(roleId, namedAccounts[accountWithRole]))
          .to.be.true;

        await expect(
          bpNori
            .connect(namedSigners[accountWithRole])
            .send(
              fifoMarket.address,
              hre.ethers.utils.parseUnits(totalAvailableSupply.toString()),
              hre.ethers.utils.hexZeroPad(buyer, 32)
            )
        ).not.to.be.reverted;
      });
    });
  });
  describe('inventory inspection', () => {
    describe('nextRemovalForSale', () => {
      describe('when there is no inventory', () => {
        it('should return 0', async () => {
          const { fifoMarket } = await setupTest();
          expect(await fifoMarket.nextRemovalForSale(true)).to.equal(
            BigNumber.from(0)
          );
        });
        it('should have defined behavior if there are multiple removals and all of them were purchased', async () => {
          const { bpNori, fifoMarket, hre } = await setupTestLocal({
            removalDataToList: [{ amount: 5 }, { amount: 5 }, { amount: 5 }],
          });
          const { buyer } = hre.namedAccounts;
          const purchaseAmount = 15; // purchase all removals
          const fee = 2.25;
          const totalPrice = purchaseAmount + fee;

          await bpNori
            .connect(hre.namedSigners.buyer)
            .send(
              fifoMarket.address,
              hre.ethers.utils.parseUnits(totalPrice.toString()),
              hre.ethers.utils.hexZeroPad(buyer, 32)
            );
          expect(await fifoMarket.nextRemovalForSale(true)).to.equal(
            BigNumber.from(0)
          );
        });
      });
      describe('when inventory is above priority restricted threshold', () => {
        it('should correctly report the next removal for sale', async () => {
          const { fifoMarket, listedRemovalIds } = await setupTestLocal({
            removalDataToList: [{ amount: 100 }],
          });
          // exclude restricted supply to make sure we still see a removal id returned
          expect(await fifoMarket.nextRemovalForSale(false)).to.equal(
            listedRemovalIds[0]
          );
        });
        it('should correctly report the next removal for sale if there are multiple removals and some were purchased', async () => {
          const { bpNori, fifoMarket, hre, listedRemovalIds } =
            await setupTestLocal({
              removalDataToList: [{ amount: 5 }, { amount: 5 }, { amount: 5 }],
            });
          const { buyer } = hre.namedAccounts;
          const purchaseAmount = '10'; // purchase first two removals
          const fee = '1.5';
          const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

          await bpNori
            .connect(hre.namedSigners.buyer)
            .send(
              fifoMarket.address,
              hre.ethers.utils.parseUnits(totalPrice),
              hre.ethers.utils.hexZeroPad(buyer, 32)
            );
          // exclude restricted supply to make sure we still see a removal id returned
          expect(await fifoMarket.nextRemovalForSale(false)).to.equal(
            listedRemovalIds[2]
          );
        });
      });
      describe('when inventory is below priority restricted threshold', () => {
        it('should report the next removal for sale if including restricted supply', async () => {
          const priorityThreshold = '200';
          const totalInventory = 100;
          const { fifoMarket, listedRemovalIds } = await setupTestLocal({
            removalDataToList: [{ amount: totalInventory }],
          });
          await fifoMarket.setPriorityRestrictedThreshold(
            ethers.utils.parseUnits(priorityThreshold)
          );
          expect(await fifoMarket.nextRemovalForSale(true)).to.equal(
            listedRemovalIds[0]
          );
        });
        it('should return 0 if excluding restricted supply', async () => {
          const priorityThreshold = '200';
          const totalInventory = 100;
          const { fifoMarket } = await setupTestLocal({
            removalDataToList: [{ amount: totalInventory }],
          });
          await fifoMarket.setPriorityRestrictedThreshold(
            ethers.utils.parseUnits(priorityThreshold)
          );
          expect(await fifoMarket.nextRemovalForSale(false)).to.equal(
            BigNumber.from(0)
          );
        });
      });
    });

    describe('totalSupply and numberOfNrtsInQueueComputed', () => {
      it('should correctly report the number of NRTs for sale when there are multiple removals in inventory', async () => {
        const removalDataToList = [{ amount: 3 }, { amount: 3 }, { amount: 4 }];
        const { fifoMarket } = await setupTestLocal({
          removalDataToList,
        });

        const expectedTotalSupply = removalDataToList
          .reduce(
            (a, b) => {
              return { amount: a.amount + b.amount };
            },
            { amount: 0 }
          )
          .amount.toString();
        const [nrtsInQueueWeiComputed, totalSupplyWeiRetrieved] =
          await Promise.all([
            fifoMarket.numberOfNrtsInQueueComputed(),
            fifoMarket.totalSupply(),
          ]);
        expect(nrtsInQueueWeiComputed.toString()).to.equal(
          ethers.utils.parseUnits(
            BigNumber.from(expectedTotalSupply).toString()
          )
        );
        expect(totalSupplyWeiRetrieved).to.equal(nrtsInQueueWeiComputed);
      });
      it('should correctly report the number of NRTs for sale when there are multiple removals in inventory and some were purchased', async () => {
        const removalDataToList = [{ amount: 5 }, { amount: 5 }, { amount: 5 }];
        const { bpNori, fifoMarket, hre } = await setupTestLocal({
          removalDataToList,
        });
        const { buyer } = hre.namedAccounts;
        const purchaseAmount = 10; // purchase first two removals
        const fee = 1.5;
        const totalPrice = (purchaseAmount + fee).toString();

        await bpNori
          .connect(hre.namedSigners.buyer)
          .send(
            fifoMarket.address,
            hre.ethers.utils.parseUnits(totalPrice),
            hre.ethers.utils.hexZeroPad(buyer, 32)
          );
        const expectedRemainingSupply =
          removalDataToList.reduce(
            (a, b) => {
              return { amount: a.amount + b.amount };
            },
            { amount: 0 }
          ).amount - purchaseAmount;
        const [nrtsInQueueWeiComputed, totalSupplyWeiRetrieved] =
          await Promise.all([
            fifoMarket.numberOfNrtsInQueueComputed(),
            fifoMarket.totalSupply(),
          ]);
        expect(totalSupplyWeiRetrieved).to.equal(
          BigNumber.from(
            hre.ethers.utils.parseUnits(expectedRemainingSupply.toString())
          )
        );
        expect(totalSupplyWeiRetrieved).to.equal(nrtsInQueueWeiComputed);
      });
      it('should correctly report the number of NRTs for sale when there is no inventory', async () => {
        const { fifoMarket } = await setupTestLocal({});
        expect(await fifoMarket.numberOfNrtsInQueueComputed()).to.equal(
          BigNumber.from(0)
        );
        expect(await fifoMarket.totalSupply()).to.equal(BigNumber.from(0));
      });
    });
    describe('totalUnrestrictedSupply', () => {
      it('should return 0 when there is inventory but it is below the priority restricted threshold', async () => {
        const priorityThreshold = 200;
        const totalInventory = 100;
        const { fifoMarket } = await setupTestLocal({
          removalDataToList: [{ amount: totalInventory }],
        });
        await fifoMarket.setPriorityRestrictedThreshold(
          ethers.utils.parseUnits(priorityThreshold.toString())
        );
        expect(await fifoMarket.totalUnrestrictedSupply()).to.equal(
          BigNumber.from(0)
        );
      });
      it('should return the unrestricted portion of supply when inventory is above the priority restricted threshold', async () => {
        const priorityThreshold = 200;
        const totalInventory = 300;
        const { fifoMarket } = await setupTestLocal({
          removalDataToList: [{ amount: totalInventory }],
        });
        await fifoMarket.setPriorityRestrictedThreshold(
          ethers.utils.parseUnits(priorityThreshold.toString())
        );
        const expectedTotalUnrestrictedSupply =
          totalInventory - priorityThreshold;
        expect(await fifoMarket.totalUnrestrictedSupply()).to.equal(
          BigNumber.from(
            ethers.utils.parseUnits(expectedTotalUnrestrictedSupply.toString())
          )
        );
      });
    });
  });
  describe('Successful purchases', () => {
    it('should purchase removals and mint a certificate when there is enough supply in a single removal', async () => {
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const totalAvailableSupply = 100;
      const { bpNori, certificate, fifoMarket, hre } = await setupTestLocal({
        buyerInitialBPNoriBalance,
        removalDataToList: [{ amount: totalAvailableSupply }],
      });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const purchaseAmount = '1';
      const fee = '.15';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueueComputed();

      await bpNori
        .connect(hre.namedSigners.buyer)
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );

      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueueComputed();

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance
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
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const { bpNori, certificate, fifoMarket, hre } = await setupTestLocal({
        buyerInitialBPNoriBalance,
        removalDataToList: [{ amount: 3 }, { amount: 3 }, { amount: 4 }],
      });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const purchaseAmount = '10'; // purchase all supply
      const fee = '1.5';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueueComputed();
      expect(initialFifoSupply).to.equal(hre.ethers.utils.parseUnits('10'));
      await bpNori
        .connect(hre.namedSigners.buyer)
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );
      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueueComputed();

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance
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
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const numberOfRemovalsToCreate = 100;
      const removalDataToList = [
        ...Array.from({ length: numberOfRemovalsToCreate }).keys(),
      ].map((_) => {
        return { amount: 50 };
      });
      const { bpNori, certificate, fifoMarket, hre } = await setupTestLocal({
        buyerInitialBPNoriBalance,
        removalDataToList,
      });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const purchaseAmount = '5000'; // purchase all supply
      const fee = '750';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueueComputed();
      await bpNori
        .connect(hre.namedSigners.buyer)
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(buyer, 32)
        );
      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueueComputed();

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance
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
    it('should purchase removals and mint a certificate for a small purchase spanning several removals after another purchase has already been made', async () => {
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const { bpNori, certificate, fifoMarket, hre } = await setupTestLocal({
        buyerInitialBPNoriBalance,
        removalDataToList: [
          { amount: 3 },
          { amount: 3 },
          { amount: 4 },
          { amount: 3 },
          { amount: 3 },
          { amount: 4 },
        ],
      });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const purchaseAmount = '10';
      const fee = '1.5';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const doublePurchaseAmount = '20';
      const doubleFee = '3';
      const doubleTotalPrice = (Number(totalPrice) * 2).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueueComputed();
      expect(initialFifoSupply).to.equal(hre.ethers.utils.parseUnits('20'));
      const purchaseNrts = async () =>
        await bpNori
          .connect(hre.namedSigners.buyer)
          .send(
            fifoMarket.address,
            hre.ethers.utils.parseUnits(totalPrice),
            hre.ethers.utils.hexZeroPad(buyer, 32)
          );
      await purchaseNrts(); // deplete some of the stock (ids 0,1,2)
      await purchaseNrts(); // purchase more removals (ids 3,4,5-- tests non-zero-indexed purchases in the queue)
      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);
      const finalFifoSupply = await fifoMarket.numberOfNrtsInQueueComputed();

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance
          .sub(hre.ethers.utils.parseUnits(doubleTotalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(doublePurchaseAmount, 18))
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(doubleFee, 18))
          .toString()
      );

      expect(await certificate.balanceOf(buyer, 1)).to.equal(
        hre.ethers.utils.parseUnits(purchaseAmount, 18)
      );

      expect(finalFifoSupply).to.equal(
        initialFifoSupply
          .sub(hre.ethers.utils.parseUnits(doublePurchaseAmount, 18))
          .toString()
      );
    });
    it('should correctly pay suppliers when multiple different suppliers removals are used to fulfill an order', async () => {
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const removalDataToList = [
        { amount: 3, supplier: hre.namedAccounts.supplier },
        { amount: 3, supplier: hre.namedAccounts.investor1 },
        { amount: 4, supplier: hre.namedAccounts.investor2 },
      ];
      const { bpNori, certificate, fifoMarket } = await setupTestLocal({
        buyerInitialBPNoriBalance,
        removalDataToList,
      });

      const purchaseAmount = '10'; // purchase all supply
      const fee = '1.5';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const investor1InitialNoriBalance = '0';
      const investor2InitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      const initialFifoSupply = await fifoMarket.numberOfNrtsInQueueComputed();

      await bpNori
        .connect(hre.namedSigners.buyer)
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(hre.namedAccounts.buyer, 32)
        );

      const [
        buyerFinalNoriBalance,
        supplierFinalNoriBalance,
        investor1FinalNoriBalance,
        investor2FinalNoriBalance,
        noriFinalNoriBalance,
        finalFifoSupply,
      ] = await Promise.all([
        bpNori.balanceOf(hre.namedAccounts.buyer),
        bpNori.balanceOf(hre.namedAccounts.supplier),
        bpNori.balanceOf(hre.namedAccounts.investor1),
        bpNori.balanceOf(hre.namedAccounts.investor2),
        bpNori.balanceOf(hre.namedAccounts.noriWallet),
        fifoMarket.numberOfNrtsInQueueComputed(),
      ]);

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance
          .sub(hre.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );

      expect(supplierFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(supplierInitialNoriBalance)
          .add(
            hre.ethers.utils.parseUnits(
              removalDataToList[0].amount.toString(),
              18
            )
          )
          .toString()
      );
      expect(investor1FinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(investor1InitialNoriBalance)
          .add(
            hre.ethers.utils.parseUnits(
              removalDataToList[1].amount.toString(),
              18
            )
          )
          .toString()
      );
      expect(investor2FinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(investor2InitialNoriBalance)
          .add(
            hre.ethers.utils.parseUnits(
              removalDataToList[2].amount.toString(),
              18
            )
          )
          .toString()
      );

      expect(noriFinalNoriBalance).to.equal(
        hre.ethers.utils
          .parseUnits(noriInitialNoriBalance)
          .add(hre.ethers.utils.parseUnits(fee, 18))
          .toString()
      );

      expect(await certificate.balanceOf(hre.namedAccounts.buyer, 0)).to.equal(
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
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const { bpNori, certificate, fifoMarket, hre } = await setupTestLocal({
        buyerInitialBPNoriBalance,
      });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const purchaseAmount = '1';
      const fee = '.15';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await expect(
        bpNori
          .connect(hre.namedSigners.buyer)
          .send(
            fifoMarket.address,
            hre.ethers.utils.parseUnits(totalPrice),
            hre.ethers.utils.hexZeroPad(buyer, 32)
          )
      ).to.be.revertedWith('Market: Out of stock');

      // no balances should change and no certificate balance should be minted
      const [
        buyerFinalNoriBalance,
        supplierFinalNoriBalance,
        noriFinalNoriBalance,
      ] = await Promise.all([
        bpNori.balanceOf(buyer),
        bpNori.balanceOf(supplier),
        bpNori.balanceOf(noriWallet),
      ]);

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance.toString()
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
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const { bpNori, certificate, fifoMarket, hre } = await setupTestLocal({
        buyerInitialBPNoriBalance,
        removalDataToList: [{ amount: 1 }],
      });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const purchaseAmount = '2';
      const fee = '.3';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await expect(
        bpNori.connect(hre.namedSigners.buyer).send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice), // todo, perform fee calculation
          hre.ethers.utils.hexZeroPad(buyer, 32)
        )
      ).to.be.revertedWith('Market: Not enough supply');

      // no balances should change and no certificate balance should be minted
      const [
        buyerFinalNoriBalance,
        supplierFinalNoriBalance,
        noriFinalNoriBalance,
      ] = await Promise.all([
        bpNori.balanceOf(buyer),
        bpNori.balanceOf(supplier),
        bpNori.balanceOf(noriWallet),
      ]);

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance.toString()
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
    it('should revert when a removal with an amount of 0 is used', async () => {
      const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
      const { bpNori, certificate, fifoMarket, hre } = await setupTestLocal({
        buyerInitialBPNoriBalance,
        removalDataToList: [{ amount: 1 }, { amount: 0 }, { amount: 2 }],
      });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const purchaseAmount = '3';
      const fee = '.3';
      const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

      const supplierInitialNoriBalance = '0';
      const noriInitialNoriBalance = '0';

      await expect(
        bpNori.connect(hre.namedSigners.buyer).send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice), // todo, perform fee calculation
          hre.ethers.utils.hexZeroPad(buyer, 32)
        )
      ).to.be.reverted;

      // no balances should change and no certificate balance should be minted
      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance.toString()
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
