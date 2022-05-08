import { Logger, LogLevel } from '@ethersproject/logger';
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  STAGING_NORI_FEE_WALLET_ADDRESS,
  PROD_NORI_FEE_WALLET_ADDRESS,
} from '@/constants/addresses';
import { deployFIFOMarketContract, finalizeDeployments } from '@/utils/deploy';
import { getCertificate, getSupplierVestingNORI } from '@/utils/contracts';

export const deploy: DeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(LogLevel.DEBUG);
  hre.trace(`deployFIFOMarket`);
  const feeWallet =
    hre.network.name === 'hardhat'
      ? hre.namedAccounts.noriWallet
      : hre.network.name === 'polygon'
      ? PROD_NORI_FEE_WALLET_ADDRESS
      : STAGING_NORI_FEE_WALLET_ADDRESS;
  const contract = await deployFIFOMarketContract({
    hre,
    feeWallet,
    feePercentage: 15,
  });
  const signer = (await hre.getSigners())[0];
  const certificate = await getCertificate({ hre, signer });
  if (
    !(await certificate.hasRole(
      await certificate.MINTER_ROLE(),
      contract.address
    ))
  ) {
    await certificate.addMinter(contract.address);
  }
  hre.trace('Added FIFOMarket as a minter of Certificate');
  const supplierVestingNori = await getSupplierVestingNORI({ hre, signer });
  const tokenGranterRole = await supplierVestingNori.TOKEN_GRANTER_ROLE();
  if (
    !(await supplierVestingNori.hasRole(tokenGranterRole, contract.address))
  ) {
    await supplierVestingNori.grantRole(tokenGranterRole, contract.address);
  }
  hre.trace('Added FIFOMarket as a TOKEN_GRANTER of SupplierVestingNORI');
  await finalizeDeployments({ hre, contracts: { FIFOMarket: contract } });
};

export default deploy;
deploy.tags = ['FIFOMarket', 'market'];
deploy.dependencies = [
  'preconditions',
  'Removal',
  'Certificate',
  'BridgedPolygonNORI',
  'SupplierVestingNORI',
  'seed',
];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
