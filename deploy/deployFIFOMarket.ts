import { Logger, LogLevel } from '@ethersproject/logger';
import { DeployFunction } from 'hardhat-deploy/types';
import {
  STAGING_NORI_FEE_WALLET_ADDRESS,
  PROD_NORI_FEE_WALLET_ADDRESS,
} from '../constants/addresses';
import { deployFIFOMarketContract, finalizeDeployments } from '../utils/deploy';
import { getCertificate } from '../utils/contracts';

export const deploy: DeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.log(`deployFIFOMarket`);
  const feeWallet =
    hre.network.name === 'hardhat'
      ? hre.namedAccounts.noriWallet
      : hre.network.name === 'polygon'
      ? PROD_NORI_FEE_WALLET_ADDRESS
      : STAGING_NORI_FEE_WALLET_ADDRESS;
  const contract = await deployFIFOMarketContract({
    hre,
    feeWallet: feeWallet,
    feePercentage: 15,
  });
  const signer = (await hre.getSigners())[0]; 
  const certificate = await getCertificate({ hre, signer });
  // TODO: Query first and only make this call if FIFOMarket is not already a minter.
  await certificate.addMinter(contract.address); // todo stop doing this during deployment for cypress tests (use run('nori mint ...') in tests instead)
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
  !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name);
