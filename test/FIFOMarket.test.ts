import type { BigNumberish, ContractReceipt } from 'ethers';
import { BigNumber } from 'ethers';

import { formatTokenAmount } from '@/utils/units';
import type { RemovalDataForListing } from '@/test/helpers';
import {
  expect,
  setupTest,
  batchMintAndListRemovalsForSale,
  getTotalAmountOfSupply,
} from '@/test/helpers';

interface RemovalDataFromListing {
  listedRemovalIds: BigNumber[];
  totalAmountOfSupply: number;
  totalAmountOfSuppliers: number;
  totalAmountOfRemovals: number;
}

const setupTestLocal = async (options?: {
  buyerInitialBPNoriBalance?: BigNumberish;
  removalDataToList?: RemovalDataForListing[]; // todo userFixtures format
}): Promise<Awaited<ReturnType<typeof setupTest>> & RemovalDataFromListing> => {
  const {
    removalDataToList,
    buyerInitialBPNoriBalance,
  }: Parameters<typeof setupTestLocal>[0] = {
    buyerInitialBPNoriBalance:
      options?.buyerInitialBPNoriBalance ?? formatTokenAmount(1_000_000),
    removalDataToList: options?.removalDataToList ?? [],
  };
  const { hre, contracts, removal, fifoMarket, ...rest } = await setupTest({
    userFixtures: { buyer: { bpBalance: buyerInitialBPNoriBalance } },
  });
  let listedRemovalIds: BigNumber[] = [];
  let totalAmountOfSupply = 0;
  let totalAmountOfSuppliers = 0;
  let totalAmountOfRemovals = 0;
  if (removalDataToList.length > 0) {
    ({
      listedRemovalIds,
      totalAmountOfSupply,
      totalAmountOfRemovals,
      totalAmountOfSuppliers,
    } = await batchMintAndListRemovalsForSale({
      removalDataToList,
      removal,
      fifoMarket,
      hre,
    }));
  }
  return {
    hre,
    contracts,
    removal,
    fifoMarket,
    listedRemovalIds,
    totalAmountOfSupply,
    totalAmountOfSuppliers,
    totalAmountOfRemovals,
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
    it('correctly initializes totalActiveSupply, totalReservedSupply, totalNumberActiveRemovals, activeSupplierCount, and priorityRestrictedThreshold', async () => {
      const { fifoMarket } = await setupTestLocal();

      const [
        totalActiveSupply,
        totalReservedSupply,
        totalNumberActiveRemovals,
        activeSupplierCount,
        priorityRestrictedThreshold,
      ] = await Promise.all([
        fifoMarket.totalActiveSupply(),
        fifoMarket.totalReservedSupply(),
        fifoMarket.totalNumberActiveRemovals(),
        fifoMarket.activeSupplierCount(),
        fifoMarket.priorityRestrictedThreshold(),
      ]);

      expect(totalActiveSupply).to.equal(0);
      expect(totalReservedSupply).to.equal(0);
      expect(totalNumberActiveRemovals).to.equal(0);
      expect(activeSupplierCount).to.equal(0);
      expect(priorityRestrictedThreshold).to.equal(0);
    });
  });

  describe('role access', () => {
    describe('DEFAULT_ADMIN_ROLE', () => {
      it(`should allow accounts with the role "DEFAULT_ADMIN_ROLE" to set the priority restricted threshold while accounts without this role cannot`, async () => {
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
      it(`should allow allowlisted accounts to purchase supply when inventory is below threshold while accounts without this role cannot`, async () => {
        const role = 'ALLOWLIST_ROLE';
        const accountWithRole = 'admin';
        const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
        const totalAvailableSupply = 50;
        const { bpNori, fifoMarket, hre } = await setupTestLocal({
          buyerInitialBPNoriBalance,
          removalDataToList: [{ amount: totalAvailableSupply }],
        });
        const { namedAccounts, namedSigners } = hre;
        const priorityRestrictedThreshold = '100';
        await fifoMarket.setPriorityRestrictedThreshold(
          ethers.utils.parseUnits(priorityRestrictedThreshold)
        );
        const roleId = await fifoMarket[role]();
        expect(await fifoMarket.hasRole(roleId, namedAccounts[accountWithRole]))
          .to.be.true;
        await expect(
          bpNori
            .connect(namedSigners[accountWithRole])
            .send(
              fifoMarket.address,
              hre.ethers.utils.parseUnits(totalAvailableSupply.toString()),
              hre.ethers.utils.hexZeroPad(namedAccounts.buyer, 32)
            )
        ).not.to.be.reverted;
      });
      it(`should not allow accounts not on the allowlist to purchase supply when inventory is below threshold`, async () => {
        const role = 'ALLOWLIST_ROLE';
        const accountWithoutRole = 'buyer';
        const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
        const totalAvailableSupply = 50;
        const { bpNori, fifoMarket, hre } = await setupTestLocal({
          buyerInitialBPNoriBalance,
          removalDataToList: [{ amount: totalAvailableSupply }],
        });
        const { namedAccounts, namedSigners } = hre;
        const { buyer } = namedAccounts;
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
      });
    });
  });

  describe('inventory inspection', () => {
    // describe('nextRemovalForSale', () => {
    //   describe('when there is no inventory', () => {
    //     it('should return 0', async () => {
    //       const { fifoMarket } = await setupTest();
    //       expect(await fifoMarket.nextRemovalForSale(true)).to.equal(
    //         BigNumber.from(0)
    //       );
    //     });
    //     it('should have defined behavior if there are multiple removals and all of them were purchased', async () => {
    //       const { bpNori, fifoMarket, hre } = await setupTestLocal({
    //         removalDataToList: [{ amount: 5 }, { amount: 5 }, { amount: 5 }],
    //       });
    //       const { buyer } = hre.namedAccounts;
    //       const purchaseAmount = 15; // purchase all removals
    //       const fee = 2.25;
    //       const totalPrice = purchaseAmount + fee;

    //       await bpNori
    //         .connect(hre.namedSigners.buyer)
    //         .send(
    //           fifoMarket.address,
    //           hre.ethers.utils.parseUnits(totalPrice.toString()),
    //           hre.ethers.utils.hexZeroPad(buyer, 32)
    //         );
    //       expect(await fifoMarket.nextRemovalForSale(true)).to.equal(
    //         BigNumber.from(0)
    //       );
    //     });
    //   });
    //   describe('when inventory is above priority restricted threshold', () => {
    //     it('should correctly report the next removal for sale', async () => {
    //       const { fifoMarket, listedRemovalIds } = await setupTestLocal({
    //         removalDataToList: [{ amount: 100 }],
    //       });
    //       // exclude restricted supply to make sure we still see a removal id returned
    //       expect(await fifoMarket.nextRemovalForSale(false)).to.equal(
    //         listedRemovalIds[0]
    //       );
    //     });
    //     it('should correctly report the next removal for sale if there are multiple removals and some were purchased', async () => {
    //       const { bpNori, fifoMarket, hre, listedRemovalIds } =
    //         await setupTestLocal({
    //           removalDataToList: [{ amount: 5 }, { amount: 5 }, { amount: 5 }],
    //         });
    //       const { buyer } = hre.namedAccounts;
    //       const purchaseAmount = '10'; // purchase first two removals
    //       const fee = '1.5';
    //       const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

    //       await bpNori
    //         .connect(hre.namedSigners.buyer)
    //         .send(
    //           fifoMarket.address,
    //           hre.ethers.utils.parseUnits(totalPrice),
    //           hre.ethers.utils.hexZeroPad(buyer, 32)
    //         );
    //       // exclude restricted supply to make sure we still see a removal id returned
    //       expect(await fifoMarket.nextRemovalForSale(false)).to.equal(
    //         listedRemovalIds[2]
    //       );
    //     });
    //   });
    //   describe('when inventory is below priority restricted threshold', () => {
    //     it('should report the next removal for sale if including restricted supply', async () => {
    //       const priorityThreshold = '200';
    //       const totalInventory = 100;
    //       const { fifoMarket, listedRemovalIds } = await setupTestLocal({
    //         removalDataToList: [{ amount: totalInventory }],
    //       });
    //       await fifoMarket.setPriorityRestrictedThreshold(
    //         ethers.utils.parseUnits(priorityThreshold)
    //       );
    //       expect(await fifoMarket.nextRemovalForSale(true)).to.equal(
    //         listedRemovalIds[0]
    //       );
    //     });
    //     it('should return 0 if excluding restricted supply', async () => {
    //       const priorityThreshold = '200';
    //       const totalInventory = 100;
    //       const { fifoMarket } = await setupTestLocal({
    //         removalDataToList: [{ amount: totalInventory }],
    //       });
    //       await fifoMarket.setPriorityRestrictedThreshold(
    //         ethers.utils.parseUnits(priorityThreshold)
    //       );
    //       expect(await fifoMarket.nextRemovalForSale(false)).to.equal(
    //         BigNumber.from(0)
    //       );
    //     });
    //   });
    // });

    describe('totalSupply and numberOfActiveNrtsInMarketComputed', () => {
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
            fifoMarket.numberOfActiveNrtsInMarketComputed(),
            fifoMarket.totalActiveSupply(),
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
            fifoMarket.numberOfActiveNrtsInMarketComputed(),
            fifoMarket.totalActiveSupply(),
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
        expect(await fifoMarket.numberOfActiveNrtsInMarketComputed()).to.equal(
          BigNumber.from(0)
        );
        expect(await fifoMarket.totalActiveSupply()).to.equal(
          BigNumber.from(0)
        );
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

  describe('when listing supply in the market', () => {
    it('should update totalActiveSupply, totalNumberActiveRemovals, and activeSupplierCount when a new supplier is added', async () => {
      const removals = [{ amount: 100 }];
      const {
        fifoMarket,
        totalAmountOfSupply,
        totalAmountOfSuppliers,
        totalAmountOfRemovals,
      } = await setupTestLocal({
        removalDataToList: removals,
      });

      const [
        totalActiveSupply,
        totalNumberActiveRemovals,
        activeSupplierCount,
      ] = await Promise.all([
        fifoMarket.totalActiveSupply(),
        fifoMarket.totalNumberActiveRemovals(),
        fifoMarket.activeSupplierCount(),
      ]);

      expect(totalAmountOfSupply).to.be.greaterThan(0);
      expect(totalAmountOfRemovals).to.be.greaterThan(0);
      expect(totalAmountOfSuppliers).to.be.greaterThan(0);

      expect(totalActiveSupply).to.equal(
        formatTokenAmount(totalAmountOfSupply)
      );
      expect(totalNumberActiveRemovals.toNumber()).to.equal(
        totalAmountOfRemovals
      );
      expect(activeSupplierCount.toNumber()).to.equal(totalAmountOfSuppliers);
    });
    // TODO: Fix the already existing token IDs for this test
    // it('updates totalActiveSupply and totalNumberActiveRemovals when more removals are added for a supplier', async () => {
    //   const initialRemovals = [{ amount: 100 }];
    //   const { removal, fifoMarket } = await setupTestLocal({
    //     removalDataToList: initialRemovals,
    //   });

    //   const additionalRemovals = [{ amount: 100 }];

    //   await mintSupply(additionalRemovals, removal, fifoMarket);

    //   const totalAmountOfSupply = getTotalAmountOfSupply([
    //     ...initialRemovals,
    //     ...additionalRemovals,
    //   ]);

    //   const totalAmountOfRemovals = getTotalAmountOfRemovals([
    //     ...initialRemovals,
    //     ...additionalRemovals,
    //   ]);

    //   const totalAmountOfSuppliers = getTotalAmountOfSuppliers([
    //     ...initialRemovals,
    //     ...additionalRemovals,
    //   ]);

    //   const [
    //     totalActiveSupply,
    //     totalNumberActiveRemovals,
    //     activeSupplierCount,
    //   ] = await Promise.all([
    //     fifoMarket.totalActiveSupply(),
    //     fifoMarket.totalNumberActiveRemovals(),
    //     fifoMarket.activeSupplierCount(),
    //   ]);

    //   expect(totalActiveSupply).to.equal(
    //     formatTokenAmount(totalAmountOfSupply)
    //   );
    //   expect(totalNumberActiveRemovals).to.equal(
    //     formatTokenAmount(totalAmountOfRemovals)
    //   );
    //   expect(activeSupplierCount).to.equal(
    //     formatTokenAmount(totalAmountOfSuppliers)
    //   );
    // });
    // TODO: Also fix the already existing token IDs for this test
    // it('updates totalActiveSupply and totalNumberActiveRemovals, and activeSupplierCount when more removals are added for a supplier who has previously sold out', async () => {
    //   const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
    //   const initialRemovals = [{ amount: 1 }];
    //   const { bpNori, fifoMarket, removal, hre } = await setupTestLocal({
    //     buyerInitialBPNoriBalance,
    //     removalDataToList: initialRemovals,
    //   });
    //   const { buyer } = hre.namedAccounts;

    //   const purchaseAmount = '1';
    //   const fee = '.15';
    //   const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

    //   await bpNori
    //     .connect(hre.namedSigners.buyer)
    //     .send(
    //       fifoMarket.address,
    //       hre.ethers.utils.parseUnits(totalPrice),
    //       hre.ethers.utils.hexZeroPad(buyer, 32)
    //     );

    //   const additionalRemovals = [{ amount: 1 }];

    //   await mintSupply(additionalRemovals, removal, fifoMarket);

    //   const totalAmountOfSupply =
    //     getTotalAmountOfSupply([...initialRemovals, ...additionalRemovals]) -
    //     Number(purchaseAmount);

    //   const totalAmountOfRemovals =
    //     getTotalAmountOfRemovals([...initialRemovals, ...additionalRemovals]) -
    //     1;

    //   const totalAmountOfSuppliers = getTotalAmountOfSuppliers([
    //     ...initialRemovals,
    //     ...additionalRemovals,
    //   ]);

    //   const [
    //     totalActiveSupply,
    //     totalNumberActiveRemovals,
    //     activeSupplierCount,
    //   ] = await Promise.all([
    //     fifoMarket.totalActiveSupply(),
    //     fifoMarket.totalNumberActiveRemovals(),
    //     fifoMarket.activeSupplierCount(),
    //   ]);

    //   expect(totalActiveSupply).to.equal(
    //     formatTokenAmount(totalAmountOfSupply)
    //   );
    //   expect(totalNumberActiveRemovals).to.equal(
    //     formatTokenAmount(totalAmountOfRemovals)
    //   );
    //   expect(activeSupplierCount).to.equal(
    //     formatTokenAmount(totalAmountOfSuppliers)
    //   );
    // });
  });

  describe('Successful purchases', () => {
    it('should mint a certificate with some of a single removal in round robin order and update state variables', async () => {
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

      const initialFifoSupply =
        await fifoMarket.numberOfActiveNrtsInMarketComputed();

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
      const finalFifoSupply =
        await fifoMarket.numberOfActiveNrtsInMarketComputed();

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
    // TODO: 'should mint a certificate with all of a single removal in round robin order and update state variables'
    it('should mint a certificate with one removal per supplier in round robin order and update state variables', async () => {
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

      const initialFifoSupply =
        await fifoMarket.numberOfActiveNrtsInMarketComputed();
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
      const finalFifoSupply =
        await fifoMarket.numberOfActiveNrtsInMarketComputed();

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
    it('should mint a certificate with multiple removals per supplier in round robin order and update state variables', async () => {
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

      const initialFifoSupply =
        await fifoMarket.numberOfActiveNrtsInMarketComputed();
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
      const finalFifoSupply =
        await fifoMarket.numberOfActiveNrtsInMarketComputed();

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
    it('should mint a certificate with multiple removals after another purchase has already been made and update state variables', async () => {
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

      const initialFifoSupply =
        await fifoMarket.numberOfActiveNrtsInMarketComputed();
      expect(initialFifoSupply).to.equal(hre.ethers.utils.parseUnits('20'));
      const purchaseNrts = async (): Promise<ContractReceipt> => {
        const tx = await bpNori
          .connect(hre.namedSigners.buyer)
          .send(
            fifoMarket.address,
            hre.ethers.utils.parseUnits(totalPrice),
            hre.ethers.utils.hexZeroPad(buyer, 32)
          );
        const result = await tx.wait();
        return result;
      };
      await purchaseNrts(); // deplete some of the stock (ids 0,1,2)
      await purchaseNrts(); // purchase more removals (ids 3,4,5-- tests non-zero-indexed purchases in the queue)
      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);
      const finalFifoSupply =
        await fifoMarket.numberOfActiveNrtsInMarketComputed();

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
      const removalDataToList: RemovalDataForListing[] = [
        { amount: 3, supplierAddress: hre.namedAccounts.supplier },
        { amount: 3, supplierAddress: hre.namedAccounts.investor1 },
        { amount: 4, supplierAddress: hre.namedAccounts.investor2 },
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

      const initialFifoSupply =
        await fifoMarket.numberOfActiveNrtsInMarketComputed();

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
        fifoMarket.numberOfActiveNrtsInMarketComputed(),
      ]);

      expect(buyerFinalNoriBalance).to.equal(
        buyerInitialBPNoriBalance
          .sub(hre.ethers.utils.parseUnits(totalPrice, 18))
          .toString()
      );
      console.log({
        finalFifoSupply,
        noriFinalNoriBalance,
        buyerFinalNoriBalance,
        buyerInitialBPNoriBalance,
        supplierFinalNoriBalance,
        supplierInitialNoriBalance,
        fr: hre.ethers.utils.parseUnits(
          removalDataToList[0].amount.toString(),
          18
        ),
      });
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
    // TODO: should not use reserved supply to fulfill an order;
    // TODO: should use previously reserved supply to fulfill an order after it has been unreserved
    // TODO: should update activeSupplierCount after the last removal has been reserved from a supplier
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
        removalDataToList: [
          { amount: 1 },
          { amount: 0 },
          { amount: 1 },
          { amount: 1 },
          { amount: 0 },
          { amount: 1 },
        ],
      });
      const { supplier, buyer, noriWallet } = hre.namedAccounts;

      const purchaseAmount = '4';
      const fee = '.6';
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

  describe('placing removals on hold', () => {
    it('should update totalActiveSupply, totalReservedSupply, and totalNumberActiveRemovals when a removal is reserved', async () => {
      const removals = [{ amount: 3 }, { amount: 3 }, { amount: 4 }];
      const {
        fifoMarket,
        listedRemovalIds,
        totalAmountOfRemovals,
        totalAmountOfSuppliers,
        totalAmountOfSupply,
      } = await setupTestLocal({
        removalDataToList: removals,
      });

      const removalIdToReserve = listedRemovalIds[0];
      const removalAmountToReserve = removals[0].amount;
      await fifoMarket.reserveRemoval(removalIdToReserve);

      const [
        totalActiveSupply,
        totalReservedSupply,
        totalNumberActiveRemovals,
        activeSupplierCount,
      ] = await Promise.all([
        fifoMarket.totalActiveSupply(),
        fifoMarket.totalReservedSupply(),
        fifoMarket.totalNumberActiveRemovals(),
        fifoMarket.activeSupplierCount(),
      ]);

      expect(totalActiveSupply).to.equal(
        formatTokenAmount(totalAmountOfSupply - removalAmountToReserve)
      );
      expect(totalNumberActiveRemovals.toNumber()).to.equal(
        totalAmountOfRemovals - 1
      );
      expect(activeSupplierCount.toNumber()).to.equal(totalAmountOfSuppliers);
      expect(totalReservedSupply).to.equal(
        formatTokenAmount(removalAmountToReserve)
      );
    });
    it('updates totalActiveSupply, totalReservedSupply, and totalNumberActiveRemovals when a removal is unreserved', async () => {
      const {
        fifoMarket,
        listedRemovalIds,
        totalAmountOfRemovals,
        totalAmountOfSuppliers,
        totalAmountOfSupply,
      } = await setupTestLocal({
        removalDataToList: [{ amount: 3 }, { amount: 3 }, { amount: 4 }],
      });

      const removalIdToReserve = listedRemovalIds[0];
      await fifoMarket.reserveRemoval(removalIdToReserve);

      await fifoMarket.unreserveRemoval(removalIdToReserve);

      const [
        totalActiveSupply,
        totalReservedSupply,
        totalNumberActiveRemovals,
        activeSupplierCount,
      ] = await Promise.all([
        fifoMarket.totalActiveSupply(),
        fifoMarket.totalReservedSupply(),
        fifoMarket.totalNumberActiveRemovals(),
        fifoMarket.activeSupplierCount(),
      ]);

      expect(totalActiveSupply).to.equal(
        formatTokenAmount(totalAmountOfSupply)
      );
      expect(totalNumberActiveRemovals.toNumber()).to.equal(
        totalAmountOfRemovals
      );
      expect(activeSupplierCount.toNumber()).to.equal(totalAmountOfSuppliers);
      expect(totalReservedSupply).to.equal(formatTokenAmount(0));
    });
    it('should update activeSupplierCount when the last removal from a supplier is reserved', async () => {
      const removals = [{ amount: 3 }];
      const { fifoMarket, listedRemovalIds } = await setupTestLocal({
        removalDataToList: removals,
      });

      const removalIdToReserve = listedRemovalIds[0];
      await fifoMarket.reserveRemoval(removalIdToReserve);

      const [
        totalActiveSupply,
        totalReservedSupply,
        totalNumberActiveRemovals,
        activeSupplierCount,
      ] = await Promise.all([
        fifoMarket.totalActiveSupply(),
        fifoMarket.totalReservedSupply(),
        fifoMarket.totalNumberActiveRemovals(),
        fifoMarket.activeSupplierCount(),
      ]);

      expect(totalActiveSupply).to.equal(formatTokenAmount(0));
      expect(totalNumberActiveRemovals.toNumber()).to.equal(0);
      expect(activeSupplierCount.toNumber()).to.equal(0);
      expect(totalReservedSupply).to.equal(
        formatTokenAmount(getTotalAmountOfSupply(removals))
      );
    });
  });
  describe('functions', () => {
    describe('activeNrtsInMarketForAmountComputed', () => {
      it('should return the predicted removals that will be used for a given order amount', async () => {
        const { namedAccounts } = global.hre;
        const removalDataToList: RemovalDataForListing[] = [
          { amount: 10, supplierAddress: namedAccounts.supplier },
          { amount: 10, supplierAddress: namedAccounts.supplier },
          { amount: 10, supplierAddress: namedAccounts.supplier },
          { amount: 10, supplierAddress: namedAccounts.supplier },
          { amount: 10, supplierAddress: namedAccounts.supplier },
        ];
        const orderAmount = formatTokenAmount(35);
        const { fifoMarket, listedRemovalIds } = await setupTestLocal({
          removalDataToList,
        });
        const result = await fifoMarket.activeNrtsInMarketForAmountComputed(
          orderAmount
        );
        expect(result.removals).to.deep.equal([
          listedRemovalIds[0],
          listedRemovalIds[1],
          listedRemovalIds[2],
          listedRemovalIds[3],
        ]);
        expect(result.suppliers).to.deep.equal([
          removalDataToList[0].supplierAddress,
        ]);
        expect(result.total).to.equal(orderAmount);
      });
    });
  });
});

// TODO: check that removals are getting burned correctly?
