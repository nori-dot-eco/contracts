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
          [0],
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
  describe('mint', () => {
    it('should implement _beforeTokenTransfer', async () => {
      const { mockERC1155PresetPausableNonTransferrable, hre } =
        await setupTest();
      await expect(
        mockERC1155PresetPausableNonTransferrable
          .connect(hre.namedSigners.admin)
          .mint(
            hre.namedAccounts.buyer,
            0, // todo assign fixture before test and use values here
            1,
            '0x'
          )
      ).to.emit(
        mockERC1155PresetPausableNonTransferrable,
        'BeforeTokenTransfer'
      );
    });
  });
  describe('burn', () => {
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
          .burn(
            hre.namedAccounts.buyer,
            0, // todo assign fixture before test and use values here
            1
          )
      ).to.emit(
        mockERC1155PresetPausableNonTransferrable,
        'BeforeTokenTransfer'
      );
    });
  });
  describe('burnBatch', () => {
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
          .burnBatch(
            hre.namedAccounts.buyer,
            [0], // todo assign fixture before test and use values here
            [1]
          )
      ).to.emit(
        mockERC1155PresetPausableNonTransferrable,
        'BeforeTokenTransfer'
      );
    });
  });
  describe('_beforeTokenTransfer', () => {
    describe('error', () => {
      it('should revert when transferring using an account that is missing the `CERTIFICATE_OPERATOR_ROLE` role', async () => {
        const { mockERC1155PresetPausableNonTransferrable, hre } =
          await setupTest();
        await expect(
          mockERC1155PresetPausableNonTransferrable
            .connect(hre.namedSigners.buyer)
            ._test_beforeTokenTransfer(
              hre.namedAccounts.buyer,
              hre.namedAccounts.buyer,
              hre.namedAccounts.admin,
              [0],
              [1],
              '0x'
            )
        ).to.revertedWith('ForbiddenTransferAfterMinting');
      });
      it('should revert when paused', async () => {
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
        ).to.revertedWith('ERC1155Pausable: token transfer while paused');
      });
    });
    describe('success', () => {
      it('should not revert when minting', async () => {
        const { mockERC1155PresetPausableNonTransferrable, hre } =
          await setupTest();
        await expect(
          mockERC1155PresetPausableNonTransferrable
            .connect(hre.namedSigners.admin)
            ._test_beforeTokenTransfer(
              hre.namedAccounts.admin,
              hre.ethers.constants.AddressZero, // indicates minting
              hre.namedAccounts.buyer,
              [0],
              [1],
              '0x'
            )
        ).not.to.reverted;
      });
      it('should not revert when transferring using an account that has the `CERTIFICATE_OPERATOR_ROLE` rule', async () => {
        const { mockERC1155PresetPausableNonTransferrable, hre } =
          await setupTest();
        await expect(
          mockERC1155PresetPausableNonTransferrable
            .connect(hre.namedSigners.admin)
            ._test_beforeTokenTransfer(
              hre.namedAccounts.admin, // operator with CERTIFICATE_OPERATOR_ROLE
              hre.namedAccounts.buyer, // initial owner of token
              hre.namedAccounts.investor1, // new owner of token
              [0],
              [1],
              '0x'
            )
        ).not.to.reverted;
      });
      it('should not revert when burning', async () => {
        const { mockERC1155PresetPausableNonTransferrable, hre, userFixtures } =
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
                },
              },
            },
          });
        const [{ removalId, removalAmount, to: tokenOwner }] =
          userFixtures.buyer.mockERC1155PresetPausableNonTransferrableFixtures!
            .tokens!;
        await expect(
          mockERC1155PresetPausableNonTransferrable
            .connect(hre.namedSigners.buyer)
            ._test_beforeTokenTransfer(
              tokenOwner,
              tokenOwner,
              hre.ethers.constants.AddressZero, // indicates burning
              [removalId],
              [removalAmount],
              '0x'
            )
        ).not.to.reverted;
      });
    });
  });
});
