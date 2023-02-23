import 'hardhat/types/runtime';
import 'hardhat/types/config';

import type { BaseContract, Contract, ContractFactory } from 'ethers';
import type { Signer } from '@ethersproject/abstract-signer';
import type {
  FactoryOptions,
  HardhatEthersHelpers as HardhatEthersHelpersBase,
} from '@nomiclabs/hardhat-ethers/types';

import type { TASKS } from '../tasks';
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
  interface HardhatEthersHelpers extends HardhatEthersHelpersBase {
    getContractFactory<
      TContractFactory extends ContractFactory = ContractFactory
    >(
      name: string,
      signerOrOptions?: Signer | FactoryOptions
    ): Promise<TContractFactory>;
  }
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
}
