import path from 'path';

import { readJsonSync, writeJsonSync } from 'fs-extra';
import type { Address } from 'hardhat-deploy/types';

import { defaultRemovalTokenIdFixture } from '../test/fixtures/removal';

import { generateRandomSubIdentifier } from './removal';

import type {
  LockedNORI,
  LockedNORI__factory,
  RestrictedNORI,
  RestrictedNORI__factory,
  Certificate,
  Certificate__factory,
  Market,
  Market__factory,
  NORI,
  NORI__factory,
  Removal,
  Removal__factory,
  BridgedPolygonNORI,
  BridgedPolygonNORI__factory,
  LockedNORILibTestHarness,
  LockedNORILibTestHarness__factory,
  RemovalTestHarness,
  RemovalTestHarness__factory,
} from '@/typechain-types';
import { formatTokenAmount } from '@/utils/units';
import {
  mockDepositNoriToPolygon,
  createBatchMintData,
  getLatestBlockTime,
} from '@/test/helpers';

interface ContractConfig {
  [key: string]: { proxyAddress: string };
}

export const readContractsConfig = (): Record<string, ContractConfig> => {
  return readJsonSync(path.join(__dirname, '../contracts.json'));
};

export const updateContractsConfig = ({
  networkName,
  contractName,
  proxyAddress,
}: {
  networkName: string;
  contractName: string;
  proxyAddress: string;
}): void => {
  const config = readContractsConfig();
  hre.trace('updateContractsConfig', networkName, contractName, proxyAddress);
  return writeJsonSync(
    path.join(__dirname, '../contracts.json'),
    {
      ...config,
      [networkName]: {
        ...config[networkName],
        [contractName]: { proxyAddress },
      },
    },
    { spaces: 2 }
  );
};

export const verifyContracts = async ({
  hre,
  contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: Contracts;
}): Promise<void> => {
  if (!['localhost', 'hardhat'].includes(hre.network.name)) {
    hre.trace('Verifying contracts');
    const results = await Promise.allSettled(
      Object.entries(contracts)
        .filter((_, value) => value !== undefined)
        .map(async ([_name, { address }]) => {
          return hre.run('verify:verify', {
            address: await hre.upgrades.erc1967.getImplementationAddress(
              address
            ),
            constructorArguments: [],
          } as any);
        })
    );
    for (const { reason } of results.filter(
      ({ status }) => status === 'rejected'
    ) as PromiseRejectedResult[]) {
      if (!reason.message.toLowerCase().includes('already verified')) {
        throw new Error(reason);
      }
    }
    hre.trace('Verified contracts');
  }
};

export const writeContractsConfig = ({
  contracts,
}: {
  contracts: Contracts;
}): void => {
  hre.trace('Writing contracts.json config', hre.network.name);
  for (const [name, contract] of Object.entries(contracts).filter(
    (_, value) => value !== undefined
  )) {
    updateContractsConfig({
      networkName: hre.network.name,
      contractName: name,
      proxyAddress: contract.address,
    });
  }
};

export const configureDeploymentSettings = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<void> => {
  if (hre.network.name === 'hardhat' || hre.network.name === 'localhost') {
    await hre.run('deploy:erc1820');
  }
};

export const validateDeploymentSettings = ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): void => {
  if (hre.network.live === true && process.env.SOLC_PROFILE !== 'production') {
    throw new Error(
      'Please use the production solc profile (by setting the environment variable "SOLC_PROFILE" to "production") for production networks'
    );
  }
};

export const deployRemovalContract = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<InstanceOfContract<Removal>> => {
  return hre.deployOrUpgradeProxy<Removal, Removal__factory>({
    contractName: 'Removal',
    // TODO:sw from config by environment
    args: ['https://registry.nori.com/removals/'],
    options: {
      initializer: 'initialize(string)',
      unsafeAllow: ['delegatecall'],
    },
  });
};

export const deployRemovalTestHarness = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<InstanceOfContract<RemovalTestHarness>> => {
  const RemovalTestHarness =
    await hre.ethers.getContractFactory<RemovalTestHarness__factory>(
      'RemovalTestHarness'
    );
  const removalTestHarness = await RemovalTestHarness.deploy();
  return removalTestHarness;
};

export const deployCertificateContract = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<InstanceOfContract<Certificate>> => {
  return hre.deployOrUpgradeProxy<Certificate, Certificate__factory>({
    contractName: 'Certificate',
    // TODO:sw from config by environment
    args: ['https://registry.nori.com/certificates/'],
    options: {
      initializer: 'initialize(string)',
      unsafeAllow: ['delegatecall'],
    },
  });
};

export const deployMarketContract = async ({
  hre,
  feeWallet,
  feePercentage,
  priceMultiple,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  feeWallet: Address;
  feePercentage: number;
  priceMultiple: number;
}): Promise<InstanceOfContract<Market>> => {
  const deployments = await hre.deployments.all<Required<Contracts>>();
  return hre.deployOrUpgradeProxy<Market, Market__factory>({
    contractName: 'Market',
    args: [
      deployments.Removal.address,
      deployments.BridgedPolygonNORI.address,
      deployments.Certificate.address,
      deployments.RestrictedNORI.address,
      feeWallet,
      feePercentage,
      priceMultiple,
    ],
    options: {
      initializer:
        'initialize(address,address,address,address,address,uint256,uint256)',
      unsafeAllow: ['delegatecall'],
    },
  });
};

export const deployRestrictedNORI = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<InstanceOfContract<RestrictedNORI>> => {
  return hre.deployOrUpgradeProxy<RestrictedNORI, RestrictedNORI__factory>({
    contractName: 'RestrictedNORI',
    args: [],
    options: {
      initializer: 'initialize()',
      unsafeAllow: ['delegatecall'],
    },
  });
};

export const deployBridgedPolygonNORIContract = async ({
  hre,
  childChainManagerProxyAddress,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  childChainManagerProxyAddress: Address;
}): Promise<InstanceOfContract<BridgedPolygonNORI>> => {
  return hre.deployOrUpgradeProxy<
    BridgedPolygonNORI,
    BridgedPolygonNORI__factory
  >({
    contractName: 'BridgedPolygonNORI',
    args: [childChainManagerProxyAddress],
    options: {
      initializer: 'initialize(address)',
      unsafeAllow: ['delegatecall'],
    },
  });
};

export const deployNORIContract = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<InstanceOfContract<NORI>> => {
  return hre.deployOrUpgradeProxy<NORI, NORI__factory>({
    contractName: 'NORI',
    args: [],
    options: {
      unsafeAllow: ['delegatecall'],
    },
  });
};

export const deployLockedNORIContract = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<InstanceOfContract<LockedNORI>> => {
  return hre.deployOrUpgradeProxy<LockedNORI, LockedNORI__factory>({
    contractName: 'LockedNORI',
    args: [(await hre.deployments.get('BridgedPolygonNORI'))!.address],
    options: {
      initializer: 'initialize(address)',
      unsafeAllow: ['constructor'],
    },
  });
};

export const deployTestContracts = async ({
  hre,
  contractNames: contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contractNames: (keyof Contracts)[];
}): Promise<Contracts> => {
  const isTestnet = ['mumbai', 'goerli'].includes(hre.network.name);
  const scheduleTestHarnessInstance =
    isTestnet !== null && contracts.includes('LockedNORILibTestHarness')
      ? await hre.deployNonUpgradeable<
          LockedNORILibTestHarness,
          LockedNORILibTestHarness__factory
        >({
          contractName: 'LockedNORILibTestHarness',
          args: [],
        })
      : undefined;
  return {
    ...(scheduleTestHarnessInstance !== null && {
      LockedNORILibTestHarness: scheduleTestHarnessInstance,
    }),
  };
};

/**
 * Note: the named contracts in the ethernal UI are the proxies.
 * The 'name' field in the push command must match the contract name exactly,
 * so labeling the implementations would add confusion.
 */
export const pushContractsToEthernal = async ({
  hre,
  contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: Contracts;
}): Promise<void> => {
  if (!Boolean(hre.userConfig.ethernal?.disableSync)) {
    hre.trace('pushing contracts to ethernal');
    await Promise.allSettled(
      Object.entries(contracts)
        .filter(([_, value]) => value !== undefined)
        .map(async ([name, { address }]) => {
          return hre.ethernal.push({ name, address });
        })
    );
    hre.trace('pushed contracts to ethernal');
  }
};

export const addContractsToDefender = async ({
  hre,
  contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: Contracts;
}): Promise<void> => {
  if (hre.network.name !== 'hardhat') {
    await hre.run('defender:add', {
      contractNames: Object.entries(contracts)
        .filter(([_, value]) => value !== undefined)
        .map(([name, _]) => name), // todo Upsert contracts to OZ defender (otherwise they are added twice)
    } as any);
  }
};

// TODO: Would like to store more details of the deployment here like ABI
export const saveDeployments = async ({
  hre,
  contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: Contracts;
}): Promise<void> => {
  hre.trace('saving deployments');

  await Promise.all(
    Object.entries(contracts)
      .filter(([_, value]) => value !== undefined)
      .map(async ([name, contract]) => {
        const { abi, bytecode, deployedBytecode } =
          await hre.artifacts.readArtifact(name);
        if (process.env.TENDERLY === true) {
          // todo move to own deploy script
          hre.trace('persisting artifacts to tenderly');
          await hre.tenderly.persistArtifacts({
            name,
            address: contract.address,
            network: hre.network.name,
          });
        }
        return hre.deployments.save(name, {
          abi,
          address: contract.address,
          bytecode,
          deployedBytecode,
        });
      })
  );
  hre.trace('saved deployments');
};

/**
 * Seeds contracts with some initial removals and market listings
 *
 * @deprecated
 *
 * @todo don't do this during deployment
 */
export const seedContracts = async ({
  hre,
  contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: Contracts;
}): Promise<void> => {
  if (
    contracts.Certificate !== undefined &&
    contracts.Market !== undefined &&
    contracts.Removal !== undefined
  ) {
    const tokenId = {
      ...defaultRemovalTokenIdFixture,
      subIdentifier: generateRandomSubIdentifier(), // keep token ids unique
    };
    const packedData = await createBatchMintData({
      hre,
      scheduleStartTime: await getLatestBlockTime({ hre }),
    });
    const tx = await contracts.Removal.mintBatch(
      contracts.Market.address,
      [formatTokenAmount(100)],
      [tokenId],
      packedData.projectId,
      packedData.scheduleStartTime,
      packedData.holdbackPercentage
    );
    hre.trace('Listed 100 NRTs for sale in Market', { tx: tx.hash });
  }
  if (
    contracts.BridgedPolygonNORI !== undefined &&
    contracts.NORI !== undefined &&
    (hre.network.name === 'hardhat' || hre.network.name === 'localhost')
  ) {
    await mockDepositNoriToPolygon({
      hre,
      contracts: {
        BridgedPolygonNORI: contracts.BridgedPolygonNORI,
        NORI: contracts.NORI,
      },
      amount: formatTokenAmount(100_000_000),
      to: hre.namedAccounts.admin,
      signer: hre.namedSigners.admin,
    });
    hre.trace(
      'Mock deposited 100_000_000 NORI into BridgedPolygonNORI for the admin account'
    );
    const tx = await contracts.BridgedPolygonNORI.connect(
      hre.namedSigners.admin
    ).transfer(
      // todo stop minting/seeding during deployment
      hre.namedAccounts.buyer,
      formatTokenAmount(1_000_000)
    );
    hre.trace(
      'Sent some BridgedPolygonNORI from the admin account to the buyer account',
      tx.hash
    );
  }
};

// TODO: These could all operate on a single contract at a time now.
export const finalizeDeployments = async ({
  hre,
  contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: Contracts;
}): Promise<void> => {
  await pushContractsToEthernal({ hre, contracts });
  writeContractsConfig({ contracts });
  await addContractsToDefender({ hre, contracts });
  await verifyContracts({ hre, contracts });
  await saveDeployments({
    hre,
    contracts,
  });
};
