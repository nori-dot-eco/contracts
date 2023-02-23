import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import type { BaseContract, Contract, ContractFactory } from 'ethers';
import 'hardhat/types/runtime';
import type {
  FactoryOptions,
  HardhatRuntimeEnvironment,
} from 'hardhat/types/runtime';
import type { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';

import type { NamedAccounts } from '../../config/accounts';
import type { Contracts } from '../../types/contracts';

declare module 'hardhat-deploy/dist/types' {
  interface DeploymentsExtension {
    forcedProxyDeployments?: (keyof Contracts)[];
    createFixture<T, O>(
      function_: (
        environment: HardhatRuntimeEnvironment,
        options?: O
      ) => Promise<T>,
      id?: string
    ): (options?: O) => Promise<T>;
    all<TContracts extends Contracts = Contracts>(): Promise<{
      [Property in keyof TContracts]: Deployment;
    }>;
    deployOrUpgradeProxy<
      TContract extends BaseContract,
      TFactory extends ContractFactory
    >({
      contractName,
      args,
      options,
      hre,
    }: {
      contractName: keyof Contracts;
      args: unknown[];
      options?: DeployProxyOptions;
      hre: HardhatRuntimeEnvironment;
    }): Promise<InstanceOfContract<TContract>>;
    deployNonUpgradeable<
      TContract extends BaseContract,
      TFactory extends ContractFactory
    >({
      contractName,
      args,
      options,
      hre,
    }: {
      contractName: keyof Contracts;
      args: unknown[];
      options?: FactoryOptions;
      hre: HardhatRuntimeEnvironment;
    }): Promise<InstanceOfContract<TContract>>;
  }
}

declare module '@openzeppelin/hardhat-upgrades/dist/deploy-proxy' {
  interface DeployFunction {
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
}

declare module 'hardhat/types/runtime' {
  interface HardhatEthersHelpers {
    getContractFactory<
      TContractFactory extends ContractFactory = ContractFactory
    >(
      name: string,
      signerOrOptions?: Signer | FactoryOptions
    ): Promise<TContractFactory>;
  }

  export interface HardhatRuntimeEnvironment {
    namedSigners: NamedSigners;
    namedAccounts: NamedAccounts;
    getSigners: () => Promise<(Signer & TypedDataSigner)[]>;
  }
}
