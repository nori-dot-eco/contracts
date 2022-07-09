import type { ContractReceipt } from 'ethers';
import { BigNumber } from 'ethers';

import { MaxUint256, Zero } from '@/constants/units';
import {
  setupTest,
  expect,
  batchMintAndListRemovalsForSale,
} from '@/test/helpers';
import { formatTokenAmount } from '@/utils/units';
import { compareScheduleSummaryStructs } from '@/test/helpers/restricted-nori';

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
    it('correctly initializes totalActiveSupply, totalReservedSupply, numberOfActiveRemovals, activeSupplierCount, and priorityRestrictedThreshold', async () => {
      const { fifoMarket, removal } = await setupTest();
      const initialSupply = await Promise.all([
        removal.cumulativeBalanceOf(fifoMarket.address),
        fifoMarket.totalReservedSupply(),
        fifoMarket.numberOfActiveRemovals(),
        // fifoMarket.activeSupplierCount(),// todo
        fifoMarket.priorityRestrictedThreshold(),
      ]);
      expect(initialSupply.map((e) => e.toString())).to.deep.equal(
        Array.from({ length: 4 }).fill(Zero.toString())
      );
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
        const newThreshold = formatTokenAmount(100);
        await expect(
          fifoMarket
            .connect(namedSigners[accountWithRole])
            .setPriorityRestrictedThreshold(newThreshold)
        )
          .to.emit(fifoMarket, 'PriorityRestrictedThresholdSet')
          .withArgs(newThreshold);
        expect(await fifoMarket.priorityRestrictedThreshold()).to.equal(
          newThreshold
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
      it(`should allow allowlisted accounts to purchase supply when inventory is below threshold`, async () => {
        const role = 'ALLOWLIST_ROLE';
        const accountWithRole = 'admin';
        const totalAvailableSupply = 50;
        const value = formatTokenAmount(totalAvailableSupply);
        const { bpNori, fifoMarket, hre } = await setupTest({
          userFixtures: {
            supplier: {
              removalDataToList: {
                removals: [{ amount: totalAvailableSupply }],
              },
            },
          },
        });
        const { namedAccounts, namedSigners } = hre;
        const priorityRestrictedThreshold = formatTokenAmount(100);
        await fifoMarket.setPriorityRestrictedThreshold(
          // todo contract fixtures
          priorityRestrictedThreshold
        );
        const roleId = await fifoMarket[role]();
        expect(await fifoMarket.hasRole(roleId, namedAccounts[accountWithRole]))
          .to.be.true;
        const { v, r, s } = await namedSigners[accountWithRole].permit({
          verifyingContract: bpNori,
          spender: fifoMarket.address,
          value,
        });
        await expect(
          fifoMarket
            .connect(namedSigners[accountWithRole])
            .swap(namedAccounts[accountWithRole], value, MaxUint256, v, r, s)
        ).not.to.be.reverted;
      });
      it(`should revert when an account that is not on the allowlist tries purchase supply when inventory is below the threshold`, async () => {
        const { bpNori, fifoMarket, hre, totalAmountOfSupply } =
          await setupTest({
            userFixtures: {
              supplier: {
                removalDataToList: {
                  removals: [{ amount: 50 }],
                },
              },
            },
          });
        const accountWithoutRole = hre.namedSigners.buyer;
        const priorityRestrictedThreshold = formatTokenAmount(100);
        await fifoMarket.setPriorityRestrictedThreshold(
          priorityRestrictedThreshold
        );
        const roleId = await fifoMarket.ALLOWLIST_ROLE();
        expect(await fifoMarket.hasRole(roleId, accountWithoutRole.address)).to
          .be.false;
        const { v, r, s } = await accountWithoutRole.permit({
          verifyingContract: bpNori,
          spender: fifoMarket.address,
          value: totalAmountOfSupply,
        });
        await expect(
          fifoMarket
            .connect(accountWithoutRole)
            .swap(
              accountWithoutRole.address,
              totalAmountOfSupply,
              MaxUint256,
              v,
              r,
              s
            )
        ).to.be.revertedWith('LowSupplyAllowlistRequired()');
      });
    });
    // });
    describe('inventory inspection', () => {
      // describe('nextRemovalForSale', () => {
      //   describe('when there is no inventory', () => {
      //     it('should return 0', async () => {
      //       const { fifoMarket } = await setupTest();
      //       expect(await fifoMarket.nextRemovalForSale(true)).to.equal(
      //         Zero
      //       );
      //     });
      //     it('should have defined behavior if there are multiple removals and all of them were purchased', async () => {
      //       const { bpNori, fifoMarket, hre } = await setupTestLocal({
      //         removalDataToList: {removals:[{ amount: 5 }, { amount: 5 }, { amount: 5 }]},
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
      //         Zero
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
      //           removalDataToList: {removals:[{ amount: 5 }, { amount: 5 }, { amount: 5 }]},
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
      //         Zero
      //       );
      //     });
      //   });
      // });
      describe('totalActiveSupply', () => {
        it('should correctly report the number of NRTs for sale when there are multiple removals in inventory', async () => {
          const { fifoMarket, removal, totalAmountOfSupply } = await setupTest({
            userFixtures: {
              supplier: {
                removalDataToList: {
                  removals: [{ amount: 3 }, { amount: 3 }, { amount: 4 }],
                },
              },
            },
          });
          const [nrtsInQueueWeiComputed, totalSupplyWeiRetrieved] =
            await Promise.all([
              fifoMarket.totalActiveSupply(),
              removal.cumulativeBalanceOf(fifoMarket.address),
            ]);
          expect(nrtsInQueueWeiComputed).to.equal(totalAmountOfSupply);
          expect(totalSupplyWeiRetrieved).to.equal(nrtsInQueueWeiComputed);
        });
        it('should correctly report the number of NRTs for sale when there are multiple removals in inventory and some were purchased', async () => {
          const {
            bpNori,
            fifoMarket,
            hre,
            totalAmountOfSupply,
            removalAmounts,
            feePercentage,
            removal,
          } = await setupTest({
            userFixtures: {
              supplier: {
                removalDataToList: {
                  removals: [{ amount: 5 }, { amount: 5 }, { amount: 5 }],
                },
              },
            },
          });
          const purchaseAmount = removalAmounts[0].add(removalAmounts[1]);
          const buyer = hre.namedSigners.buyer;
          const fee = purchaseAmount.mul(feePercentage).div(100);
          const value = purchaseAmount.add(fee);
          const { v, r, s } = await buyer.permit({
            verifyingContract: bpNori,
            spender: fifoMarket.address,
            value,
          });
          await fifoMarket
            .connect(buyer)
            .swap(buyer.address, value, MaxUint256, v, r, s);
          const expectedRemainingSupply =
            totalAmountOfSupply.sub(purchaseAmount);
          const [nrtsInQueueWeiComputed, totalSupplyWeiRetrieved] =
            await Promise.all([
              fifoMarket.totalActiveSupply(),
              removal.cumulativeBalanceOf(fifoMarket.address),
            ]);
          expect(totalSupplyWeiRetrieved)
            .to.equal(expectedRemainingSupply)
            .and.to.equal(nrtsInQueueWeiComputed);
        });
        it('should correctly report the number of NRTs for sale when there is no inventory', async () => {
          const { fifoMarket, removal } = await setupTest({});
          expect(await fifoMarket.totalActiveSupply())
            .to.equal(0)
            .and.to.equal(
              await removal.cumulativeBalanceOf(fifoMarket.address)
            );
        });
      });
      describe('totalUnrestrictedSupply', () => {
        it('should return 0 when there is inventory but it is below the priority restricted threshold', async () => {
          const { fifoMarket } = await setupTest({
            userFixtures: {
              supplier: {
                removalDataToList: { removals: [{ amount: 100 }] },
              },
            },
          });
          await fifoMarket.setPriorityRestrictedThreshold(
            formatTokenAmount(200)
          );
          expect(await fifoMarket.totalUnrestrictedSupply()).to.equal(Zero);
        });
        it('should return the unrestricted portion of supply when inventory is above the priority restricted threshold', async () => {
          const priorityThreshold = formatTokenAmount(200); // todo setPriorityRestrictedThreshold fixture
          const { fifoMarket, totalAmountOfSupply } = await setupTest({
            userFixtures: {
              supplier: {
                removalDataToList: { removals: [{ amount: 300 }] },
              },
            },
          });
          await fifoMarket.setPriorityRestrictedThreshold(priorityThreshold);
          const expectedTotalUnrestrictedSupply =
            totalAmountOfSupply.sub(priorityThreshold);
          expect(await fifoMarket.totalUnrestrictedSupply()).to.equal(
            expectedTotalUnrestrictedSupply
          );
        });
      });
    });
    describe('when listing supply in the market', () => {
      it('should update totalActiveSupply, numberOfActiveRemovals, and activeSupplierCount when a new supplier is added', async () => {
        const {
          fifoMarket,
          totalAmountOfSupply,
          totalAmountOfSuppliers, // todo
          totalAmountOfRemovals,
          removal,
        } = await setupTest({
          userFixtures: {
            supplier: {
              removalDataToList: { removals: [{ amount: 100 }] },
            },
          },
        });
        const [totalActiveSupply, numberOfActiveRemovals] = await Promise.all([
          removal.cumulativeBalanceOf(fifoMarket.address),
          fifoMarket.numberOfActiveRemovals(),
          // fifoMarket.activeSupplierCount(), // todo
        ]);
        expect(totalAmountOfSupply).to.be.above(0).and.eq(totalActiveSupply);
        expect(totalAmountOfRemovals)
          .to.be.above(0)
          .and.eq(numberOfActiveRemovals);
        // expect(totalAmountOfSuppliers)
        //   .to.be.above(0)
        //   .and.eq(activeSupplierCount); // todo
      });
      // TODO: Fix the already existing token IDs for this test
      // it('updates totalActiveSupply and numberOfActiveRemovals when more removals are added for a supplier', async () => {
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
      //     numberOfActiveRemovals,
      //     activeSupplierCount,
      //   ] = await Promise.all([
      //     fifoMarket.totalActiveSupply(),
      //     fifoMarket.numberOfActiveRemovals(),
      //     fifoMarket.activeSupplierCount(),
      //   ]);
      //   expect(totalActiveSupply).to.equal(
      //     formatTokenAmount(totalAmountOfSupply)
      //   );
      //   expect(numberOfActiveRemovals).to.equal(
      //     formatTokenAmount(totalAmountOfRemovals)
      //   );
      //   expect(activeSupplierCount).to.equal(
      //     formatTokenAmount(totalAmountOfSuppliers)
      //   );
      // });
      // TODO: Also fix the already existing token IDs for this test
      // it('updates totalActiveSupply and numberOfActiveRemovals, and activeSupplierCount when more removals are added for a supplier who has previously sold out', async () => {
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
      //     numberOfActiveRemovals,
      //     activeSupplierCount,
      //   ] = await Promise.all([
      //     fifoMarket.totalActiveSupply(),
      //     fifoMarket.numberOfActiveRemovals(),
      //     fifoMarket.activeSupplierCount(),
      //   ]);
      //   expect(totalActiveSupply).to.equal(
      //     formatTokenAmount(totalAmountOfSupply)
      //   );
      //   expect(numberOfActiveRemovals).to.equal(
      //     formatTokenAmount(totalAmountOfRemovals)
      //   );
      //   expect(activeSupplierCount).to.equal(
      //     formatTokenAmount(totalAmountOfSuppliers)
      //   );
      // });
    });
    // describe('Successful purchases', () => {
    //   it('should mint a certificate with some of a single removal in round robin order and update state', async () => {
    //     const {
    //       bpNori,
    //       certificate,
    //       fifoMarket,
    //       hre,
    //       feePercentage,
    //       userFixtures,
    //     } = await setupTest({
    //       userFixtures: {
    //         supplier: {
    //           removalDataToList: { removals: [{ amount: 100 }] },
    //         },
    //       },
    //     });
    //     const { supplier, buyer, noriWallet } = hre.namedSigners;
    //     const purchaseAmount = formatTokenAmount(1);
    //     const fee = purchaseAmount.mul(feePercentage).div(100);
    //     const supplierInitialNoriBalance = formatTokenAmount(0);
    //     const noriInitialNoriBalance = formatTokenAmount(0);
    //     const initialFifoSupply = await fifoMarket.totalActiveSupply();
    //     const value = purchaseAmount.add(fee);
    //     const { v, r, s } = await buyer.permit({
    //       verifyingContract: bpNori,
    //       spender: fifoMarket.address,
    //       value,
    //     });
    //     await fifoMarket
    //       .connect(buyer)
    //       .swap(buyer.address, value, MaxUint256, v, r, s);
    //     const buyerFinalNoriBalance = await bpNori.balanceOf(buyer.address);
    //     const supplierFinalNoriBalance = await bpNori.balanceOf(
    //       supplier.address
    //     );
    //     const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet.address);
    //     const finalFifoSupply = await fifoMarket.totalActiveSupply();
    //     expect(buyerFinalNoriBalance).to.equal(
    //       userFixtures.buyer.bpBalance.sub(value)
    //     );
    //     expect(supplierFinalNoriBalance).to.equal(
    //       supplierInitialNoriBalance.add(purchaseAmount)
    //     );
    //     expect(noriFinalNoriBalance).to.equal(noriInitialNoriBalance.add(fee));
    //     expect(await certificate.balanceOf(buyer.address, 0)).to.equal(
    //       purchaseAmount
    //     );
    //     expect(finalFifoSupply).to.equal(initialFifoSupply.sub(purchaseAmount));
    //   });
    //   it('should sell removals in order of vintage regardless of minting order', async () => {
    //     const testSetup = await setupTest({
    //       userFixtures: {
    //         supplier: {
    //           removalDataToList: { removals: [{ amount: 1, vintage: 2015 }] },
    //         },
    //       },
    //     });
    //     const { bpNori, fifoMarket, hre, feePercentage } = testSetup;
    //     await batchMintAndListRemovalsForSale({
    //       removalDataToList: { removals: [{ amount: 5, vintage: 2014 }] },
    //       ...testSetup,
    //     });
    //     const purchaseAmount = formatTokenAmount(4);
    //     const fee = purchaseAmount.mul(feePercentage).div(100);
    //     const value = purchaseAmount.add(fee);
    //     const { buyer, investor1 } = hre.namedSigners;
    //     const deadline = MaxUint256;
    //     const { v, r, s } = await buyer.permit({
    //       verifyingContract: bpNori,
    //       spender: fifoMarket.address,
    //       value,
    //     });
    //     await fifoMarket
    //       .connect(buyer)
    //       .swap(investor1.address, value, deadline, v, r, s);
    //     const numberOfActiveRemovals =
    //       await fifoMarket.numberOfActiveRemovals();
    //     // Roundabout way of showing that the removal used to fill the order was the removal with amount 5, not 1.
    //     expect(numberOfActiveRemovals).to.equal(2);
    //   });
    //   it('should mint a certificate with one removal per supplier in round robin order and update state variables', async () => {
    //     const {
    //       bpNori,
    //       certificate,
    //       fifoMarket,
    //       hre,
    //       feePercentage,
    //       userFixtures,
    //     } = await setupTest({
    //       userFixtures: {
    //         supplier: {
    //           removalDataToList: {
    //             removals: [{ amount: 3 }, { amount: 3 }, { amount: 4 }],
    //           },
    //         },
    //       },
    //     });
    //     const { supplier, buyer, noriWallet } = hre.namedSigners;
    //     const purchaseAmount = formatTokenAmount(10);
    //     const fee = purchaseAmount.mul(feePercentage).div(100);
    //     const value = purchaseAmount.add(fee);
    //     const supplierInitialNoriBalance = formatTokenAmount(0); // todo get from user fixtures
    //     const noriInitialNoriBalance = formatTokenAmount(0); // todo get from user fixtures
    //     const initialFifoSupply = await fifoMarket.totalActiveSupply();
    //     expect(initialFifoSupply).to.equal(purchaseAmount);
    //     const { v, r, s } = await buyer.permit({
    //       verifyingContract: bpNori,
    //       spender: fifoMarket.address,
    //       value,
    //     });
    //     await fifoMarket
    //       .connect(buyer)
    //       .swap(buyer.address, value, MaxUint256, v, r, s);
    //     const buyerFinalNoriBalance = await bpNori.balanceOf(buyer.address);
    //     const supplierFinalNoriBalance = await bpNori.balanceOf(
    //       supplier.address
    //     );
    //     const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet.address);
    //     const finalFifoSupply = await fifoMarket.totalActiveSupply();
    //     expect(buyerFinalNoriBalance).to.equal(
    //       userFixtures.buyer.bpBalance.sub(value)
    //     );
    //     expect(supplierFinalNoriBalance).to.equal(
    //       supplierInitialNoriBalance.add(purchaseAmount)
    //     );
    //     expect(noriFinalNoriBalance).to.equal(noriInitialNoriBalance.add(fee));
    //     expect(await certificate.balanceOf(buyer.address, 0)).to.equal(
    //       purchaseAmount
    //     );
    //     expect(finalFifoSupply).to.equal(initialFifoSupply.sub(purchaseAmount));
    //   });
    //   it('should mint a certificate with multiple removals per supplier in round robin order and update state variables', async () => {
    //     const amountPerRemoval = 50;
    //     const removalDataToList = [...Array.from({ length: 100 }).keys()].map(
    //       (_, index) => {
    //         return { amount: amountPerRemoval, vintage: 2015 + (index % 5) };
    //       }
    //     );
    //     // split into two batches to avoid blowing block gas limit while minting/listing large supply
    //     const firstBatch = removalDataToList.slice(0, 50);
    //     const secondBatch = removalDataToList.slice(50, 100);
    //     const testSetup = await setupTest({
    //       userFixtures: {
    //         supplier: { removalDataToList: { removals: firstBatch } },
    //       },
    //     });
    //     const {
    //       bpNori,
    //       certificate,
    //       fifoMarket,
    //       hre,
    //       userFixtures,
    //       totalAmountOfSupply,
    //       feePercentage,
    //     } = testSetup;
    //     await batchMintAndListRemovalsForSale({
    //       ...testSetup,
    //       removalDataToList: { removals: secondBatch },
    //     });
    //     const { supplier, buyer, noriWallet } = hre.namedSigners;
    //     const purchaseAmount = totalAmountOfSupply; // purchase all supply
    //     const fee = purchaseAmount.mul(feePercentage).div(100);
    //     const value = purchaseAmount.add(fee);
    //     const supplierInitialNoriBalance = formatTokenAmount(0);
    //     const noriInitialNoriBalance = formatTokenAmount(0);
    //     const initialFifoSupply = await fifoMarket.totalActiveSupply();
    //     const { v, r, s } = await buyer.permit({
    //       verifyingContract: bpNori,
    //       spender: fifoMarket.address,
    //       value,
    //     });
    //     await fifoMarket
    //       .connect(buyer)
    //       .swap(buyer.address, value, MaxUint256, v, r, s);
    //     const buyerFinalNoriBalance = await bpNori.balanceOf(buyer.address);
    //     const supplierFinalNoriBalance = await bpNori.balanceOf(
    //       supplier.address
    //     );
    //     const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet.address);
    //     const finalFifoSupply = await fifoMarket.totalActiveSupply();
    //     expect(buyerFinalNoriBalance).to.equal(
    //       userFixtures.buyer.bpBalance.sub(value)
    //     );
    //     expect(supplierFinalNoriBalance).to.equal(
    //       supplierInitialNoriBalance.add(purchaseAmount)
    //     );
    //     expect(noriFinalNoriBalance).to.equal(noriInitialNoriBalance.add(fee));
    //     expect(await certificate.balanceOf(buyer.address, 0)).to.equal(
    //       purchaseAmount
    //     );
    //     expect(finalFifoSupply).to.equal(initialFifoSupply.sub(purchaseAmount));
    //   });
    //   it('should mint a certificate with multiple removals after another purchase has already been made and update state variables', async () => {
    //     const {
    //       bpNori,
    //       certificate,
    //       fifoMarket,
    //       hre,
    //       userFixtures,
    //       feePercentage,
    //       totalAmountOfSupply,
    //     } = await setupTest({
    //       userFixtures: {
    //         supplier: {
    //           removalDataToList: {
    //             removals: [
    //               { amount: 3 },
    //               { amount: 3 },
    //               { amount: 4 },
    //               { amount: 3 },
    //               { amount: 3 },
    //               { amount: 4 },
    //             ],
    //           },
    //         },
    //       },
    //     });
    //     const { supplier, noriWallet } = hre.namedAccounts;
    //     const { buyer } = hre.namedSigners;
    //     const purchaseAmount = formatTokenAmount(10);
    //     const fee = purchaseAmount.mul(feePercentage).div(100);
    //     const value = purchaseAmount.add(fee);
    //     const doublePurchaseAmount = purchaseAmount.mul(2);
    //     const doubleFee = fee.mul(2);
    //     const doubleTotalPrice = value.mul(2);
    //     const supplierInitialNoriBalance = formatTokenAmount(0);
    //     const noriInitialNoriBalance = formatTokenAmount(0);
    //     const initialFifoSupply = await fifoMarket.totalActiveSupply();
    //     expect(initialFifoSupply).to.equal(totalAmountOfSupply);
    //     const purchaseNrts = async (): Promise<ContractReceipt> => {
    //       const { v, r, s } = await buyer.permit({
    //         verifyingContract: bpNori,
    //         spender: fifoMarket.address,
    //         value,
    //       });
    //       const tx = await fifoMarket
    //         .connect(buyer)
    //         .swap(buyer.address, value, MaxUint256, v, r, s);
    //       return tx.wait();
    //     };
    //     await purchaseNrts(); // deplete some of the stock (ids 0, 1, 2)
    //     await purchaseNrts(); // purchase more removals (ids 3, 4, 5 -- tests non-zero-indexed purchases in the queue)
    //     const buyerFinalNoriBalance = await bpNori.balanceOf(buyer.address);
    //     const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
    //     const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);
    //     const finalFifoSupply = await fifoMarket.totalActiveSupply();
    //     expect(buyerFinalNoriBalance).to.equal(
    //       userFixtures.buyer.bpBalance.sub(doubleTotalPrice)
    //     );
    //     expect(supplierFinalNoriBalance).to.equal(
    //       supplierInitialNoriBalance.add(doublePurchaseAmount)
    //     );
    //     expect(noriFinalNoriBalance).to.equal(
    //       noriInitialNoriBalance.add(doubleFee)
    //     );
    //     expect(await certificate.balanceOf(buyer.address, 1)).to.equal(
    //       purchaseAmount
    //     );
    //     expect(finalFifoSupply).to.equal(
    //       initialFifoSupply.sub(doublePurchaseAmount)
    //     );
    //   });
    //   it('should correctly pay suppliers when multiple different suppliers removals are used to fulfill an order', async () => {
    //     const {
    //       bpNori,
    //       certificate,
    //       fifoMarket,
    //       feePercentage,
    //       userFixtures,
    //       removalAmounts,
    //       totalAmountOfSupply,
    //     } = await setupTest({
    //       userFixtures: {
    //         supplier: {
    //           removalDataToList: {
    //             removals: [
    //               { amount: 3, supplierAddress: hre.namedAccounts.supplier },
    //               { amount: 3, supplierAddress: hre.namedAccounts.investor1 },
    //               { amount: 4, supplierAddress: hre.namedAccounts.investor2 },
    //             ],
    //           },
    //         },
    //       },
    //     });
    //     const purchaseAmount = totalAmountOfSupply; // purchase all supply
    //     const fee = purchaseAmount.mul(feePercentage).div(100);
    //     const value = purchaseAmount.add(fee);
    //     const supplierInitialNoriBalance = formatTokenAmount(0);
    //     const investor1InitialNoriBalance = formatTokenAmount(0);
    //     const investor2InitialNoriBalance = formatTokenAmount(0);
    //     const noriInitialNoriBalance = formatTokenAmount(0);
    //     const initialFifoSupply = await fifoMarket.totalActiveSupply();
    //     const { buyer } = hre.namedSigners;
    //     const { v, r, s } = await buyer.permit({
    //       verifyingContract: bpNori,
    //       spender: fifoMarket.address,
    //       value,
    //     });
    //     await fifoMarket
    //       .connect(buyer)
    //       .swap(buyer.address, value, MaxUint256, v, r, s);
    //     const [
    //       buyerFinalNoriBalance,
    //       supplierFinalNoriBalance,
    //       investor1FinalNoriBalance,
    //       investor2FinalNoriBalance,
    //       noriFinalNoriBalance,
    //       finalFifoSupply,
    //     ] = await Promise.all([
    //       bpNori.balanceOf(buyer.address),
    //       bpNori.balanceOf(hre.namedAccounts.supplier),
    //       bpNori.balanceOf(hre.namedAccounts.investor1),
    //       bpNori.balanceOf(hre.namedAccounts.investor2),
    //       bpNori.balanceOf(hre.namedAccounts.noriWallet),
    //       fifoMarket.totalActiveSupply(),
    //     ]);
    //     expect(buyerFinalNoriBalance).to.equal(
    //       userFixtures.buyer.bpBalance.sub(value)
    //     );
    //     expect(supplierFinalNoriBalance).to.equal(
    //       supplierInitialNoriBalance.add(removalAmounts[0])
    //     );
    //     expect(investor1FinalNoriBalance).to.equal(
    //       investor1InitialNoriBalance.add(removalAmounts[1])
    //     );
    //     expect(investor2FinalNoriBalance).to.equal(
    //       investor2InitialNoriBalance.add(removalAmounts[2])
    //     );
    //     expect(noriFinalNoriBalance).to.equal(noriInitialNoriBalance.add(fee));
    //     expect(await certificate.balanceOf(buyer.address, 0)).to.equal(
    //       purchaseAmount
    //     );
    //     expect(finalFifoSupply).to.equal(initialFifoSupply.sub(purchaseAmount));
    //   });
    //   //     // TODO: should not use reserved supply to fulfill an order;
    //   //     // TODO: should use previously reserved supply to fulfill an order after it has been unreserved
    //   //     // TODO: should update activeSupplierCount after the last removal has been reserved from a supplier
    // }); // todo
    // describe('Unsuccessful purchases', () => {
    //   it('should revert when the queue is completely empty and no balances should change as a result', async () => {
    //     const {
    //       bpNori,
    //       certificate,
    //       fifoMarket,
    //       hre,
    //       feePercentage,
    //       userFixtures,
    //     } = await setupTest();
    //     const { supplier, buyer, noriWallet } = hre.namedSigners;
    //     const purchaseAmount = formatTokenAmount(1);
    //     const fee = purchaseAmount.mul(feePercentage).div(100);
    //     const totalPrice = purchaseAmount.add(fee);
    //     const supplierInitialNoriBalance = formatTokenAmount(0);
    //     const noriInitialNoriBalance = formatTokenAmount(0);
    //     const { v, r, s } = await buyer.permit({
    //       verifyingContract: bpNori,
    //       spender: fifoMarket.address,
    //       value: totalPrice,
    //     });
    //     await expect(
    //       fifoMarket
    //         .connect(buyer)
    //         .swap(buyer.address, totalPrice, MaxUint256, v, r, s)
    //     ).to.be.revertedWith('OutOfStock()');
    //     const [
    //       buyerFinalNoriBalance,
    //       supplierFinalNoriBalance,
    //       noriFinalNoriBalance,
    //     ] = await Promise.all([
    //       bpNori.balanceOf(buyer.address),
    //       bpNori.balanceOf(supplier.address),
    //       bpNori.balanceOf(noriWallet.address),
    //     ]);
    //     expect(buyerFinalNoriBalance).to.equal(userFixtures.buyer.bpBalance);
    //     expect(supplierFinalNoriBalance).to.equal(supplierInitialNoriBalance);
    //     expect(noriFinalNoriBalance).to.equal(noriInitialNoriBalance);
    //     expect(await certificate.balanceOf(buyer.address, 0)).to.equal(0);
    //   });
    //   it('should revert when the non-empty queue does not have enough supply to fill the order', async () => {
    //     const {
    //       bpNori,
    //       certificate,
    //       fifoMarket,
    //       hre,
    //       feePercentage,
    //       userFixtures,
    //     } = await setupTest({
    //       userFixtures: {
    //         supplier: { removalDataToList: { removals: [{ amount: 1 }] } },
    //       },
    //     });
    //     const { supplier, buyer, noriWallet } = hre.namedSigners;
    //     const purchaseAmount = formatTokenAmount(2);
    //     const fee = purchaseAmount.mul(feePercentage).div(100);
    //     const value = purchaseAmount.add(fee);
    //     const supplierInitialNoriBalance = formatTokenAmount(0);
    //     const noriInitialNoriBalance = formatTokenAmount(0);
    //     const { v, r, s } = await buyer.permit({
    //       verifyingContract: bpNori,
    //       spender: fifoMarket.address,
    //       value,
    //     });
    //     await expect(
    //       fifoMarket
    //         .connect(buyer)
    //         .swap(buyer.address, value, MaxUint256, v, r, s)
    //     ).to.be.revertedWith('InsufficientSupply()');
    //     const [
    //       buyerFinalNoriBalance,
    //       supplierFinalNoriBalance,
    //       noriFinalNoriBalance,
    //     ] = await Promise.all([
    //       bpNori.balanceOf(buyer.address),
    //       bpNori.balanceOf(supplier.address),
    //       bpNori.balanceOf(noriWallet.address),
    //     ]);
    //     expect(buyerFinalNoriBalance).to.equal(userFixtures.buyer.bpBalance);
    //     expect(supplierFinalNoriBalance).to.equal(supplierInitialNoriBalance);
    //     expect(noriFinalNoriBalance).to.equal(noriInitialNoriBalance);
    //     expect(await certificate.balanceOf(buyer.address, 0)).to.equal(0);
    //   });
    //   // TODO disallow listing removals with 0 balance in the first place.
    //   // there is a ticket for this.
    //   // it('should revert when a removal with an amount of 0 is used', async () => {
    //   //   const {
    //   //     bpNori,
    //   //     certificate,
    //   //     fifoMarket,
    //   //     hre,
    //   //     feePercentage,
    //   //     userFixtures,
    //   //   } = await setupTest({
    //   //     userFixtures: {
    //   //       supplier: {
    //   //         removalDataToList: {
    //   //           removals: [
    //   //             { amount: 1 },
    //   //             { amount: 0 },
    //   //             { amount: 1 },
    //   //             { amount: 1 },
    //   //             { amount: 0 },
    //   //             { amount: 1 },
    //   //           ],
    //   //         },
    //   //       },
    //   //     },
    //   //   });
    //   //   const { supplier, buyer, noriWallet } = hre.namedSigners;
    //   //   const purchaseAmount = formatTokenAmount(4);
    //   //   const fee = purchaseAmount.mul(feePercentage).div(100);
    //   //   const value = purchaseAmount.add(fee);
    //   //   const supplierInitialNoriBalance = formatTokenAmount(0);
    //   //   const noriInitialNoriBalance = formatTokenAmount(0);
    //   //   const { v, r, s } = await buyer.permit({
    //   //     verifyingContract: bpNori,
    //   //     spender: fifoMarket.address,
    //   //     value,
    //   //   });
    //   //   await expect(
    //   //     fifoMarket
    //   //       .connect(buyer)
    //   //       .swap(buyer.address, value, constants.MaxUint256, v, r, s)
    //   //   ).to.be.reverted;
    //   //   const [
    //   //     buyerFinalNoriBalance,
    //   //     supplierFinalNoriBalance,
    //   //     noriFinalNoriBalance,
    //   //   ] = await Promise.all([
    //   //     bpNori.balanceOf(buyer.address),
    //   //     bpNori.balanceOf(supplier.address),
    //   //     bpNori.balanceOf(noriWallet.address),
    //   //   ]);
    //   //   expect(buyerFinalNoriBalance).to.equal(userFixtures.buyer.bpBalance);
    //   //   expect(supplierFinalNoriBalance).to.equal(supplierInitialNoriBalance);
    //   //   expect(noriFinalNoriBalance).to.equal(noriInitialNoriBalance);
    //   //   expect(await certificate.balanceOf(buyer.address, 0)).to.equal(0);
    //   // });
    // }); // todo
    describe('placing removals on hold', () => {
      it('should update totalActiveSupply, totalReservedSupply, and numberOfActiveRemovals when a removal is reserved', async () => {
        const {
          fifoMarket,
          listedRemovalIds,
          totalAmountOfRemovals,
          totalAmountOfSuppliers, // todo
          totalAmountOfSupply,
          removalAmounts,
          removal,
        } = await setupTest({
          userFixtures: {
            supplier: {
              removalDataToList: {
                removals: [{ amount: 3 }, { amount: 3 }, { amount: 4 }],
              },
            },
          },
        });
        const removalIdToReserve = listedRemovalIds[0];
        const removalAmountToReserve = removalAmounts[0];
        await fifoMarket.reserveRemoval(removalIdToReserve);
        const [
          totalListedSupply,
          totalActiveSupply,
          totalReservedSupply,
          numberOfActiveRemovals,
          // activeSupplierCount,// todo
        ] = await Promise.all([
          removal.cumulativeBalanceOf(fifoMarket.address),
          fifoMarket.totalActiveSupply(),
          fifoMarket.totalReservedSupply(),
          fifoMarket.numberOfActiveRemovals(),
          // fifoMarket.activeSupplierCount(), // todo
        ]);
        expect(totalListedSupply.sub(removalAmountToReserve))
          .to.equal(totalAmountOfSupply.sub(removalAmountToReserve))
          .and.to.equal(totalActiveSupply);
        expect(numberOfActiveRemovals.toNumber()).to.equal(
          totalAmountOfRemovals - 1 // todo use bn for everything
        );
        // expect(activeSupplierCount.toNumber()).to.equal(totalAmountOfSuppliers); // todo
        expect(totalReservedSupply).to.equal(removalAmountToReserve);
      });
      it('updates totalActiveSupply, totalReservedSupply, and numberOfActiveRemovals when a removal is unreserved', async () => {
        const {
          fifoMarket,
          listedRemovalIds,
          totalAmountOfRemovals,
          totalAmountOfSuppliers, // todo
          totalAmountOfSupply,
          removal,
        } = await setupTest({
          userFixtures: {
            supplier: {
              removalDataToList: {
                removals: [{ amount: 3 }, { amount: 3 }, { amount: 4 }],
              },
            },
          },
        });
        const removalIdToReserve = listedRemovalIds[0];
        await fifoMarket.reserveRemoval(removalIdToReserve);
        await fifoMarket.unreserveRemoval(removalIdToReserve);
        const [
          totalActiveSupply,
          totalReservedSupply,
          numberOfActiveRemovals,
          // activeSupplierCount,// todo
        ] = await Promise.all([
          removal.cumulativeBalanceOf(fifoMarket.address), // todo inconsistency in variable `totalActiveSupply` across tests (Sometimes retrieved from fifoMarket.totalActiveSupply, sometimes from removal.cummulativeBalanceOF)
          fifoMarket.totalReservedSupply(),
          fifoMarket.numberOfActiveRemovals(),
          // fifoMarket.activeSupplierCount(),// todo
        ]);
        expect(totalActiveSupply).to.equal(totalAmountOfSupply);
        expect(numberOfActiveRemovals.toNumber()).to.equal(
          totalAmountOfRemovals
        );
        // expect(activeSupplierCount.toNumber()).to.equal(totalAmountOfSuppliers);// todo
        expect(totalReservedSupply).to.equal(0);
      });
      it('should update activeSupplierCount when the last removal from a supplier is reserved', async () => {
        const { fifoMarket, listedRemovalIds, totalAmountOfSupply, removal } =
          await setupTest({
            userFixtures: {
              supplier: {
                removalDataToList: {
                  removals: [{ amount: 3 }],
                },
              },
            },
          });
        const removalIdToReserve = listedRemovalIds[0];
        await fifoMarket.reserveRemoval(removalIdToReserve);
        const [
          cumulativeBalanceOfMarket,
          totalReservedSupply,
          totalActiveSupply,
          numberOfActiveRemovals,
          // activeSupplierCount,// todo
        ] = await Promise.all([
          removal.cumulativeBalanceOf(fifoMarket.address), // todo inconsistency in variable `totalActiveSupply` across tests (Sometimes retrieved from fifoMarket.totalActiveSupply, sometimes from removal.cummulativeBalanceOF)
          fifoMarket.totalReservedSupply(),
          fifoMarket.totalActiveSupply(),
          fifoMarket.numberOfActiveRemovals(),
          // fifoMarket.activeSupplierCount(),// todo
        ]);
        expect(totalActiveSupply)
          .to.equal(Zero)
          .and.to.equal(numberOfActiveRemovals);
        // .and.to.equal(activeSupplierCount);// todo
        expect(totalReservedSupply)
          .to.be.gt(Zero)
          .and.to.be.equal(cumulativeBalanceOfMarket)
          .and.to.be.equal(totalAmountOfSupply);
      });
    });
    describe('restricted tokens', () => {
      it('should correctly route restricted tokens to the RestrictedNORI contract', async () => {
        const projectId1 = 1_111_111_111;
        const projectId2 = 2_222_222_222;
        const project1HoldbackPercentage = BigNumber.from(30);
        const project2HoldbackPercentage = BigNumber.from(40);
        const project2RemovalData = [{ amount: 100 }];
        const testSetup = await setupTest({
          userFixtures: {
            supplier: {
              removalDataToList: {
                projectId: projectId1,
                holdbackPercentage: project1HoldbackPercentage,
                removals: [{ amount: 100 }],
              },
            },
          },
        });
        await batchMintAndListRemovalsForSale({
          ...testSetup,
          removalDataToList: {
            removals: project2RemovalData,
            projectId: projectId2,
            holdbackPercentage: project2HoldbackPercentage,
          },
        });
        const { bpNori, fifoMarket, rNori, hre, feePercentage, userFixtures } =
          testSetup;
        const { supplier, buyer, noriWallet } = hre.namedSigners;
        const purchaseAmount = formatTokenAmount(200);
        const fee = purchaseAmount.mul(feePercentage).div(100);
        const value = purchaseAmount.add(fee);
        const supplierInitialNoriBalance = formatTokenAmount(0);
        const noriInitialNoriBalance = formatTokenAmount(0);
        const { v, r, s } = await buyer.permit({
          verifyingContract: bpNori,
          spender: fifoMarket.address,
          value,
        });
        await fifoMarket
          .connect(buyer)
          .swap(buyer.address, value, MaxUint256, v, r, s);
        const scheduleSummaries = await rNori.batchGetScheduleSummaries([
          projectId1,
          projectId2,
        ]);
        const buyerFinalNoriBalance = await bpNori.balanceOf(buyer.address);
        const supplierFinalNoriBalance = await bpNori.balanceOf(
          supplier.address
        );
        const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet.address);
        expect(buyerFinalNoriBalance).to.equal(
          userFixtures.buyer.bpBalance.sub(value)
        );
        expect(supplierFinalNoriBalance).to.equal(
          supplierInitialNoriBalance
            .add(purchaseAmount)
            .sub(project1HoldbackPercentage.add(project2HoldbackPercentage))
        );
        expect(noriFinalNoriBalance).to.equal(noriInitialNoriBalance.add(fee));
        compareScheduleSummaryStructs(scheduleSummaries[0], {
          totalSupply: project1HoldbackPercentage,
          tokenHolders: [supplier.address],
        });
        compareScheduleSummaryStructs(scheduleSummaries[1], {
          totalSupply: project2HoldbackPercentage,
          tokenHolders: [supplier.address],
        });
      });
    });
    describe('swap', () => {
      it('should be able to purchase removals', async () => {
        const {
          bpNori,
          certificate,
          fifoMarket,
          hre,
          feePercentage,
          userFixtures,
        } = await setupTest({
          userFixtures: {
            supplier: {
              removalDataToList: {
                removals: [{ amount: 100 }],
              },
            },
          },
        });
        const purchaseAmount = formatTokenAmount(1);
        const fee = purchaseAmount.mul(feePercentage).div(100);
        const value = purchaseAmount.add(fee);
        const { buyer, investor1 } = hre.namedSigners;
        const deadline = MaxUint256;
        const { v, r, s } = await buyer.permit({
          verifyingContract: bpNori,
          spender: fifoMarket.address,
          value,
        });
        expect(await bpNori.balanceOf(hre.namedAccounts.buyer)).to.equal(
          userFixtures.buyer.bpBalance
        );
        // expect(await certificate.balanceOf(investor1.address, 0)).to.equal(0); // todo
        await fifoMarket
          .connect(buyer)
          .swap(investor1.address, value, deadline, v, r, s);
        expect(await bpNori.balanceOf(hre.namedAccounts.buyer)).to.equal(
          userFixtures.buyer.bpBalance.sub(value)
        );
        // expect(
        //   await certificate.balanceOf(hre.namedAccounts.investor1, 0) // todo
        // ).to.equal(purchaseAmount);
        // TODO: check that removals are getting burned correctly?
        // todo track balances using a class and before/after snapshotting
      });
    });
  });
  describe('purchasing from a specified supplier', () => {
    it('should purchase supply from a specific supplier when they have enough supply', async () => {
      const {
        bpNori,
        removal,
        certificate,
        fifoMarket,
        feePercentage,
        totalAmountOfSupply,
      } = await setupTest({
        userFixtures: {
          supplier: {
            removalDataToList: {
              removals: [
                { amount: 10, supplierAddress: hre.namedAccounts.supplier }, // 2 removals each for 2 different suppliers
                { amount: 10, supplierAddress: hre.namedAccounts.supplier },
                { amount: 10, supplierAddress: hre.namedAccounts.investor1 },
                { amount: 10, supplierAddress: hre.namedAccounts.investor1 },
              ],
            },
          },
        },
      });
      const purchaseAmount = totalAmountOfSupply.div(2); // purchase half of supply, exactly two full removal tokens
      const fee = purchaseAmount.mul(feePercentage).div(100);
      const value = purchaseAmount.add(fee);
      const supplierInitialNoriBalance = formatTokenAmount(0);
      const investor1InitialNoriBalance = formatTokenAmount(0);
      const { buyer } = hre.namedSigners;
      const { v, r, s } = await buyer.permit({
        verifyingContract: bpNori,
        spender: fifoMarket.address,
        value,
      });
      await fifoMarket
        .connect(buyer)
        .swapFromSpecificSupplier(
          buyer.address,
          value,
          hre.namedAccounts.supplier,
          MaxUint256,
          v,
          r,
          s
        );
      const [supplierFinalNoriBalance, investor1FinalNoriBalance] =
        await Promise.all([
          bpNori.balanceOf(hre.namedAccounts.supplier),
          bpNori.balanceOf(hre.namedAccounts.investor1),
        ]);
      expect(supplierFinalNoriBalance).to.equal(
        supplierInitialNoriBalance.add(purchaseAmount)
      );
      expect(investor1FinalNoriBalance).to.equal(investor1InitialNoriBalance);
      // const sources = await certificate.sources(0);// todo
      // expect(sources.length).to.equal(2);
      // const decodedRemovalIds = await Promise.all(
      //   sources.map((source) => removal.unpackRemovalIdV0(source.removalId))
      // );
      // expect(decodedRemovalIds.map((e) => e.supplierAddress)).to.deep.equal(
      //   Array.from({ length: decodedRemovalIds.length }).fill(
      //     hre.namedAccounts.supplier
      //   )
      // );
    });
    it('should revert when purchasing supply from a specific supplier who does not have enough supply', async () => {
      const { bpNori, fifoMarket, feePercentage } = await setupTest({
        userFixtures: {
          supplier: {
            removalDataToList: {
              removals: [
                { amount: 10, supplierAddress: hre.namedAccounts.supplier }, // 2 removals each for 2 different suppliers
                { amount: 10, supplierAddress: hre.namedAccounts.supplier },
                { amount: 10, supplierAddress: hre.namedAccounts.investor1 },
                { amount: 10, supplierAddress: hre.namedAccounts.investor1 },
              ],
            },
          },
        },
      });
      const purchaseAmount = formatTokenAmount(30); // enough total supply, not enough from specific supplier
      const fee = purchaseAmount.mul(feePercentage).div(100);
      const value = purchaseAmount.add(fee);
      const { buyer } = hre.namedSigners;
      const { v, r, s } = await buyer.permit({
        verifyingContract: bpNori,
        spender: fifoMarket.address,
        value,
      });
      await expect(
        fifoMarket
          .connect(buyer)
          .swapFromSpecificSupplier(
            buyer.address,
            value,
            hre.namedAccounts.supplier,
            MaxUint256,
            v,
            r,
            s
          )
      ).to.be.revertedWith('InsufficientSupply()');
    });
    it('should revert when purchasing supply from a specific supplier who does not exist in the market', async () => {
      const { bpNori, fifoMarket, feePercentage } = await setupTest({
        userFixtures: {
          supplier: {
            removalDataToList: {
              removals: [
                { amount: 10, supplierAddress: hre.namedAccounts.supplier }, // 2 removals each for 2 different suppliers
                { amount: 10, supplierAddress: hre.namedAccounts.supplier },
                { amount: 10, supplierAddress: hre.namedAccounts.investor1 },
                { amount: 10, supplierAddress: hre.namedAccounts.investor1 },
              ],
            },
          },
        },
      });
      const purchaseAmount = formatTokenAmount(30); // enough total supply, but not enough from specific supplier
      const fee = purchaseAmount.mul(feePercentage).div(100);
      const value = purchaseAmount.add(fee);
      const { buyer } = hre.namedSigners;
      const { v, r, s } = await buyer.permit({
        verifyingContract: bpNori,
        spender: fifoMarket.address,
        value,
      });
      await expect(
        fifoMarket
          .connect(buyer)
          .swapFromSpecificSupplier(
            buyer.address,
            value,
            hre.namedAccounts.investor2,
            MaxUint256,
            v,
            r,
            s
          )
      ).to.be.revertedWith('InsufficientSupply()');
    });
  });
});
