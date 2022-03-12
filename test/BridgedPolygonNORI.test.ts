import type { BridgedPolygonNORI__factory } from '../typechain-types';

import type { BridgedPolygonNORI } from '@/typechain-types/BridgedPolygonNORI';
import type { Contracts } from '@/utils/deploy';
import type { ContractInstances } from '@/test/helpers';
import { expect, mockDepositNoriToPolygon } from '@/test/helpers'; // todo deprecate exported hardhat, use hre from @/utils
import { formatTokenAmount } from '@/utils/units';
import { deploy } from '@/deploy/0_deploy_contracts';

// todo use hardhat-deploy fixtures (https://github.com/wighawag/hardhat-deploy#3-hardhat-test) (requires this to be fixed: https://github.com/cgewecke/hardhat-gas-reporter/issues/86)
const setupTest = hre.deployments.createFixture(
  async (): Promise<
    ContractInstances & { hre: CustomHardHatRuntimeEnvironment }
  > => {
    const hre = global.hre;
    const contracts = (await deploy(hre)) as Required<Contracts>;
    await mockDepositNoriToPolygon({
      hre,
      contracts,
      amount: formatTokenAmount(500_000_000),
      to: hre.namedAccounts.admin,
      signer: hre.namedSigners.admin,
    });
    return {
      hre,
      nori: contracts.NORI,
      bpNori: contracts.BridgedPolygonNORI,
      removal: contracts.Removal,
      certificate: contracts.Certificate,
      fifoMarket: contracts.FIFOMarket,
      lNori: contracts.LockedNORI,
    };
  }
);
describe('BridgedPolygonNORI', () => {
  describe('initialization', () => {
    describe('initialize()', () => {
      it('should revert when trying to call the inherited initializer that mints', async () => {
        const { hre } = await setupTest(); // todo don't deploy
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
