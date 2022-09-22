import sinon from 'sinon';

import { MaxUint256 } from '@/constants/units';
import { expect, setupTest } from '@/test/helpers';
import { formatTokenAmount } from '@/utils/units';

describe('Certificate', () => {
  it('should emit a RemovalReleased event when a removal is released from the Certificate', async () => {
    const removalAmount = 3;
    const {
      bpNori,
      certificate,
      market,
      removal,
      listedRemovalIds,
      removalTestHarness,
    } = await setupTest({
      userFixtures: {
        supplier: {
          removalDataToList: {
            removals: [{ amount: removalAmount }],
          },
        },
      },
    });
    const removalId = await removalTestHarness.createRemovalId(
      listedRemovalIds[0]
    );
    const purchaseAmount = formatTokenAmount(1);
    const value = await market.calculateCheckoutTotal(purchaseAmount); // todo use calculateCheckoutTotal globally
    const { buyer } = hre.namedSigners;
    const { v, r, s } = await buyer.permit({
      verifyingContract: bpNori,
      spender: market.address,
      value,
    });
    await market
      .connect(buyer)
      .swapFromSupplier(
        buyer.address,
        value,
        hre.namedAccounts.supplier,
        MaxUint256,
        v,
        r,
        s
      );
    const formattedRemovalAmount = formatTokenAmount(removalAmount);
    await expect(removal.release(removalId, formattedRemovalAmount))
      .to.emit(certificate, 'RemovalReleased')
      .withArgs(0, removalId, purchaseAmount);
  });
  it('should emit a ReceiveRemovalBatch event when Certificate is created', async () => {
    const removalAmount = 3;
    const {
      bpNori,
      certificate,
      market,
      removal,
      listedRemovalIds,
      removalTestHarness,
    } = await setupTest({
      userFixtures: {
        supplier: {
          removalDataToList: {
            removals: [{ amount: removalAmount }],
          },
        },
      },
    });
    const purchaseAmount = formatTokenAmount(1);
    const value = await market.calculateCheckoutTotal(purchaseAmount); // todo use calculateCheckoutTotal globally
    const { buyer } = hre.namedSigners;
    const { v, r, s } = await buyer.permit({
      verifyingContract: bpNori,
      spender: market.address,
      value,
    });
    const removalId = await removalTestHarness.createRemovalId(
      listedRemovalIds[0]
    );
    await expect(
      market
        .connect(buyer)
        .swapFromSupplier(
          buyer.address,
          value,
          hre.namedAccounts.supplier,
          MaxUint256,
          v,
          r,
          s
        )
    )
      .to.emit(certificate, 'ReceiveRemovalBatch')
      .withArgs(
        removal.address,
        buyer.address,
        0,
        [removalId],
        [purchaseAmount]
      );
  });
});
