import type { ContractReceipt } from 'ethers';
import { BigNumber } from 'ethers';

import { MaxUint256, Zero } from '@/constants/units';
import {
  setupTest,
  expect,
  batchMintAndListRemovalsForSale,
} from '@/test/helpers';
import { compareScheduleSummaryStructs } from '@/test/helpers/restricted-nori';
import { formatTokenAmount } from '@/utils/units';

describe('Market', () => {
  describe('initialization', () => {
    describe('roles', () => {
      for (const { role } of [
        { role: 'DEFAULT_ADMIN_ROLE' },
        { role: 'ALLOWLIST_ROLE' },
      ] as const) {
        it(`will assign the role ${role} to the deployer and set the DEFAULT_ADMIN_ROLE as the role admin`, async () => {
          const { market, hre } = await setupTest();
          expect(
            await market.hasRole(await market[role](), hre.namedAccounts.admin)
          ).to.be.true;
          expect(await market.getRoleAdmin(await market[role]())).to.eq(
            await market.DEFAULT_ADMIN_ROLE()
          );
          expect(await market.getRoleMemberCount(await market[role]())).to.eq(
            1
          );
        });
      }
    });
    it('correctly initializes cumulativeActiveSupply, cumulativeReservedSupply, numberOfActiveRemovals, activeSupplierCount, and priorityRestrictedThreshold', async () => {
      const { market, removal } = await setupTest();
      const initialSupply = await Promise.all([
        removal.getMarketBalance(),
        removal.numberOfTokensOwnedByAddress(market.address),
        // market.activeSupplierCount(),// todo
        market.priorityRestrictedThreshold(),
      ]);
      expect(initialSupply.map((e) => e.toString())).to.deep.equal(
        Array.from({ length: 3 }).fill(Zero.toString())
      );
    });
  });
  describe('role access', () => {
    describe('DEFAULT_ADMIN_ROLE', () => {
      it(`should allow accounts with the role "DEFAULT_ADMIN_ROLE" to set the priority restricted threshold while accounts without this role cannot`, async () => {
        const role = 'DEFAULT_ADMIN_ROLE';
        const accountWithRole = 'admin';
        const accountWithoutRole = 'buyer';
        const { market, hre } = await setupTest();
        const { namedAccounts, namedSigners } = hre;
        const roleId = await market[role]();
        expect(await market.hasRole(roleId, namedAccounts[accountWithRole])).to
          .be.true;
        const newThreshold = formatTokenAmount(100);
        await expect(
          market
            .connect(namedSigners[accountWithRole])
            .setPriorityRestrictedThreshold(newThreshold)
        )
          .to.emit(market, 'PriorityRestrictedThresholdSet')
          .withArgs(newThreshold);
        expect(await market.priorityRestrictedThreshold()).to.equal(
          newThreshold
        );
        await expect(
          market
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
        const { bpNori, market, hre } = await setupTest({
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
        await market.setPriorityRestrictedThreshold(
          // todo contract fixtures
          priorityRestrictedThreshold
        );
        const roleId = await market[role]();
        expect(await market.hasRole(roleId, namedAccounts[accountWithRole])).to
          .be.true;
        const { v, r, s } = await namedSigners[accountWithRole].permit({
          verifyingContract: bpNori,
          spender: market.address,
          value,
        });
        await expect(
          market
            .connect(namedSigners[accountWithRole])
            .swap(namedAccounts[accountWithRole], value, MaxUint256, v, r, s)
        ).not.to.be.reverted;
      });
      it(`should revert when an account that is not on the allowlist tries purchase supply when inventory is below the threshold`, async () => {
        const { bpNori, market, hre, totalAmountOfSupply } = await setupTest({
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
        await market.setPriorityRestrictedThreshold(
          priorityRestrictedThreshold
        );
        const roleId = await market.ALLOWLIST_ROLE();
        expect(await market.hasRole(roleId, accountWithoutRole.address)).to.be
          .false;
        const { v, r, s } = await accountWithoutRole.permit({
          verifyingContract: bpNori,
          spender: market.address,
          value: totalAmountOfSupply,
        });
        await expect(
          market
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
  });
  describe('inventory inspection', () => {
    // describe('nextRemovalForSale', () => {
    //   describe('when there is no inventory', () => {
    //     it('should return 0', async () => {
    //       const { market } = await setupTest();
    //       expect(await market.nextRemovalForSale(true)).to.equal(
    //         Zero
    //       );
    //     });
    //     it('should have defined behavior if there are multiple removals and all of them were purchased', async () => {
    //       const { bpNori, market, hre } = await setupTestLocal({
    //         removalDataToList: {removals:[{ amount: 5 }, { amount: 5 }, { amount: 5 }]},
    //       });
    //       const { buyer } = hre.namedAccounts;
    //       const purchaseAmount = 15; // purchase all removals
    //       const fee = 2.25;
    //       const totalPrice = purchaseAmount + fee;
    //       await bpNori
    //         .connect(hre.namedSigners.buyer)
    //         .send(
    //           market.address,
    //           hre.ethers.utils.parseUnits(totalPrice.toString()),
    //           hre.ethers.utils.hexZeroPad(buyer, 32)
    //         );
    //       expect(await market.nextRemovalForSale(true)).to.equal(
    //         Zero
    //       );
    //     });
    //   });
    //   describe('when inventory is above priority restricted threshold', () => {
    //     it('should correctly report the next removal for sale', async () => {
    //       const { market, listedRemovalIds } = await setupTestLocal({
    //         removalDataToList: [{ amount: 100 }],
    //       });
    //       // exclude restricted supply to make sure we still see a removal id returned
    //       expect(await market.nextRemovalForSale(false)).to.equal(
    //         listedRemovalIds[0]
    //       );
    //     });
    //     it('should correctly report the next removal for sale if there are multiple removals and some were purchased', async () => {
    //       const { bpNori, market, hre, listedRemovalIds } =
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
    //           market.address,
    //           hre.ethers.utils.parseUnits(totalPrice),
    //           hre.ethers.utils.hexZeroPad(buyer, 32)
    //         );
    //       // exclude restricted supply to make sure we still see a removal id returned
    //       expect(await market.nextRemovalForSale(false)).to.equal(
    //         listedRemovalIds[2]
    //       );
    //     });
    //   });
    //   describe('when inventory is below priority restricted threshold', () => {
    //     it('should report the next removal for sale if including restricted supply', async () => {
    //       const priorityThreshold = '200';
    //       const totalInventory = 100;
    //       const { market, listedRemovalIds } = await setupTestLocal({
    //         removalDataToList: [{ amount: totalInventory }],
    //       });
    //       await market.setPriorityRestrictedThreshold(
    //         ethers.utils.parseUnits(priorityThreshold)
    //       );
    //       expect(await market.nextRemovalForSale(true)).to.equal(
    //         listedRemovalIds[0]
    //       );
    //     });
    //     it('should return 0 if excluding restricted supply', async () => {
    //       const priorityThreshold = '200';
    //       const totalInventory = 100;
    //       const { market } = await setupTestLocal({
    //         removalDataToList: [{ amount: totalInventory }],
    //       });
    //       await market.setPriorityRestrictedThreshold(
    //         ethers.utils.parseUnits(priorityThreshold)
    //       );
    //       expect(await market.nextRemovalForSale(false)).to.equal(
    //         Zero
    //       );
    //     });
    //   });
    // });
    describe('total listed supply', () => {
      it('should correctly report the number of NRTs for sale when there are multiple removals in inventory', async () => {
        const { market, removal, totalAmountOfSupply } = await setupTest({
          userFixtures: {
            supplier: {
              removalDataToList: {
                removals: [{ amount: 3 }, { amount: 3 }, { amount: 4 }],
              },
            },
          },
        });
        const totalListedSupply = await removal.getMarketBalance();
        expect(totalListedSupply).to.equal(totalAmountOfSupply);
      });
      it('should correctly report the number of NRTs for sale when there are multiple removals in inventory and some were purchased', async () => {
        const {
          bpNori,
          market,
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
          spender: market.address,
          value,
        });
        await market
          .connect(buyer)
          .swap(buyer.address, value, MaxUint256, v, r, s);
        const expectedRemainingSupply = totalAmountOfSupply.sub(purchaseAmount);
        const totalListedSupply = await removal.getMarketBalance();
        expect(totalListedSupply).to.equal(expectedRemainingSupply);
      });
      it('should correctly report the number of NRTs for sale when there is no inventory', async () => {
        const { market, removal } = await setupTest({});
        expect(await removal.getMarketBalance())
          .to.equal(0)
          .and.to.equal(await removal.getMarketBalance());
      });
    });
  });
  describe('when listing supply in the market', () => {
    it('should update cumulativeActiveSupply, numberOfActiveRemovals, and activeSupplierCount when a new supplier is added', async () => {
      const {
        market,
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
      const [cumulativeActiveSupply, numberOfActiveRemovals] =
        await Promise.all([
          removal.getMarketBalance(),
          removal.numberOfTokensOwnedByAddress(market.address),
          // market.activeSupplierCount(), // todo
        ]);
      expect(totalAmountOfSupply).to.be.gt(Zero).and.eq(cumulativeActiveSupply);
      expect(totalAmountOfRemovals)
        .to.be.gt(Zero)
        .and.eq(numberOfActiveRemovals);
      // expect(totalAmountOfSuppliers)
      //   .to.be.gt(Zero)
      //   .and.eq(activeSupplierCount); // todo
    });
    // TODO: Fix the already existing token IDs for this test
    // it('updates cumulativeActiveSupply and numberOfActiveRemovals when more removals are added for a supplier', async () => {
    //   const initialRemovals = [{ amount: 100 }];
    //   const { removal, market } = await setupTestLocal({
    //     removalDataToList: initialRemovals,
    //   });
    //   const additionalRemovals = [{ amount: 100 }];
    //   await mintSupply(additionalRemovals, removal, market);
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
    //     cumulativeActiveSupply,
    //     numberOfActiveRemovals,
    //     activeSupplierCount,
    //   ] = await Promise.all([
    //     removal.getMarketBalance(),
    //     removal.numberOfTokensOwnedByAddress(market.address),
    //     market.activeSupplierCount(),
    //   ]);
    //   expect(cumulativeActiveSupply).to.equal(
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
    // it('updates cumulativeActiveSupply and numberOfActiveRemovals, and activeSupplierCount when more removals are added for a supplier who has previously sold out', async () => {
    //   const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
    //   const initialRemovals = [{ amount: 1 }];
    //   const { bpNori, market, removal, hre } = await setupTestLocal({
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
    //       market.address,
    //       hre.ethers.utils.parseUnits(totalPrice),
    //       hre.ethers.utils.hexZeroPad(buyer, 32)
    //     );
    //   const additionalRemovals = [{ amount: 1 }];
    //   await mintSupply(additionalRemovals, removal, market);
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
    //     cumulativeActiveSupply,
    //     numberOfActiveRemovals,
    //     activeSupplierCount,
    //   ] = await Promise.all([
    //     removal.getMarketBalance(),
    //     removal.numberOfTokensOwnedByAddress(market.address),
    //     market.activeSupplierCount(),
    //   ]);
    //   expect(cumulativeActiveSupply).to.equal(
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
  //       market,
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
  //     const initialSupply = await removal.getMarketBalance();
  //     const value = purchaseAmount.add(fee);
  //     const { v, r, s } = await buyer.permit({
  //       verifyingContract: bpNori,
  //       spender: market.address,
  //       value,
  //     });
  //     await market
  //       .connect(buyer)
  //       .swap(buyer.address, value, MaxUint256, v, r, s);
  //     const buyerFinalNoriBalance = await bpNori.balanceOf(buyer.address);
  //     const supplierFinalNoriBalance = await bpNori.balanceOf(
  //       supplier.address
  //     );
  //     const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet.address);
  //     const finalSupply = await removal.getMarketBalance();
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
  //     expect(finalSupply).to.equal(initialSupply.sub(purchaseAmount));
  //   });
  //   it('should sell removals in order of vintage regardless of minting order', async () => {
  //     const testSetup = await setupTest({
  //       userFixtures: {
  //         supplier: {
  //           removalDataToList: { removals: [{ amount: 1, vintage: 2015 }] },
  //         },
  //       },
  //     });
  //     const { bpNori, market, hre, feePercentage } = testSetup;
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
  //       spender: market.address,
  //       value,
  //     });
  //     await market
  //       .connect(buyer)
  //       .swap(investor1.address, value, deadline, v, r, s);
  //     const numberOfActiveRemovals =
  //       await removal.numberOfTokensOwnedByAddress(market.address);
  //     // Roundabout way of showing that the removal used to fill the order was the removal with amount 5, not 1.
  //     expect(numberOfActiveRemovals).to.equal(2);
  //   });
  //   it('should mint a certificate with one removal per supplier in round robin order and update state variables', async () => {
  //     const {
  //       bpNori,
  //       certificate,
  //       market,
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
  //     const initialSupply = await removal.getMarketBalance();
  //     expect(initialSupply).to.equal(purchaseAmount);
  //     const { v, r, s } = await buyer.permit({
  //       verifyingContract: bpNori,
  //       spender: market.address,
  //       value,
  //     });
  //     await market
  //       .connect(buyer)
  //       .swap(buyer.address, value, MaxUint256, v, r, s);
  //     const buyerFinalNoriBalance = await bpNori.balanceOf(buyer.address);
  //     const supplierFinalNoriBalance = await bpNori.balanceOf(
  //       supplier.address
  //     );
  //     const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet.address);
  //     const finalSupply = await removal.getMarketBalance();
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
  //     expect(finalSupply).to.equal(initialSupply.sub(purchaseAmount));
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
  //       market,
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
  //     const initialSupply = await removal.getMarketBalance();
  //     const { v, r, s } = await buyer.permit({
  //       verifyingContract: bpNori,
  //       spender: market.address,
  //       value,
  //     });
  //     await market
  //       .connect(buyer)
  //       .swap(buyer.address, value, MaxUint256, v, r, s);
  //     const buyerFinalNoriBalance = await bpNori.balanceOf(buyer.address);
  //     const supplierFinalNoriBalance = await bpNori.balanceOf(
  //       supplier.address
  //     );
  //     const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet.address);
  //     const finalSupply = await removal.getMarketBalance();
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
  //     expect(finalSupply).to.equal(initialSupply.sub(purchaseAmount));
  //   });
  //   it('should mint a certificate with multiple removals after another purchase has already been made and update state variables', async () => {
  //     const {
  //       bpNori,
  //       certificate,
  //       market,
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
  //     const initialSupply = await removal.getMarketBalance();
  //     expect(initialSupply).to.equal(totalAmountOfSupply);
  //     const purchaseNrts = async (): Promise<ContractReceipt> => {
  //       const { v, r, s } = await buyer.permit({
  //         verifyingContract: bpNori,
  //         spender: market.address,
  //         value,
  //       });
  //       const tx = await market
  //         .connect(buyer)
  //         .swap(buyer.address, value, MaxUint256, v, r, s);
  //       return tx.wait();
  //     };
  //     await purchaseNrts(); // deplete some of the stock (ids 0, 1, 2)
  //     await purchaseNrts(); // purchase more removals (ids 3, 4, 5 -- tests non-zero-indexed purchases in the queue)
  //     const buyerFinalNoriBalance = await bpNori.balanceOf(buyer.address);
  //     const supplierFinalNoriBalance = await bpNori.balanceOf(supplier);
  //     const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet);
  //     const finalSupply = await removal.getMarketBalance();
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
  //     expect(finalSupply).to.equal(
  //       initialSupply.sub(doublePurchaseAmount)
  //     );
  //   });
  //   it('should correctly pay suppliers when multiple different suppliers removals are used to fulfill an order', async () => {
  //     const {
  //       bpNori,
  //       certificate,
  //       market,
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
  //     const initialSupply = await removal.getMarketBalance();
  //     const { buyer } = hre.namedSigners;
  //     const { v, r, s } = await buyer.permit({
  //       verifyingContract: bpNori,
  //       spender: market.address,
  //       value,
  //     });
  //     await market
  //       .connect(buyer)
  //       .swap(buyer.address, value, MaxUint256, v, r, s);
  //     const [
  //       buyerFinalNoriBalance,
  //       supplierFinalNoriBalance,
  //       investor1FinalNoriBalance,
  //       investor2FinalNoriBalance,
  //       noriFinalNoriBalance,
  //       finalSupply,
  //     ] = await Promise.all([
  //       bpNori.balanceOf(buyer.address),
  //       bpNori.balanceOf(hre.namedAccounts.supplier),
  //       bpNori.balanceOf(hre.namedAccounts.investor1),
  //       bpNori.balanceOf(hre.namedAccounts.investor2),
  //       bpNori.balanceOf(hre.namedAccounts.noriWallet),
  //       removal.getMarketBalance(),
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
  //     expect(finalSupply).to.equal(initialSupply.sub(purchaseAmount));
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
  //       market,
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
  //       spender: market.address,
  //       value: totalPrice,
  //     });
  //     await expect(
  //       market
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
  //       market,
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
  //       spender: market.address,
  //       value,
  //     });
  //     await expect(
  //       market
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
  //   //     market,
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
  //   //     spender: market.address,
  //   //     value,
  //   //   });
  //   //   await expect(
  //   //     market
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
  describe('restricted tokens', () => {
    it('should correctly route restricted tokens to the RestrictedNORI contract', async () => {
      const projectId1 = 1_111_111_111;
      const projectId2 = 2_222_222_222;
      const project1HoldbackPercentage = BigNumber.from(30);
      const project2HoldbackPercentage = BigNumber.from(40);
      const removalAmount = 100;
      const testSetup = await setupTest({
        userFixtures: {
          supplier: {
            removalDataToList: {
              projectId: projectId1,
              holdbackPercentage: project1HoldbackPercentage,
              removals: [{ amount: removalAmount }],
            },
          },
        },
      });
      await batchMintAndListRemovalsForSale({
        ...testSetup,
        removalDataToList: {
          removals: [{ amount: removalAmount }],
          projectId: projectId2,
          holdbackPercentage: project2HoldbackPercentage,
        },
      });
      const { bpNori, market, rNori, hre, feePercentage, userFixtures } =
        testSetup;
      const { supplier, buyer, noriWallet } = hre.namedSigners;
      const purchaseAmount = formatTokenAmount(200);
      const fee = purchaseAmount.mul(feePercentage).div(100);
      const value = purchaseAmount.add(fee);
      const supplierInitialNoriBalance = formatTokenAmount(0);
      const noriInitialNoriBalance = formatTokenAmount(0);
      const { v, r, s } = await buyer.permit({
        verifyingContract: bpNori,
        spender: market.address,
        value,
      });
      await market
        .connect(buyer)
        .swap(buyer.address, value, MaxUint256, v, r, s);
      const scheduleSummaries = await rNori.batchGetScheduleSummaries([
        projectId1,
        projectId2,
      ]);
      const buyerFinalNoriBalance = await bpNori.balanceOf(buyer.address);
      const supplierFinalNoriBalance = await bpNori.balanceOf(supplier.address);
      const noriFinalNoriBalance = await bpNori.balanceOf(noriWallet.address);
      expect(buyerFinalNoriBalance).to.equal(
        userFixtures.buyer.bpBalance.sub(value)
      );
      expect(supplierFinalNoriBalance).to.equal(
        supplierInitialNoriBalance.add(
          purchaseAmount.sub(
            formatTokenAmount(removalAmount)
              .mul(project1HoldbackPercentage)
              .div(100)
              .add(
                formatTokenAmount(removalAmount)
                  .mul(project2HoldbackPercentage)
                  .div(100)
              )
          )
        )
      );
      expect(noriFinalNoriBalance).to.equal(noriInitialNoriBalance.add(fee));
      compareScheduleSummaryStructs(scheduleSummaries[0], {
        totalSupply: formatTokenAmount(removalAmount)
          .mul(project1HoldbackPercentage)
          .div(100),
        tokenHolders: [supplier.address],
      });
      compareScheduleSummaryStructs(scheduleSummaries[1], {
        totalSupply: formatTokenAmount(removalAmount)
          .mul(project2HoldbackPercentage)
          .div(100),
        tokenHolders: [supplier.address],
      });
    });
  });
  describe('swap', () => {
    it('should be able to purchase removals', async () => {
      const { bpNori, certificate, market, hre, userFixtures } =
        await setupTest({
          userFixtures: {
            supplier: {
              removalDataToList: {
                removals: [{ amount: 100 }],
              },
            },
          },
        });
      const purchaseAmount = formatTokenAmount(1);
      const value = await market.getCheckoutTotal(purchaseAmount); // todo use getCheckoutTotal globally
      const { buyer, investor1 } = hre.namedSigners;
      const deadline = MaxUint256;
      const { v, r, s } = await buyer.permit({
        verifyingContract: bpNori,
        spender: market.address,
        value,
      });
      expect(await bpNori.balanceOf(hre.namedAccounts.buyer)).to.equal(
        userFixtures.buyer.bpBalance
      );
      // expect(await certificate.balanceOf(investor1.address, 0)).to.equal(0); // todo
      await market
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
      market,
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
      spender: market.address,
      value,
    });
    await market
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
    const { bpNori, market, feePercentage } = await setupTest({
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
    const value = await market.getCheckoutTotal(purchaseAmount);
    const { buyer } = hre.namedSigners;
    const { v, r, s } = await buyer.permit({
      verifyingContract: bpNori,
      spender: market.address,
      value,
    });
    await expect(
      market
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
    const { bpNori, market, feePercentage } = await setupTest({
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
      spender: market.address,
      value,
    });
    await expect(
      market
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
  it('should revert when purchasing supply when the market is below the priority reserved threshold', async () => {
    const { bpNori, market } = await setupTest({
      userFixtures: {
        supplier: {
          removalDataToList: {
            removals: [
              { amount: 10, supplierAddress: hre.namedAccounts.supplier },
            ],
          },
        },
      },
    });
    const priorityRestrictedThreshold = formatTokenAmount(10);
    await market.setPriorityRestrictedThreshold(priorityRestrictedThreshold);
    const purchaseAmount = formatTokenAmount(5);
    const value = await market.getCheckoutTotal(purchaseAmount);
    const { buyer } = hre.namedSigners;
    const { v, r, s } = await buyer.permit({
      verifyingContract: bpNori,
      spender: market.address,
      value,
    });
    await expect(
      market
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
    ).to.be.revertedWith('LowSupplyAllowlistRequired()');
  });
});
