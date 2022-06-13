import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  STAGING_NORI_FEE_WALLET_ADDRESS,
  PROD_NORI_FEE_WALLET_ADDRESS,
} from '@/constants/addresses';
import { deployFIFOMarketContract, finalizeDeployments } from '@/utils/deploy';
import { getCertificate } from '@/utils/contracts';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`deployFIFOMarket`);
  const feeWallet = ['hardhat', 'localhost'].includes(hre.network.name)
    ? hre.namedAccounts.noriWallet
    : hre.network.name === 'polygon'
    ? PROD_NORI_FEE_WALLET_ADDRESS
    : STAGING_NORI_FEE_WALLET_ADDRESS;
  const contract = await deployFIFOMarketContract({
    hre,
    feeWallet,
    feePercentage: 15,
  });
  const [signer] = await hre.getSigners();
  const certificate = await getCertificate({ hre, signer });
  if (
    !(await certificate.hasRole(
      await certificate.MINTER_ROLE(),
      contract.address
    ))
  ) {
    await certificate.addMinter(contract.address); // todo stop doing this during deployment for cypress tests (use run('nori mint ...') in tests instead)
  }
  hre.trace('Added FIFOMarket as a minter of Certificate');
  await finalizeDeployments({ hre, contracts: { FIFOMarket: contract } });
};

export default deploy;
deploy.tags = ['FIFOMarket', 'market'];
deploy.dependencies = [
  'preconditions',
  'Removal',
  'Certificate',
  'BridgedPolygonNORI',
  'seed',
];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
