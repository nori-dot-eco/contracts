import type {
  ConfigurableTaskDefinition,
  HardhatRuntimeEnvironment,
  Network,
  RunSuperFunction,
  TaskArguments,
} from 'hardhat/types/runtime';
import type { DeployFunction } from '@openzeppelin/hardhat-upgrades/src/deploy-proxy';
import type { BaseContract, Contract, ContractFactory, ethers as defaultEthers } from 'ethers';
import type { Signer } from '@ethersproject/abstract-signer';
import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/src/utils';
import type {
  FactoryOptions,
  HardhatEthersHelpers,
} from '@nomiclabs/hardhat-ethers/types';

import type { namedAccounts } from '@/config/accounts';
import type { networks } from '@/config/networks';

import type { TASKS } from '@/tasks';
import { HardhatUpgrades } from '@openzeppelin/hardhat-upgrades';

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


interface GenericDeployFunction {
  <TC extends Contract = Contract, TContract extends ContractFactory = ContractFactory>(ImplFactory: TContract, args?: unknown[], opts?: DeployProxyOptions): Promise<InstanceOfContract<TC>>;
  <TC extends Contract = Contract, TContract extends ContractFactory = ContractFactory>(ImplFactory: TContract, opts?: DeployProxyOptions): Promise<InstanceOfContract<TC>>;
}

type InstanceOfContract<TContract extends Contract> = ReturnType<TContract['attach']>;

interface CustomHardhatUpgrades extends HardhatUpgrades {
  deployProxy: GenericDeployFunction; // overridden because of a mismatch in ethers types
}

declare global {
  type TypeChainBaseContract = BaseContract & { contractName: string };

  var hre: CustomHardHatRuntimeEnvironment;
  type ContractNames = 
    | 'NCCR_V0'
    | 'Nori_V0'
    | 'FIFOMarket'
    | 'NORI'
    | 'Removal'
    | 'Certificate';
  var ethers: Omit<typeof defaultEthers & HardhatEthersHelpers, 'getContractFactory'> & {
    getContractFactory<TContractFactory extends ContractFactory = ContractFactory>(
      name: ContractNames,
      signerOrOptions?: Signer | FactoryOptions
    ): Promise<TContractFactory>;
  };

  type CustomHardHatRuntimeEnvironment = Omit<
    HardhatRuntimeEnvironment,
    'getNamedAccounts' | 'run' | 'upgrades' | 'ethers'
  > & {
    getNamedAccounts: () => Promise<typeof namedAccounts>;
    run: (
      name: keyof typeof TASKS,
      taskArguments?: Parameters<typeof TASKS[typeof name]['run']>[0]
    ) => Promise<ReturnType<typeof TASKS[typeof name]['run']>>;
    upgrades: CustomHardhatUpgrades;
    network: Omit<Network,'name'> & { name:keyof typeof networks },
    ethers: typeof ethers
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
      ETHERNAL_EMAIL?: string;
      ETHERNAL_PASSWORD?: string;
      ETHERSCAN_API_KEY?: string;
    }
  }
}

