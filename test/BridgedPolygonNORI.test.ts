import type {
  BridgedPolygonNORI,
  BridgedPolygonNORI__factory,
} from '@/typechain-types';
import { setupTest, expect } from '@/test/helpers';

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
});
