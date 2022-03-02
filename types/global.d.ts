import type {
  ConfigurableTaskDefinition,
  HardhatRuntimeEnvironment,
  Network,
  RunSuperFunction,
  TaskArguments,
} from 'hardhat/types/runtime';
import type { DeployFunction } from '@openzeppelin/hardhat-upgrades/src/deploy-proxy';
import type {
  BaseContract,
  Contract,
  ContractFactory,
  ethers as defaultEthers,
} from 'ethers';
import type { Signer } from '@ethersproject/abstract-signer';
import type { JsonRpcSigner } from '@ethersproject/providers';
import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/src/utils';
import type {
  FactoryOptions,
  HardhatEthersHelpers,
} from '@nomiclabs/hardhat-ethers/types';

import type { namedAccounts } from '@/config/accounts';
import type { networks } from '@/config/networks';

import type { TASKS } from '@/tasks';
import { HardhatUpgrades } from '@openzeppelin/hardhat-upgrades';
import { ContractAddressOrInstance, UpgradeProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { DeploymentsExtension as OriginalDeploymentsExtension } from 'hardhat-deploy/dist/types';


declare module 'hardhat/config' {
  type EnvironmentExtender = (env: CustomHardHatRuntimeEnvironment) => void;

  function extendEnvironment(extender: EnvironmentExtender): void;

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

  export function subtask<ArgsT extends TaskArguments, TActionReturnType = any>(
    name: string, // todo
    description?: string,
    action?: ActionType<ArgsT, TActionReturnType>
  ): ConfigurableTaskDefinition;

}

declare module 'hardhat/types/runtime' {
  interface DeploymentsExtension extends Omit<OriginalDeploymentsExtension ,'createFixture'>{
    createFixture<T, O>(
      func: FixtureFunc<T, O>,
      id?: string
    ): (options?: O) => Promise<T>;
  
  }
  type FixtureFunc<T, O> = (
    env: CustomHardHatRuntimeEnvironment,
    options?: O
  ) => Promise<T>;
  export interface HardhatRuntimeEnvironment {
    deployments: DeploymentsExtension;
    namedSigners:  NamedSigners;
    namedAccounts: NamedAccounts;
  }

  // type EnvironmentExtender = (env: CustomHardHatRuntimeEnvironment) => void;

}

interface GenericDeployFunction {
  <
    TC extends Contract = Contract,
    TContract extends ContractFactory = ContractFactory
  >(
    ImplFactory: TContract,
    args?: unknown[],
    opts?: DeployProxyOptions
  ): Promise<InstanceOfContract<TC>>;
  <
    TC extends Contract = Contract,
    TContract extends ContractFactory = ContractFactory
  >(
    ImplFactory: TContract,
    opts?: DeployProxyOptions
  ): Promise<InstanceOfContract<TC>>;
}

interface GenericUpgradeFunction {
  <
    TC extends Contract = Contract,
    TFactory extends ContractFactory = ContractFactory
  >(
    proxy: ContractAddressOrInstance,
    ImplFactory: TFactory,
    opts?: UpgradeProxyOptions
  ): Promise<InstanceOfContract<TC>>;  
}

interface DeployOrUpgradeProxyFunction {
  <
  TContract extends BaseContract,
  TFactory extends ContractFactory
  >({
    contractName,
    args,
    options,
  }: {
    contractName: ContractNames;
    args: unknown[];
    options?: DeployProxyOptions;
  }): Promise<InstanceOfContract<TContract>>;
}


interface CustomHardhatUpgrades extends HardhatUpgrades {
  deployProxy: GenericDeployFunction; // overridden because of a mismatch in ethers types
  upgradeProxy: GenericUpgradeFunction; // overridden because of a mismatch in ethers types
}

declare global {
  type RequiredKeys<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;
  type InstanceOfContract<TContract extends Contract> = ReturnType<
    TContract['attach']
  >;
  type TypeChainBaseContract = BaseContract & { contractName: string };
  type NamedAccounts = typeof namedAccounts;
  type NamedSigners = { [Property in keyof NamedAccounts]: JsonRpcSigner };
  type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
  };
  var hre: CustomHardHatRuntimeEnvironment;
  type ContractNames =
    | 'FIFOMarket'
    | 'NORI'
    | 'Removal'
    | 'Certificate'
    | 'LockedNORI'
    | 'BridgedPolygonNORI';
  var ethers: Omit<
    typeof defaultEthers & HardhatEthersHelpers,
    'getContractFactory'
  > & {
    getContractFactory<
      TContractFactory extends ContractFactory = ContractFactory
    >(
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
    network: Omit<Network, 'name'> & { name: keyof typeof networks };
    ethers: typeof ethers;
    deployOrUpgradeProxy: DeployOrUpgradeProxyFunction;
    log: Console['log']
  };

  interface CustomHardhatDeployFunction extends Partial<DeployFunction> {
    (hre: CustomHardHatRuntimeEnvironment): Promise<unknown>;
  }

  namespace NodeJS {
    interface ProcessEnv {
      MNEMONIC?: string;
      STAGING_MNEMONIC?: string;
      INFURA_STAGING_KEY?: string;
      TENDERLY_USERNAME?: string;
      TENDERLY_PROJECT?: string;
      ETHERNAL?: string;
      ETHERNAL_EMAIL?: string;
      ETHERNAL_PASSWORD?: string;
      ETHERSCAN_API_KEY?: string;
    }
  }
}
