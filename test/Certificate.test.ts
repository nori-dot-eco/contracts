import type { BigNumberish, BigNumber } from 'ethers';

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

describe('Certificate', () => {
  it('should emit a CertificateCreated event when a certificate is minted', async () => {
    const buyerInitialBPNoriBalance = formatTokenAmount(1_000_000);
    const removalDataToList = [{ amount: 3 }, { amount: 3 }, { amount: 4 }];
    const { bpNori, certificate, fifoMarket, hre, listedRemovalIds } =
      await setupTestLocal({
        buyerInitialBPNoriBalance,
        removalDataToList,
      });
    const removalAmounts = removalDataToList.map((data) => data.amount);
    const { buyer } = hre.namedAccounts;

    const purchaseAmount = '10'; // purchase all supply
    const fee = '1.5';
    const totalPrice = (Number(purchaseAmount) + Number(fee)).toString();

    expect(
      await bpNori
        .connect(hre.namedSigners.buyer)
        .send(
          fifoMarket.address,
          hre.ethers.utils.parseUnits(totalPrice),
          hre.ethers.utils.hexZeroPad(buyer, 32)
        )
    )
      .to.emit(certificate, 'CertificateCreated')
      .withArgs(buyer, 0, listedRemovalIds, removalAmounts);
  });
});
