/* eslint-disable no-param-reassign -- hre is intended to be configured via assignment in this file */

import 'tsconfig-paths/register';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-defender';
import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-ethernal';
import 'hardhat-deploy';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-etherscan';
import '@enjinstarter/hardhat-oklink-verify';
import 'solidity-docgen';
import 'hardhat-tracer';
import 'hardhat-contract-sizer';
import '@/config/environment';
import '@/tasks/index';
import '@fireblocks/hardhat-fireblocks';
import { extendEnvironment } from 'hardhat/config';
import type { BaseContract, ContractFactory, Signer } from 'ethers';
import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { lazyFunction, lazyObject } from 'hardhat/plugins';
import type { FactoryOptions } from '@nomiclabs/hardhat-ethers/types';
import type { HardhatNetworkHDAccountsConfig } from 'hardhat/types';
import { Wallet } from 'ethers';

import type { FireblocksSigner } from 'plugins/fireblocks/fireblocks-signer';
import { Eip2612Signer } from '@/signers/eip-26126';
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
          hre.network.name === 'hardhat'
            ? hre.waffle.provider.getWallets()[index].privateKey
            : Wallet.fromMnemonic(
                (hre.network.config.accounts as HardhatNetworkHDAccountsConfig)
                  .mnemonic,
                `m/44'/60'/0'/0/${index}`
              ).privateKey,
          hre.waffle.provider
        ),
      ];
    })
  ) as NamedSigners;
};

const deployOrUpgradeProxy = async <
  TContract extends BaseContract,
  TFactory extends ContractFactory
>({
  contractName,
  args,
  options,
}: {
  contractName: keyof Contracts;
  args: unknown[];
  options?: DeployProxyOptions;
}): Promise<InstanceOfContract<TContract>> => {
  if (options === undefined) {
    options = {};
  }
  if (options.timeout === undefined) {
    options.timeout = 600e3;
  }
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

  // impersonating the fireblocks account that deployed contracts
  // on mainnet so that we can test mainnet deploy on a local fork
  // used this issue to figure out how to do this:
  // https://github.com/NomicFoundation/hardhat/issues/1226
  // const provider = new ethers.providers.JsonRpcProvider(
  //   'http://localhost:8545'
  // );
  // await provider.send('hardhat_impersonateAccount', [
  //   '0x582a885C03A0104Dc3053FAA8486c178e51E48Db',
  // ]);
  // const signer = provider.getSigner(
  //   '0x582a885C03A0104Dc3053FAA8486c178e51E48Db'
  // );

  const [signer]: Signer[] = await hre.getSigners();

  hre.trace(
    `deployOrUpgrade: ${contractName} from address ${await signer.getAddress()}`
  );

  let contract: InstanceOfContract<TContract> | undefined;
  const contractFactory = (
    await hre.ethers.getContractFactory(contractName, signer)
  ).connect(signer);
  const shouldDeployProxy =
    contractCode === '0x' ||
    process.env.FORCE_PROXY_DEPLOYMENT ||
    typeof maybeProxyAddress !== 'string';
  if (
    shouldDeployProxy
    // &&
    // This guard was used during mainnet deployment as an extra barrier to prevent
    // accidental deployment of live contracts. It has to be removed to allow for
    // complete test environment Hardhat deployments.
    // !['bridgedpolygonnori', 'nori', 'lockednori'].includes(
    //   contractName.toLowerCase()
    // )
  ) {
    hre.trace('Deploying proxy and instance', contractName);
    const fireblocksSigner = signer as FireblocksSigner;
    if (typeof fireblocksSigner.setNote === 'function') {
      fireblocksSigner.setNote(`Deploy proxy and instance for ${contractName}`);
    }
    contract = await hre.upgrades.deployProxy<TContract>(
      contractFactory,
      args,
      options
    );
    await contract.deployed();
    if (typeof fireblocksSigner.restoreDefaultNote === 'function') {
      fireblocksSigner.restoreDefaultNote();
    }
    hre.log(
      'Deployed proxy and instance',
      contractName,
      'at',
      contract.address
    );
  } else {
    try {
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
      if (typeof fireblocksSigner.setNote === 'function') {
        fireblocksSigner.setNote(
          `Upgrade contract instance for ${contractName}`
        );
      }
      const deployment = await hre.deployments.get(contractName);
      const artifact = await hre.deployments.getArtifact(contractName);
      if (deployment.bytecode === artifact.bytecode) {
        hre.trace('Implementation appears unchanged, skipped upgrade attempt.');
        const name = contractName;
        contract = getContract({
          contractName: name,
          hre,
          signer,
        }) as InstanceOfContract<TContract>;
      } else {
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
      }
      if (typeof fireblocksSigner.restoreDefaultNote === 'function') {
        fireblocksSigner.restoreDefaultNote();
      }
    } catch (error) {
      hre.log(`Failed to upgrade ${contractName} with error:`, error);
      throw new Error(`Failed to upgrade ${contractName} with error: ${error}`);
    }
  }
  return contract;
};

const deployNonUpgradeable = async <
  TContract extends BaseContract,
  TFactory extends ContractFactory
>({
  contractName,
  args,
  options,
}: {
  contractName: keyof Contracts;
  args: unknown[];
  options?: FactoryOptions;
}): Promise<InstanceOfContract<TContract>> => {
  const [signer] = await hre.getSigners();
  hre.log(
    `deployNonUpgradeable: ${contractName} from address ${await signer.getAddress()}`
  );
  const contractFactory = await hre.ethers.getContractFactory<TFactory>(
    contractName,
    { ...options, signer }
  );
  const fireblocksSigner = signer as FireblocksSigner;
  if (typeof fireblocksSigner.setNote === 'function') {
    fireblocksSigner.setNote(`Deploy ${contractName}`);
  }
  const contract = (await contractFactory.deploy(
    ...args
  )) as InstanceOfContract<TContract>;
  hre.log('Deployed non upgradeable contract', contractName, contract.address);
  if (typeof fireblocksSigner.restoreDefaultNote === 'function') {
    fireblocksSigner.restoreDefaultNote();
  }
  return contract;
};

/**
 * Note: extendEnvironment cannot take async functions
 *
 */
extendEnvironment((hre) => {
  // todo move to @/extensions/signers, @extensions/deployments
  hre.log = lazyFunction(() => log);
  hre.trace = lazyFunction(() => trace);
  hre.debug = lazyFunction(() => debug);
  // All live networks will try to use fireblocks and fall back to hd wallet
  if (hre.network.config.live) {
    if (hre.config.fireblocks === undefined) {
      throw new Error(
        'Fireblocks config is required for live networks. Please set FIREBLOCKS_API_KEY and FIREBLOCKS_SECRET_KEY_PATH and FIREBLOCKS_VAULT_ID in your environment.'
      );
    }
    if (Boolean(hre.config.fireblocks.apiKey)) {
      hre.log('Using fireblocks signer');
    } else {
      hre.log('Using alchemy + hd wallet signer');
    }
  } else {
    hre.namedSigners = lazyObject(() => getNamedSigners(hre)); // for testing only // todo rename namedHardhatSigners or { hardhat: {...}, fireblocks: {...}}
    hre.namedAccounts = lazyObject(() => namedAccounts); // todo rename namedHardhatAccounts or { hardhat: {...}, fireblocks: {...}}
    hre.log('Using hardhat signer');
  }
  hre.getSigners = lazyFunction(() => hre.ethers.getSigners);
  hre.deployNonUpgradeable = lazyFunction(() => deployNonUpgradeable);
  hre.deployOrUpgradeProxy = lazyFunction(() => deployOrUpgradeProxy);
});
