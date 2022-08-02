import { MaxUint256 } from '@/constants/units';
import {
  expect,
  setupTest,
} from '@/test/helpers';
import { formatTokenAmount } from '@/utils/units';
import sinon from 'sinon';

describe('Certificate', () => {
  it('should emit a RemovalReleased event when a removal is released from the Certificate', async () => {
    const removalAmount = 3;
    const { bpNori, certificate, market, removal, listedRemovalIds } =
      await setupTest({
        userFixtures: {
          supplier: {
            removalDataToList: {
              removals: [{ amount: removalAmount }],
            },
          },
        },
      });
    const removalId = listedRemovalIds[0];
    const purchaseAmount = formatTokenAmount(1);
    const value = await market.getCheckoutTotal(purchaseAmount); // todo use getCheckoutTotal globally
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
    const formattedRemovalAmount = formatTokenAmount(removalAmount);
    await expect(removal.release(removalId, formattedRemovalAmount))
      .to.emit(certificate, 'RemovalReleased')
      .withArgs(removalId, formattedRemovalAmount);
  });
  it('should emit a ReceiveRemovalBatch event when Certificate is created', async () => {
    const removalAmount = 3;
    const { bpNori, certificate, market, removal, listedRemovalIds } =
      await setupTest({
        userFixtures: {
          supplier: {
            removalDataToList: {
              removals: [{ amount: removalAmount }],
            },
          },
        },
      });
    const removalId = listedRemovalIds[0];
    const purchaseAmount = formatTokenAmount(1);
    const value = await market.getCheckoutTotal(purchaseAmount); // todo use getCheckoutTotal globally
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
    )
      .to.emit(certificate, 'ReceiveRemovalBatch')
      .withArgs(
        removal.address,
        buyer.address,
        sinon.match.any, // TODO: How to get CertificateId here?
        [removalId],
        [removalAmount]
      );
  });
});
