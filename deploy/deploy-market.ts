import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  STAGING_NORI_FEE_WALLET_ADDRESS,
  PROD_NORI_FEE_WALLET_ADDRESS,
} from '@/constants/addresses';
import { deployMarketContract, finalizeDeployments } from '@/utils/deploy';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deploy-market`);
  const feeWallet = ['hardhat', 'localhost'].includes(hre.network.name)
    ? hre.namedAccounts.noriWallet
    : hre.network.name === 'polygon'
    ? PROD_NORI_FEE_WALLET_ADDRESS
    : STAGING_NORI_FEE_WALLET_ADDRESS;
  const contract = await deployMarketContract({
    hre,
    feeWallet,
    feePercentage: 25,
    priceMultiple: 2000,
  });
  await finalizeDeployments({ hre, contracts: { Market: contract } });
};

export default deploy;
deploy.tags = ['Market', 'market'];
deploy.dependencies = [
  // 'preconditions',
  // 'Removal',
  // 'Certificate',
  // 'BridgedPolygonNORI',
  // 'RestrictedNORI',
];
// if (hre.network.name !== 'polygon') {
//   deploy.dependencies = [...deploy.dependencies, 'NoriUSDC'];
// }
// deploy.skip = async (hre) =>
//   Promise.resolve(
//     !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
//   );
