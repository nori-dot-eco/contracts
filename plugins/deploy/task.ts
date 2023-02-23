import { task, types } from 'hardhat/config';
import type {
  RunSuperFunction,
  HardhatRuntimeEnvironment,
} from 'hardhat/types';
import { TASK_DEPLOY } from 'hardhat-deploy';
import { lazyObject } from 'hardhat/plugins';

import type { Contracts } from '../../types/contracts';

export const TASK = {
  name: TASK_DEPLOY,
  description: 'Deploy contracts',
  run: async (
    {
      forceProxyDeployments,
      unsafeForceAllProxyDeployments,
      ...rest
    }: {
      unsafeForceAllProxyDeployments: boolean;
      forceProxyDeployments: string;
    } & unknown[],
    hre: HardhatRuntimeEnvironment,
    runSuper: RunSuperFunction<unknown[]>
  ): Promise<void> => {
    hre.logger.info('Starting deploy task');
    let contractsToForcefullyRedeployProxiesFor: (keyof Contracts)[] =
      forceProxyDeployments
        .trim() // todo regex validation for contract names + , + no whitespace
        .split(',') as (keyof Contracts)[];
    const deployments = await hre.deployments.all();
    if (forceProxyDeployments.length === 0) {
      contractsToForcefullyRedeployProxiesFor = Object.keys(
        deployments
      ) as (keyof Contracts)[];
    }
    for (const contractName of contractsToForcefullyRedeployProxiesFor) {
      if (!(contractName in deployments)) {
        throw new Error(`Contract ${contractName} not found in deployments`);
      }
    }
    if (contractsToForcefullyRedeployProxiesFor.length > 0) {
      hre.logger.warn(
        'WARNING: FORCING PROXY DEPLOYMENTS FOR THE FOLLOWING CONTRACTS:',
        contractsToForcefullyRedeployProxiesFor
      );
    } else {
      hre.logger.info('No contract proxies will be forcefully redeployed');
    }
    hre.deployments.forcedProxyDeployments = // eslint-disable-line no-param-reassign -- we want to assign this to the global hardhat runtime environment
      lazyObject(() => contractsToForcefullyRedeployProxiesFor);
    return runSuper(rest);
  },
} as const;

task(TASK.name, TASK.description, TASK.run)
  .addOptionalParam(
    'forceProxyDeployments',
    'A list of contracts to force proxy deployments for. If not provided, all contracts will be forced to redeploy their proxies.',
    '',
    types.string
  )
  .addFlag(
    'unsafeForceAllProxyDeployments',
    'Forcefully redeploy proxies for all contracts.'
  );
