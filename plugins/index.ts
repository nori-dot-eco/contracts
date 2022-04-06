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
import 'tsconfig-paths/register';
import '@/config/environment';
import '@/tasks/index';

import { extendEnvironment } from 'hardhat/config';
import type { BaseContract, ContractFactory, Signer } from 'ethers';
import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';

import * as contractsConfig from '../contracts.json';

import { trace, log } from '@/utils/log';
import { lazyFunction, lazyObject } from 'hardhat/plugins';
import { namedAccounts } from '../config/accounts';
import { FactoryOptions } from '@nomiclabs/hardhat-ethers/types';
import { FireblocksSigner } from './fireblocks/fireblocks-signer';

const getNamedSigners = (
  hre: CustomHardHatRuntimeEnvironment
): NamedSigners => {
  return Object.fromEntries(
    Object.entries(namedAccounts).map(([accountName, address]) => {
      return [accountName, hre.waffle.provider.getSigner(address)];
    })
  ) as NamedSigners;
};

// extendEnvrironment cannot take async functions ...
extendEnvironment((hre) => {
  // todo move to @/extensions/signers, @extensions/deployments
  hre.log = log;
  hre.trace = trace;

  // All live networks will try to use fireblocks
  if (hre.config.fireblocks.apiKey && hre.network.config.live) {
    hre.getSigners = lazyFunction(() => hre.fireblocks.getSigners);
    hre.log('Installed fireblocks signers');
  } else {
    hre.getSigners = lazyFunction(() => hre.ethers.getSigners);
    hre.log('Installed ethers default signers');
  }

  // for testing only
  hre.namedSigners = getNamedSigners(hre);
  hre.namedAccounts = namedAccounts;

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
    let contract: InstanceOfContract<TContract>;
    const contractFactory = await hre.ethers.getContractFactory<TFactory>(
      contractName,
      { ...options, signer }
    );
    // TODO: Do this properly
    try {
      (signer as FireblocksSigner).setNextTransactionMemo(
        `Deploy ${contractName}`
      );
    } catch (e) {}
    contract = (await contractFactory.deploy(
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
    const proxyAddress =
      contractsConfig[hre.network.name as 'hardhat']?.[contractName]?.proxyAddress;
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
      // TODO: Do this properly
      try {
        (signer as FireblocksSigner).setNextTransactionMemo(
          `Deploy proxy and instance for ${contractName}`
        );
      } catch (e) {}
      contract = await hre.upgrades.deployProxy<TContract>(
        contractFactory,
        args,
        options
      );
      hre.log('Deployed proxy and instance', contractName, contract.address);
    } else {
      hre.log(
        'Found existing proxy at:',
        proxyAddress,
        ' attempting to upgrade instance',
        contractName
      );
      try {
        (signer as FireblocksSigner).setNextTransactionMemo(
          `Upgrade contract instance for ${contractName}`
        );
      } catch (e) {}
      contract = await hre.upgrades.upgradeProxy<TContract>(
        proxyAddress,
        contractFactory
        // options
      );
      hre.log('Upgraded instance', contractName, contract.address);
    }
    hre.trace('...awaiting deployment transaction', contractName);
    await contract.deployed();
    hre.log('...successful deployment transaction', contractName);
    return contract;
  };
  hre.deployOrUpgradeProxy = deployOrUpgradeProxy;
});
