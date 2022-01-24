import type {
  ConfigurableTaskDefinition,
  HardhatRuntimeEnvironment,
  Network,
  RunSuperFunction,
  TaskArguments,
} from 'hardhat/types/runtime';
import type { DeployFunction } from '@openzeppelin/hardhat-upgrades/src/deploy-proxy';
import type { Contract, ContractFactory, ethers } from 'ethers';
import type { Signer } from '@ethersproject/abstract-signer';
import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/src/utils';
import type { HardhatUpgrades } from '@openzeppelin/hardhat-upgrades';
import type {
  FactoryOptions,
  HardhatEthersHelpers,
} from '@nomiclabs/hardhat-ethers/types';

import type { namedAccounts } from '@/config/accounts';
import type { networks } from '@/config/networks';

import type { TASKS } from '@/tasks';

declare module 'hardhat/config' {
  export type ActionType<ArgsT extends TaskArguments, TActionReturnType> = (
    taskArgs: ArgsT,
    env: CustomHardHatRuntimeEnvironment,
    runSuper: RunSuperFunction<ArgsT>
  ) => Promise<TActionReturnType>;

  export function task<ArgsT extends TaskArguments, TActionReturnType = any>(
    name: keyof typeof TASKS,
    description?: string,
    action?: ActionType<ArgsT, TActionReturnType>
  ): ConfigurableTaskDefinition;
}

declare module 'hardhat/types/runtime' {
  interface DeploymentsExtension {
    createFixture<T, O>(
      func: FixtureFunc<T, O>,
      id?: string
    ): (options?: O) => Promise<T>;
  }
  export type FixtureFunc<T, O> = (
    env: CustomHardHatRuntimeEnvironment,
    options?: O
  ) => Promise<T>;
  export interface HardhatRuntimeEnvironment {
    deployments: DeploymentsExtension;
  }
}

/**
 * @todo //todo this can be removed when '@openzeppelin/hardhat-upgrades' is upgraded to use the latest version of ethers (^5.5.3)
 */
declare module '@openzeppelin/hardhat-upgrades' {
  interface DeployFunction {
    (
      ImplFactory: ContractFactory,
      args?: unknown[],
      opts?: DeployProxyOptions
    ): Promise<Contract>;
    (
      ImplFactory: ContractFactory,
      opts?: DeployProxyOptions
    ): Promise<Contract>;
  }
  interface CustomHardhatUpgrades {
    deployProxy: DeployFunction; // overridden because of a mismatch in ethers types
  }
}

declare global {
  type CustomHardHatRuntimeEnvironment = Omit<
    HardhatRuntimeEnvironment,
    'getNamedAccounts' | 'run' | 'upgrades' | 'ethers'
  > & {
    getNamedAccounts: () => Promise<typeof namedAccounts>;
    run: (
      name: keyof typeof TASKS,
      taskArguments: Parameters<typeof TASKS[typeof name]['run']>[0]
    ) => Promise<ReturnType<typeof TASKS[typeof name]['run']>>;
    upgrades: HardhatUpgrades;
    network: Omit<Network,'name'> & { name:keyof typeof networks },
    ethers: Omit<typeof ethers & HardhatEthersHelpers, 'getContractFactory'> & {
      getContractFactory(
        name:
          | 'NCCR_V0'
          | 'Nori_V0'
          | 'FIFOMarket'
          | 'NORI'
          | 'Removal'
          | 'Certificate',
        signerOrOptions?: Signer | FactoryOptions
      ): Promise<ContractFactory>;
    };
  };

  interface CustomHardhatDeployFunction extends Partial<DeployFunction> {
    (hre: CustomHardHatRuntimeEnvironment): Promise<void | boolean>;
  }

  namespace NodeJS {
    interface ProcessEnv {
      MNEMONIC?: string;
      STAGING_MNEMONIC?: string;
      INFURA_STAGING_KEY?: string;
      TENDERLY_USERNAME?: string;
      TENDERLY_PROJECT?: string;
    }
  }
}

