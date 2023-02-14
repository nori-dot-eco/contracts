/* eslint-disable no-param-reassign -- hre is intended to be configured via assignment in this file */
import 'tsconfig-paths/register';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-defender';
import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-ethers';
import '@/plugins/fireblocks';
import 'hardhat-ethernal';
import 'hardhat-deploy';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-gas-reporter';
import 'solidity-docgen';
import '@nomiclabs/hardhat-solhint';
import 'solidity-coverage';
import 'hardhat-tracer';
import 'hardhat-contract-sizer';
import '@/config/environment';
import '@/tasks/index';
import { extendEnvironment } from 'hardhat/config';
import type { BaseContract, ContractFactory, Signer } from 'ethers';
import type { DeployProxyOptions } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { lazyFunction, lazyObject } from 'hardhat/plugins';
import type { FactoryOptions } from '@nomiclabs/hardhat-ethers/types';
import type { HardhatNetworkHDAccountsConfig } from 'hardhat/types';
import { Wallet } from 'ethers';

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

  const [signer] = await hre.getSigners();

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
    // This guard was used during mainnet deployment as an extra barrier to prevent
    // accidental deployment of live contracts. It has to be removed to allow for
    // complete test environment Hardhat deployments.
    //  &&
    // !['bridgedpolygonnori', 'nori', 'lockednori'].includes(
    //   contractName.toLowerCase()
    // )
  ) {
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
    await contract.deployed();
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
        await hre.upgrades.erc1967.getImplementationAddress(maybeProxyAddress!);
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
          maybeProxyAddress!,
          contractFactory,
          { ...options }
        );
        const newImplementationAddress =
          await hre.upgrades.erc1967.getImplementationAddress(
            maybeProxyAddress!
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
    } catch (error) {
      hre.trace(`Failed to upgrade ${contractName} with error:`, error);
      contract = hre.deployments.get(
        contractName
      ) as InstanceOfContract<TContract>;
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
  hre.log('Deployed non upgradeable contract', contractName, contract.address);
  return contract;
};

/**
 * Note: extendEnvironment cannot take async functions
 */
extendEnvironment((hre) => {
  // todo move to @/extensions/signers, @extensions/deployments
  hre.log = lazyFunction(() => log);
  hre.trace = lazyFunction(() => trace);
  hre.debug = lazyFunction(() => debug);
  // All live networks will try to use fireblocks and fall back to hd wallet
  if (hre.network.config.live) {
    if (Boolean(hre.config.fireblocks.apiKey)) {
      hre.getSigners = lazyFunction(() => hre.fireblocks.getSigners);
      hre.log('Using fireblocks signer');
    } else {
      hre.getSigners = lazyFunction(() => hre.ethers.getSigners);
      hre.log('Using alchemy + hd wallet signer');
    }
  } else {
    hre.getSigners = lazyFunction(() => hre.ethers.getSigners);
    hre.namedSigners = lazyObject(() => getNamedSigners(hre)); // for testing only // todo rename namedHardhatSigners or { hardhat: {...}, fireblocks: {...}}
    hre.namedAccounts = lazyObject(() => namedAccounts); // todo rename namedHardhatAccounts or { hardhat: {...}, fireblocks: {...}}
    hre.log('Using hardhat signer');
  }
  hre.deployNonUpgradeable = lazyFunction(() => deployNonUpgradeable);
  hre.deployOrUpgradeProxy = lazyFunction(() => deployOrUpgradeProxy);
});
