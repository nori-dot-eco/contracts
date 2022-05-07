import type { DeployFunction } from 'hardhat-deploy/types';

import * as contracts from '@/contracts.json';

export const deploy: DeployFunction = async (env) => {
  const hre = env as unknown as CustomHardHatRuntimeEnvironment;
  hre.log(`3_persist_tenderly_artifacts`);
  if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
    const network = hre.network.name;
    hre.trace('Updating tenderly artifacts');
    const tenderlyContracts = Object.entries(contracts[network]).map(
      ([name, { proxyAddress: address }]) => {
        return {
          name,
          network,
          address,
        };
      }
    );
    await Promise.all(
      tenderlyContracts.map(async (c) => {
        return hre.tenderly.persistArtifacts(c);
      })
    );
    // todo verify proxy (not imp) code uploaded and works
    // hre.tenderly.push(tenderlyContracts), // todo enable for live networks
    // hre.tenderly.verify(tenderlyContracts), // todo enable for live networks
    hre.trace('Persisted artifacts to tenderly');
  }
};

export default deploy;
deploy.tags = ['tenderly'];
deploy.dependencies = ['market', 'assets'];
