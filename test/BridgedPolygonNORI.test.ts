import type {
  BridgedPolygonNORI,
  BridgedPolygonNORI__factory,
} from '@/typechain-types';
import {
  setupTest,
  expect,
  batchMintAndListRemovalsForSale,
} from '@/test/helpers';

describe('BridgedPolygonNORI', () => {
  describe('initialization', () => {
    describe('initialize()', () => {
      it('should revert when trying to call the inherited initializer that mints', async () => {
        const { hre } = await setupTest();
        const BridgedPolygonNori =
          await hre.ethers.getContractFactory<BridgedPolygonNORI__factory>(
            'BridgedPolygonNORI'
          );
        await expect(
          hre.upgrades.deployProxy<BridgedPolygonNORI>(BridgedPolygonNori, [], {
            initializer: 'initialize()',
          })
        ).revertedWith('BridgedPolygonNORI: disallowed');
      });
    });
  });
  describe('send', () => {
    it('should mint a certificate when bpNORI is sent to the FIFOMarket minted', async () => {
      const removalDataToList = [{ amount: 3 }, { amount: 3 }, { amount: 4 }];
      const testSetup = await setupTest();
      const { bpNori, certificate, fifoMarket, hre } = testSetup;
      const { listedRemovalIds, removalAmounts, totalAmountOfSupply } =
        await batchMintAndListRemovalsForSale({
          testSetup,
          removalDataToList,
        });
      const { buyer } = hre.namedAccounts;
      const fee = 1.5;
      const totalPrice = totalAmountOfSupply + fee;
      expect(
        await bpNori
          .connect(hre.namedSigners.buyer)
          .send(
            fifoMarket.address,
            hre.ethers.utils.parseUnits(totalPrice.toString()),
            hre.ethers.utils.hexZeroPad(buyer, 32)
          )
      )
        .to.emit(certificate, 'CertificateCreated')
        .withArgs(buyer, 0, listedRemovalIds, removalAmounts);
      // todo test that certificate is minted
    });
  });
});
