import type {
  ConfigurableTaskDefinition as OriginalConfigurableTaskDefinition,
  HardhatRuntimeEnvironment,
  Network,
  RunSuperFunction,
  TaskArguments,
} from 'hardhat/types/runtime';
import type {
  BaseContract,
  Contract,
  ethers as defaultEthers,
} from 'ethers';
import type { Signer } from '@ethersproject/abstract-signer';
import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/src/utils';
import type {
  FactoryOptions,
  HardhatEthersHelpers,
} from '@nomiclabs/hardhat-ethers/types';
import type { namedAccountIndices } from '@/config/accounts';
import type { networks } from '@/config/networks';

import type { TASKS } from '@/tasks';
import { HardhatUpgrades } from '@openzeppelin/hardhat-upgrades';
import {
  ContractAddressOrInstance,
  UpgradeProxyOptions,
} from '@openzeppelin/hardhat-upgrades/dist/utils';
import {
  DeploymentsExtension as OriginalDeploymentsExtension,
  DeployFunction as HardhatDeployFunction,
} from 'hardhat-deploy/dist/types';
import { HardhatUserConfig } from 'hardhat/types';
import { Address, Deployment } from 'hardhat-deploy/types';
import { Contracts } from '@/utils/contracts';
import { Eip2612Signer } from '@/signers/eip-26126';

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

  type ConfigurableTaskDefinition = OriginalConfigurableTaskDefinition & {
    setAction<ArgsT extends TaskArguments, TActionReturnType = any>(
      action: ActionType<ArgsT, TActionReturnType>
    ): ConfigurableTaskDefinition;
  };
}

declare module 'hardhat/types/runtime' {
  interface DeploymentsExtension
    extends Omit<OriginalDeploymentsExtension, 'createFixture'> {
    createFixture<T, O>(
      func: FixtureFunc<T, O>,
      id?: string
    ): (options?: O) => Promise<T>;
    all<TContracts extends Contracts = Contracts>(): Promise<{
      [Property in keyof TContracts]: Deployment;
    }>;
  }
  type FixtureFunc<T, O> = (
    env: CustomHardHatRuntimeEnvironment,
    options?: O
  ) => Promise<T>;
  export interface HardhatRuntimeEnvironment {
    deployments: DeploymentsExtension;
    namedSigners: NamedSigners;
    namedAccounts: NamedAccounts;
  }
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
  <TContract extends BaseContract, TFactory extends ContractFactory>({
    contractName,
    args,
    options,
  }: {
    contractName: ContractNames;
    args: unknown[];
    options?: DeployProxyOptions;
  }): Promise<InstanceOfContract<TContract>>;
}

interface DeployNonUpgradeableFunction {
  <TContract extends BaseContract, TFactory extends ContractFactory>({
    contractName,
    args,
    options,
  }: {
    contractName: ContractNames;
    args: unknown[];
    options?: FactoryOptions;
  }): Promise<InstanceOfContract<TContract>>;
}

interface CustomHardhatUpgrades extends HardhatUpgrades {
  deployProxy: GenericDeployFunction; // overridden because of a mismatch in ethers types
  upgradeProxy: GenericUpgradeFunction; // overridden because of a mismatch in ethers types
}

declare global {
  type TupleToObject<
    T extends readonly any[],
    M extends Record<Exclude<keyof T, keyof any[]>, PropertyKey>
  > = { [K in Exclude<keyof T, keyof any[]> as M[K]]: T[K] };

  type ParametersToObject<
    TFunction extends (...args: any[]) => any,
    TKeys extends Record<
      Exclude<keyof Parameters<TFunction>, keyof any[]>,
      PropertyKey
    >
  > = TupleToObject<Parameters<TFunction>, TKeys>;

  interface ClassType<T> {
    new (...args: any[]): T;
  }

  type Constructor = new (...args: any[]) => {};

  type ClassInstance<T> = InstanceType<ClassType<T>>;

  type RequiredKeys<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;
  type InstanceOfContract<TContract extends Contract> = ReturnType<
    TContract['attach']
  >;
  type TypeChainBaseContract = BaseContract & { contractName: string };
  type NamedAccountIndices = typeof namedAccountIndices;
  type NamedAccounts = { [Property in keyof NamedAccountIndices]: Address };
  type NamedSigners = { [Property in keyof NamedAccounts]: Eip2612Signer };
  type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
  };
  var hre: CustomHardHatRuntimeEnvironment; // todo remove from global types to prevent usage
  type ContractNames =
    | 'FIFOMarket'
    | 'NORI'
    | 'Removal'
    | 'Certificate'
    | 'LockedNORIV2'
    | 'RestrictedNORI'
    | 'BridgedPolygonNORI'
    | 'ScheduleTestHarness';

  var ethers: Omit<
    typeof defaultEthers & HardhatEthersHelpers,
    'getContractFactory'
  > & {
    getContractFactory<
      TContractFactory extends ContractFactory = ContractFactory
    >(
      name: string,
      signerOrOptions?: Signer | FactoryOptions
    ): Promise<TContractFactory>;
  }; // todo remove from global types to prevent usage

  type CustomHardHatRuntimeEnvironment = Omit<
    HardhatRuntimeEnvironment,
    'run' | 'upgrades' | 'ethers'
  > & {
    config: HardhatUserConfig;
    run: (
      name: keyof typeof TASKS,
      taskArguments?: Parameters<typeof TASKS[typeof name]['run']>[0]
    ) => Promise<ReturnType<typeof TASKS[typeof name]['run']>>;
    upgrades: CustomHardhatUpgrades;
    network: Omit<Network, 'name'> & { name: keyof typeof networks };
    ethers: typeof ethers;
    getSigners: () => Promise<Signer[]>;
    deployOrUpgradeProxy: DeployOrUpgradeProxyFunction;
    deployNonUpgradeable: DeployNonUpgradeableFunction;
    log: Console['log'];
    trace: Console['log'];
    ethernalSync: boolean; // todo figure out why we need to re-write types like this
    ethernalTrace: boolean;
    ethernalWorkspace: string;
    ethernalResetOnStart: string;
    ethernal: {
      startListening: () => Promise<void>;
      traceHandler: (
        trace: any,
        isMessageTraceFromACall: Boolean
      ) => Promise<void>;
      push: (contract: any) => Promise<void>;
      resetWorkspace: (workspace: string) => Promise<void>;
    };
  };

  interface CustomHardhatDeployFunction extends HardhatDeployFunction {
    (hre: CustomHardHatRuntimeEnvironment): Promise<unknown>;
  }

  namespace NodeJS {
    interface ProcessEnv {
      MNEMONIC?: string;
      INFURA_STAGING_KEY?: string;
      TENDERLY_USERNAME: string;
      TENDERLY_PROJECT: string;
      ETHERNAL_EMAIL?: string;
      ETHERNAL_PASSWORD?: string;
      ETHERNAL: boolean;
      ETHERSCAN_API_KEY?: string;
      POLYGONSCAN_API_KEY?: string;
      DEFENDER_API_KEY?: string;
      DEFENDER_API_SECRET?: string;
      REPORT_GAS: boolean;
      COINMARKETCAP_API_KEY?: string;
      GITHUB_PERSONAL_ACCESS_TOKEN?: string;
      TRACE: boolean;
      FORCE_PROXY_DEPLOYMENT: boolean;
      LOG_HARDHAT_NETWORK: boolean;
      REPORT_GAS_FILE?: string;
      TENDERLY: boolean;
      FAIL: boolean;
    }
  }
}
