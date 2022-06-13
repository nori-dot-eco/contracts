import type { BigNumberish, BigNumber } from 'ethers';

import { formatTokenAmount } from '@/utils/units';
import {
  expect,
  mockDepositNoriToPolygon,
  setupTest,
  createRemovalTokenId,
  batchMintAndListRemovalsForSale,
  createBatchMintData,
} from '@/test/helpers';

describe('Certificate', () => {
  describe('mintBatch', () => {
    it('should implement _beforeTokenTransfer', async () => {
      const { mockCertificate, hre } = await setupTest(); // todo consider always returning MockCertificate as Certificate
      await mockCertificate.addMinter(hre.namedAccounts.admin); // todo mockCertificate setup Fixture
      await expect(
        mockCertificate.mintBatch(
          hre.namedAccounts.buyer,
          [0],
          [1],
          hre.ethers.utils.defaultAbiCoder.encode(
            ['uint256'],
            Object.values({ amount: 1 })
          )
        )
      ).to.emit(mockCertificate, 'BeforeTokenTransfer');
    });
  });
  describe('safeTransferFrom', () => {
    it('should implement _beforeTokenTransfer', async () => {
      const { mockCertificate, hre } = await setupTest(); // todo consider always returning MockCertificate as Certificate
      await mockCertificate.addMinter(hre.namedAccounts.admin); // todo mockCertificate setup Fixture
      await (mockCertificate as any).addCertificateOperator(
        hre.namedAccounts.admin
      ); // todo mockCertificate setup Fixture
      await mockCertificate.mintBatch(
        // todo mockCertificate setup Fixture
        hre.namedAccounts.buyer,
        [0],
        [1],
        hre.ethers.utils.defaultAbiCoder.encode(
          ['uint256'],
          Object.values({ amount: 1 })
        )
      );
      await mockCertificate
        .connect(hre.namedSigners.buyer)
        .setApprovalForAll(hre.namedAccounts.admin, true);
      await expect(
        mockCertificate
          .connect(hre.namedSigners.admin)
          .safeTransferFrom(
            hre.namedAccounts.buyer,
            hre.namedAccounts.investor1,
            0,
            1,
            '0x'
          )
      ).to.emit(mockCertificate, 'BeforeTokenTransfer');
    });
  });

  // describe('_beforeTokenTransfer',()=>{ // MockRemoval exposes _beforeTokenTransfer as a public function
  //   it('doesnt allow minting when x')
  //   it('doesnt allow minting when y')
  // })
});
