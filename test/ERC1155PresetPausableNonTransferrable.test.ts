import { expect, setupTest } from '@/test/helpers';
import { createBatchMintData } from '@/test/helpers/erc-1155-preset-pausable-non-transferable';

describe('ERC1155PresetPausableNonTransferrable', () => {
  describe('mintBatch', () => {
    it('should implement _beforeTokenTransfer', async () => {
      const { mockERC1155PresetPausableNonTransferrable, hre } =
        await setupTest();
      await expect(
        mockERC1155PresetPausableNonTransferrable.mintBatch(
          hre.namedAccounts.buyer,
          [0],
          [1],
          hre.ethers.utils.defaultAbiCoder.encode(
            ['uint256'],
            Object.values({ amount: 1 })
          )
        )
      ).to.emit(
        mockERC1155PresetPausableNonTransferrable,
        'BeforeTokenTransfer'
      );
    });
  });
  describe('safeTransferFrom', () => {
    it('should implement _beforeTokenTransfer', async () => {
      const { mockERC1155PresetPausableNonTransferrable, hre } =
        await setupTest({
          userFixtures: {
            buyer: {
              mockERC1155PresetPausableNonTransferrableFixtures: {
                tokens: [
                  {
                    to: global.hre.namedAccounts.buyer,
                    removalId: 0,
                    removalAmount: 1,
                    data: createBatchMintData({ hre: global.hre, amount: 1 }),
                  },
                ],
                approvalsForAll: [global.hre.namedAccounts.admin],
              },
            },
          },
        });
      await expect(
        mockERC1155PresetPausableNonTransferrable
          .connect(hre.namedSigners.admin)
          .safeTransferFrom(
            hre.namedAccounts.buyer,
            hre.namedAccounts.investor1,
            0,
            1,
            '0x'
          )
      ).to.emit(
        mockERC1155PresetPausableNonTransferrable,
        'BeforeTokenTransfer'
      );
    });
  });

  // describe('_beforeTokenTransfer',()=>{ // MockRemoval exposes _beforeTokenTransfer as a public function
  //   it('doesnt allow minting when x')
  //   it('doesnt allow minting when y')
  // })
});
