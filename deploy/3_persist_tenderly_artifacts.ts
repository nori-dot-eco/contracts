import type { DeployFunction } from 'hardhat-deploy/types';
import * as contracts from '@/contracts.json';

export const deploy: DeployFunction = async (env) => {
  hre.log(`3_persist_tenderly_artifacts`);
  if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
    hre.trace('Updating tenderly artifacts');
    const tenderlyContracts = [
      {
        name: 'FIFOMarket',
        network: hre.network.name,
        address: contracts.localhost.FIFOMarket.proxyAddress,
      },
      {
        name: 'Removal',
        network: hre.network.name,
        address: contracts.localhost.Removal.proxyAddress,
      },
      {
        name: 'Certificate',
        network: hre.network.name,
        address: contracts.localhost.Certificate.proxyAddress,
      },
      {
        name: 'NORI',
        network: hre.network.name,
        address: contracts.localhost.NORI.proxyAddress,
      },
      {
        name: 'LockedNORI',
        network: hre.network.name,
        address: contracts.localhost.LockedNORI.proxyAddress,
      },
      {
        name: 'BridgedPolygonNORI',
        network: hre.network.name,
        address: contracts.localhost.BridgedPolygonNORI.proxyAddress,
      },
    ];
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
deploy.dependencies = ['market'];
