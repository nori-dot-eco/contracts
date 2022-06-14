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
          createBatchMintData({ amount: 1, hre })
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
  describe('safeBatchTransferFrom', () => {
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
          .safeBatchTransferFrom(
            hre.namedAccounts.buyer,
            hre.namedAccounts.investor1,
            [0], // todo assign fixture before test and use values here
            [1],
            '0x'
          )
      ).to.emit(
        mockERC1155PresetPausableNonTransferrable,
        'BeforeTokenTransfer'
      );
    });
  });
  // todo rest of BeforeTokenTransfer functions
  describe('_beforeTokenTransfer', () => {
    // todo rest of _beforeTokenTransfer rules
    describe('when paused', () => {
      it('should revert', async () => {
        const { mockERC1155PresetPausableNonTransferrable, hre } =
          await setupTest({
            contractFixtures: {
              MockERC1155PresetPausableNonTransferrable: {
                paused: true,
              },
            },
          });
        await expect(
          mockERC1155PresetPausableNonTransferrable._test_beforeTokenTransfer(
            hre.namedAccounts.admin,
            hre.namedAccounts.admin,
            hre.namedAccounts.buyer,
            [0],
            [1],
            '0x'
          )
        ).to.revertedWith('Pausable: paused');
      });
    });
    describe('when not paused', () => {
      it('should not revert', async () => {
        const { mockERC1155PresetPausableNonTransferrable, hre } =
          await setupTest();
        await expect(
          mockERC1155PresetPausableNonTransferrable._test_beforeTokenTransfer(
            hre.namedAccounts.admin,
            hre.namedAccounts.admin,
            hre.namedAccounts.buyer,
            [0],
            [1],
            '0x'
          )
        ).not.to.reverted;
      });
    });
  });
});
