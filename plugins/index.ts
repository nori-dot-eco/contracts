import 'tsconfig-paths/register';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-defender';
import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-ethers';
import './fireblocks';
import 'hardhat-ethernal';
import 'hardhat-deploy';
import '@tenderly/hardhat-tenderly';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-gas-reporter';
import 'solidity-docgen';
import '@nomiclabs/hardhat-solhint';
import 'solidity-coverage';
import '@/config/environment';
import '@/tasks/index';

import { extendEnvironment } from 'hardhat/config';
import type { BaseContract, ContractFactory, Signer } from 'ethers';
import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { lazyFunction } from 'hardhat/plugins';
import type { FactoryOptions } from '@nomiclabs/hardhat-ethers/types';

import type { FireblocksSigner } from './fireblocks/fireblocks-signer';

import { namedAccountIndices, namedAccounts } from '@/config/accounts';
import { trace, log } from '@/utils/log';
import { getContract } from '@/utils/contracts';

const getNamedSigners = (
  hre: CustomHardHatRuntimeEnvironment
): NamedSigners => {
  return Object.fromEntries(
    Object.entries(namedAccountIndices).map(([accountName, address]) => {
      return [accountName, hre.waffle.provider.getSigner(address)];
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

  // All live networks will try to use fireblocks
  if (hre.config.fireblocks.apiKey && hre.network.config.live) {
    hre.getSigners = lazyFunction(() => hre.fireblocks.getSigners);
    // todo namedFireblocksAccounts
    // todo namedFireblocksSigners
    hre.log('Installed fireblocks signers');
  } else {
    hre.getSigners = lazyFunction(() => hre.ethers.getSigners);
    hre.namedSigners = getNamedSigners(hre); // for testing only
    hre.namedAccounts = namedAccounts!;
    hre.log('Installed ethers default signers');
  }

  hre.ethernalSync = Boolean(
    hre.network.name === 'hardhat' &&
      process.env.ETHERNAL &&
      process.env.ETHERNAL_EMAIL &&
      process.env.ETHERNAL_PASSWORD
  );
  if (hre.network.name === 'hardhat') {
    if (hre.ethernalSync) {
      hre.ethernalWorkspace = 'nori';
      hre.ethernalTrace = true;
    } else {
      hre.ethernalTrace = false;
    }
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
    const signer: Signer = (await hre.getSigners())[0];
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
    const proxyAddress = proxy?.address;
    let contractCode = '0x';
    if (proxyAddress) {
      try {
        contractCode = await hre.ethers.provider.getCode(proxyAddress);
      } catch (e) {
        hre.log('No existing code found');
      }
    }
    const signer = (await hre.getSigners())[0];
    hre.log(
      `deployOrUpgrade: ${contractName} from address ${await signer.getAddress()}`
    );

    let contract: InstanceOfContract<TContract>;
    const contractFactory = await hre.ethers.getContractFactory<TFactory>(
      contractName,
      signer
    );
    if (contractCode === '0x' || process.env.FORCE_PROXY_DEPLOYMENT) {
      hre.log('Deploying proxy and instance', contractName); // todo use hre.trace (variant of hre.log requiring env.TRACE === true)
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
      hre.log(
        'Found existing proxy at:',
        proxyAddress,
        'attempting to upgrade instance',
        contractName
      );
      const existingImplementationAddress =
        await hre.upgrades.erc1967.getImplementationAddress(proxyAddress!);
      hre.log('Existing implementation at:', existingImplementationAddress);
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
          proxyAddress!,
          contractFactory
          // options
        );
        const newImplementationAddress =
          await hre.upgrades.erc1967.getImplementationAddress(proxyAddress!);
        if (existingImplementationAddress === newImplementationAddress) {
          hre.log('Implementation unchanged');
        } else {
          hre.log('New implementation at:', newImplementationAddress);
        }
        hre.trace('...awaiting deployment transaction', contractName);
        await contract.deployed();
        hre.log('...successful deployment transaction', contractName);
      } else {
        hre.log('Implementation appears unchanged, skipped upgrade attempt.');
        contract = (await getContract({
          contractName,
          hre,
        })) as InstanceOfContract<TContract>;
      }
    }
    return contract;
  };
  hre.deployOrUpgradeProxy = deployOrUpgradeProxy;
});
