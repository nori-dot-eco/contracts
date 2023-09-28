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
  ContractFactory,
  ethers as defaultEthers,
} from 'ethers';
import type { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';
import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/src/utils';
import type {
  FactoryOptions,
  HardhatEthersHelpers,
} from '@nomiclabs/hardhat-ethers/types';
import type { HardhatUpgrades } from '@openzeppelin/hardhat-upgrades';
import type {
  ContractAddressOrInstance,
  UpgradeProxyOptions,
} from '@openzeppelin/hardhat-upgrades/dist/utils';
import type {
  DeploymentsExtension as OriginalDeploymentsExtension,
  DeployFunction as HardhatDeployFunction,
} from 'hardhat-deploy/dist/types';
import type { HardhatUserConfig } from 'hardhat/types';
import type { Deployment } from 'hardhat-deploy/types';

import type { debug } from '../utils/debug';
import type { TASKS } from '../tasks';
import type { networks } from '../config/networks';
import type { NamedAccounts } from '../config/accounts';
import type { Eip2612Signer } from '../signers/eip-26126';

import type {
  BridgedPolygonNORI,
  Certificate,
  Market,
  LockedNORI,
  RestrictedNORI,
  NORI,
  NoriUSDC,
  Removal,
  LockedNORILibTestHarness,
  RemovalTestHarness,
} from '@/typechain-types';

declare module 'hardhat/config' {
  type EnvironmentExtender = (
    environment: CustomHardHatRuntimeEnvironment
  ) => void;

  function extendEnvironment(extender: EnvironmentExtender): void;

  export type ActionType<ArgsT extends TaskArguments, TActionReturnType> = (
    taskArgs: ArgsT,
    environment: CustomHardHatRuntimeEnvironment,
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
      function_: FixtureFunction<T, O>,
      id?: string
    ): (options?: O) => Promise<T>;
    all<TContracts extends Contracts = Contracts>(): Promise<{
      [Property in keyof TContracts]: Deployment;
    }>;
  }
  type FixtureFunction<T, O> = (
    environment: CustomHardHatRuntimeEnvironment,
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
    options?: DeployProxyOptions
  ): Promise<InstanceOfContract<TC>>;
  <
    TC extends Contract = Contract,
    TContract extends ContractFactory = ContractFactory
  >(
    ImplFactory: TContract,
    options?: DeployProxyOptions
  ): Promise<InstanceOfContract<TC>>;
}

interface GenericUpgradeFunction {
  <
    TC extends Contract = Contract,
    TFactory extends ContractFactory = ContractFactory
  >(
    proxy: ContractAddressOrInstance,
    ImplFactory: TFactory,
    options?: UpgradeProxyOptions
  ): Promise<InstanceOfContract<TC>>;
}

interface DeployOrUpgradeProxyFunction {
  <TContract extends BaseContract, TFactory extends ContractFactory>({
    contractName,
    args,
    options,
  }: {
    contractName: keyof Contracts;
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
    contractName: keyof Contracts;
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
  type NamedSigners = { [Property in keyof NamedAccounts]: Eip2612Signer };
  type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
  };
  var hre: CustomHardHatRuntimeEnvironment; // todo remove from global types to prevent usage

  export interface Contracts {
    Removal?: Removal;
    NORI?: NORI;
    BridgedPolygonNORI?: BridgedPolygonNORI;
    Market?: Market;
    LockedNORI?: LockedNORI;
    RestrictedNORI?: RestrictedNORI;
    Certificate?: Certificate;
    NoriUSDC?: NoriUSDC;
    LockedNORILibTestHarness?: LockedNORILibTestHarness;
    RemovalTestHarness?: RemovalTestHarness;
  }

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
      taskArguments?: Parameters<(typeof TASKS)[typeof name]['run']>[0]
    ) => Promise<ReturnType<(typeof TASKS)[typeof name]['run']>>;
    upgrades: CustomHardhatUpgrades;
    network: Omit<Network, 'name'> & { name: keyof typeof networks };
    ethers: typeof ethers;
    getSigners: () => Promise<(Signer)[]>;
    deployOrUpgradeProxy: DeployOrUpgradeProxyFunction;
    deployNonUpgradeable: DeployNonUpgradeableFunction;
    log: Console['log'];
    trace: Console['log'];
    debug: typeof debug;
    ethernalSync: boolean; // todo figure out why we need to re-write types like this
    ethernalTrace: boolean;
    ethernalWorkspace: string;
    ethernalResetOnStart: string;
    ethernal: {
      startListening: () => Promise<void>;
      traceHandler: (
        trace: any,
        isMessageTraceFromACall: boolean
      ) => Promise<void>;
      push: (contract: any) => Promise<void>;
      resetWorkspace: (workspace: string) => Promise<void>;
    };
  };

  interface CustomHardhatDeployFunction extends HardhatDeployFunction {
    (hre: CustomHardHatRuntimeEnvironment): Promise<unknown>;
  }
}
