/* eslint-disable no-param-reassign -- hre is intended to be configured via assignment in this file */
import 'tsconfig-paths/register';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-defender';
import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-ethers';
import '@/plugins/fireblocks';
import 'hardhat-ethernal';
import 'hardhat-deploy';
import '@tenderly/hardhat-tenderly';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-gas-reporter';
import 'solidity-docgen';
import '@nomiclabs/hardhat-solhint';
import 'solidity-coverage';
import 'hardhat-tracer'; // todo add to release notes
import '@/config/environment';
import '@/tasks/index';

import { extendEnvironment } from 'hardhat/config';
import type { BaseContract, ContractFactory, Signer } from 'ethers';
import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { lazyFunction } from 'hardhat/plugins';
import type { FactoryOptions } from '@nomiclabs/hardhat-ethers/types';

import { Eip2612Signer } from '@/signers/eip-26126';
import type { FireblocksSigner } from '@/plugins/fireblocks/fireblocks-signer';
import { namedAccountIndices, namedAccounts } from '@/config/accounts';
import { trace, log } from '@/utils/log';
import { getContract } from '@/utils/contracts';
import { debug } from '@/utils/debug';

const getNamedSigners = (
  hre: CustomHardHatRuntimeEnvironment
): NamedSigners => {
  return Object.fromEntries(
    Object.entries(namedAccountIndices).map(([accountName], index) => {
      return [
        accountName,
        new Eip2612Signer(
          hre.waffle.provider.getWallets()[index].privateKey,
          hre.waffle.provider
        ),
      ];
    })
  ) as NamedSigners;
};

/**
 * Note: extendEnvironment cannot take async functions
 */
extendEnvironment((hre) => {
  // todo move to @/extensions/signers, @extensions/deployments
  hre.log = log;
  hre.trace = trace;
  hre.debug = debug;

  // All live networks will try to use fireblocks
  if (Boolean(hre.config.fireblocks.apiKey) && hre.network.config.live) {
    hre.getSigners = lazyFunction(() => hre.fireblocks.getSigners);
    hre.log('Installed fireblocks signers');
  } else if (hre.network.name != 'hardhat') {
    hre.getSigners = lazyFunction(() => hre.ethers.getSigners);
    hre.log('Installed ethers default signers');
  } else {
    hre.getSigners = lazyFunction(() => hre.ethers.getSigners);
    hre.namedSigners = getNamedSigners(hre); // for testing only // todo rename namedHardhatSigners or { hardhat: {...}, fireblocks: {...}}
    hre.namedAccounts = namedAccounts!; // todo rename namedHardhatAccounts or { hardhat: {...}, fireblocks: {...}}
    hre.log('Installed hardhat ethers signers');
  }

  const deployNonUpgradeable = async <
    TContract extends BaseContract,
    TFactory extends ContractFactory
  >({
    contractName,
    args,
    options,
  }: {
    contractName: ContractNames;
    args: unknown[];
    options?: FactoryOptions;
  }): Promise<InstanceOfContract<TContract>> => {
    const [signer]: Signer[] = await hre.getSigners();
    hre.log(
      `deployNonUpgradeable: ${contractName} from address ${await signer.getAddress()}`
    );
    const contractFactory = await hre.ethers.getContractFactory<TFactory>(
      contractName,
      { ...options, signer }
    );
    const fireblocksSigner = signer as FireblocksSigner;
    if (typeof fireblocksSigner.setNextTransactionMemo === 'function') {
      fireblocksSigner.setNextTransactionMemo(`Deploy ${contractName}`);
    }
    const contract = (await contractFactory.deploy(
      ...args
    )) as InstanceOfContract<TContract>;
    hre.log(
      'Deployed non upgradeable contract',
      contractName,
      contract.address
    );
    return contract;
  };
  hre.deployNonUpgradeable = deployNonUpgradeable;

  const deployOrUpgradeProxy = async <
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
  }): Promise<InstanceOfContract<TContract>> => {
    // todo use proposeUpgrade
    const proxy = await hre.deployments.getOrNull(contractName);
    const maybeProxyAddress = proxy?.address;
    let contractCode = '0x';
    if (typeof maybeProxyAddress === 'string') {
      try {
        contractCode = await hre.ethers.provider.getCode(maybeProxyAddress);
      } catch {
        hre.trace('No existing code found');
      }
    }
    const [signer] = await hre.getSigners();
    hre.trace(
      `deployOrUpgrade: ${contractName} from address ${await signer.getAddress()}`
    );

    let contract: InstanceOfContract<TContract> | undefined;
    const contractFactory = await hre.ethers.getContractFactory<TFactory>(
      contractName,
      signer
    );
    const shouldDeployProxy =
      contractCode === '0x' ||
      process.env.FORCE_PROXY_DEPLOYMENT ||
      maybeProxyAddress !== 'string';
    if (shouldDeployProxy) {
      hre.trace('Deploying proxy and instance', contractName);
      const fireblocksSigner = signer as FireblocksSigner;
      if (typeof fireblocksSigner.setNextTransactionMemo === 'function') {
        fireblocksSigner.setNextTransactionMemo(
          `Deploy proxy and instance for ${contractName}`
        );
      }
      contract = await hre.upgrades.deployProxy<TContract>(
        contractFactory,
        args,
        options
      );
      hre.log(
        'Deployed proxy and instance',
        contractName,
        'at',
        contract.address
      );
    } else {
      hre.trace(
        'Found existing proxy at:',
        maybeProxyAddress,
        'attempting to upgrade instance',
        contractName
      );
      const existingImplementationAddress =
        await hre.upgrades.erc1967.getImplementationAddress(maybeProxyAddress);
      hre.trace('Existing implementation at:', existingImplementationAddress);
      const fireblocksSigner = signer as FireblocksSigner;
      if (typeof fireblocksSigner.setNextTransactionMemo === 'function') {
        fireblocksSigner.setNextTransactionMemo(
          `Upgrade contract instance for ${contractName}`
        );
      }
      const deployment = await hre.deployments.get(contractName);
      const artifact = await hre.deployments.getArtifact(contractName);
      if (deployment.bytecode !== artifact.bytecode) {
        contract = await hre.upgrades.upgradeProxy<TContract>(
          maybeProxyAddress,
          contractFactory,
          { ...options }
        );
        const newImplementationAddress =
          await hre.upgrades.erc1967.getImplementationAddress(
            maybeProxyAddress
          );
        if (existingImplementationAddress === newImplementationAddress) {
          hre.trace('Implementation unchanged');
        } else {
          hre.log('New implementation at:', newImplementationAddress);
        }
        hre.trace('...awaiting deployment transaction', contractName);
        await contract.deployed();
        hre.trace('...successful deployment transaction', contractName);
      } else {
        hre.trace('Implementation appears unchanged, skipped upgrade attempt.');
        const name = contractName;
        contract = getContract({
          contractName: name,
          hre,
          signer,
        }) as InstanceOfContract<TContract>;
      }
    }
    return contract;
  };
  hre.deployOrUpgradeProxy = deployOrUpgradeProxy;
});
