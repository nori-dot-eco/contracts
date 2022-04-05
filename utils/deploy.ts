import path from 'path';

import { writeJsonSync } from 'fs-extra';

import type {
  LockedNORI,
  Certificate,
  FIFOMarket,
  NORI,
  Removal,
  Certificate__factory,
  Removal__factory,
  NORI__factory,
  FIFOMarket__factory,
  LockedNORI__factory,
  BridgedPolygonNORI,
  BridgedPolygonNORI__factory,
  ScheduleTestHarness,
  ScheduleTestHarness__factory,
} from '../typechain-types';
import contractsConfig from '../contracts.json';

import { formatTokenAmount } from '@/utils/units';
import {
  MUMBAI_CHILD_CHAIN_MANAGER_PROXY,
  POLYGON_CHILD_CHAIN_MANAGER_PROXY,
  STAGING_DEPLOYMENT_ADDRESS,
  PROD_DEPLOYMENT_ADDRESS,
} from '@/constants/addresses';
import { mockDepositNoriToPolygon } from '@/test/helpers';

export interface Contracts {
  Removal?: Removal;
  NORI?: NORI;
  BridgedPolygonNORI?: BridgedPolygonNORI;
  FIFOMarket?: FIFOMarket;
  LockedNORI?: LockedNORI;
  Certificate?: Certificate;
  ScheduleTestHarness?: ScheduleTestHarness;
}

export const verifyContracts = async ({
  hre,
  contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: Contracts;
}): Promise<void> => {
  if (hre.network.name !== 'hardhat') {
    hre.trace('Verifying contracts');
    await Promise.allSettled(
      Object.values(contracts).map(async ({ address }) => {
        return hre.run('verify:verify', {
          address: await hre.upgrades.erc1967.getImplementationAddress(address),
          constructorArguments: [],
        } as any);
      })
    );
    hre.trace('Verified contracts');
  }
};

export const writeContractsConfig = ({
  contracts,
}: {
  contracts: Contracts;
}): void => {
  hre.trace('Writing contracts.json config', hre.network.name);
  writeJsonSync(
    path.join(__dirname, '../contracts.json'),
    {
      ...contractsConfig,
      [hre.network.name]: {
        ...contractsConfig[hre.network.name],
        ...Object.fromEntries(
          Object.entries(contracts).map(([name, contract]) => {
            const proxyAddress = contract?.address;
            if (proxyAddress) {
                // TODO: Incorrect for upgraeable
                return [name, { proxyAddress }];
            }
            return [];
          })
        ),
      },
    },
    { spaces: 2 }
  );
  hre.trace('Wrote contracts.json config');
};

export const configureDeploymentSettings = async ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<void> => {
  if (hre.ethernalSync) {
    await hre.ethernal.resetWorkspace('nori');
    await hre.ethernal.startListening();
  }
  if (hre.network.name === 'hardhat') {
    await hre.run('deploy:erc1820');
  }
};

export const deployContracts = async ({
  hre,
  contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: ContractNames[];
}): Promise<Contracts> => {
  const isPolygonNetwork = ['mumbai', 'polygon', 'hardhat'].includes(
    hre.network.name
  );
  const isMainNetwork = ['mainnet', 'goerli'].includes(hre.network.name);
  const isTestnet = ['mumbai', 'goerli'].includes(hre.network.name);
  const isLocalNetwork = ['hardhat', 'localhost'].includes(hre.network.name);
  const noriInstance =
    (isMainNetwork || isLocalNetwork) && contracts.includes('NORI')
      ? await hre.deployOrUpgradeProxy<NORI, NORI__factory>({
          contractName: 'NORI',
          args: [],
        })
      : undefined;
  const removalInstance =
    (isPolygonNetwork || isLocalNetwork) && contracts.includes('Removal')
      ? await hre.deployOrUpgradeProxy<Removal, Removal__factory>({
          contractName: 'Removal',
          args: [],
          options: { initializer: 'initialize()' },
        })
      : undefined;
  const certificateInstance =
    (isPolygonNetwork || isLocalNetwork) && contracts.includes('Certificate')
      ? await hre.deployOrUpgradeProxy<Certificate, Certificate__factory>({
          contractName: 'Certificate',
          args: [],
          options: { initializer: 'initialize()' },
        })
      : undefined;
  const bridgedPolygonNoriInstance =
    (isPolygonNetwork || isLocalNetwork) &&
    contracts.includes('BridgedPolygonNORI')
      ? await hre.deployOrUpgradeProxy<
          BridgedPolygonNORI,
          BridgedPolygonNORI__factory
        >({
          contractName: 'BridgedPolygonNORI',
          args: [
            hre.network.name === 'polygon'
              ? POLYGON_CHILD_CHAIN_MANAGER_PROXY
              : MUMBAI_CHILD_CHAIN_MANAGER_PROXY,
          ],
          options: { initializer: 'initialize(address)' },
        })
      : undefined;
  const fifoMarketInstance =
    removalInstance != null &&
    certificateInstance != null &&
    bridgedPolygonNoriInstance != null &&
    contracts.includes('FIFOMarket')
      ? await hre.deployOrUpgradeProxy<FIFOMarket, FIFOMarket__factory>({
          contractName: 'FIFOMarket',
          args: [
            removalInstance.address,
            bridgedPolygonNoriInstance.address,
            certificateInstance.address,
            hre.namedAccounts.noriWallet,
            15,
          ],
          options: {
            initializer: 'initialize(address,address,address,address,uint256)',
          },
        })
      : undefined;
  const lNoriInstance =
    bridgedPolygonNoriInstance != null && contracts.includes('LockedNORI')
      ? await hre.deployOrUpgradeProxy<LockedNORI, LockedNORI__factory>({
          contractName: 'LockedNORI',
          args: [bridgedPolygonNoriInstance.address],
          options: { initializer: 'initialize(address)' },
        })
      : undefined;
  const scheduleTestHarnessInstance =
    isTestnet !== null && contracts.includes('ScheduleTestHarness')
      ? await hre.deployNonUpgradeable<
          ScheduleTestHarness,
          ScheduleTestHarness__factory
        >({
          contractName: 'ScheduleTestHarness',
          args: [],
        })
      : undefined;
  return {
    ...(noriInstance != null && { NORI: noriInstance }),
    ...(bridgedPolygonNoriInstance != null && {
      BridgedPolygonNORI: bridgedPolygonNoriInstance,
    }),
    ...(removalInstance != null && { Removal: removalInstance }),
    ...(certificateInstance != null && { Certificate: certificateInstance }),
    ...(fifoMarketInstance != null && { FIFOMarket: fifoMarketInstance }),
    ...(lNoriInstance != null && { LockedNORI: lNoriInstance }),
    ...(scheduleTestHarnessInstance !== null && {
      ScheduleTestHarness: scheduleTestHarnessInstance,
    }),
  };
};

export const validateDeployment = ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): void => {
  if (['polygon', 'mainnet'].includes(hre.network.name)) {
    throw new Error('You cannot deploy to mainnet yet');
  }
  //   if (
  //     (['goerli', 'mumbai'].includes(hre.network.name) &&
  //       hre.namedAccounts.admin !== STAGING_DEPLOYMENT_ADDRESS) ||
  //     (['polygon', 'mainnet'].includes(hre.network.name) &&
  //       hre.namedAccounts.admin !== PROD_DEPLOYMENT_ADDRESS)
  //   ) {
  //     throw new Error(
  //       `You can only deploy to ${hre.network.name} using the admin account. (${hre.namedAccounts.admin})`
  //     );
  //   }
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
  if (hre.ethernalSync) {
    hre.trace('pushing contracts to ethernal');
    await Promise.allSettled(
      Object.entries(contracts).map(async ([name, { address }]) => {
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
      contractNames: Object.keys(contracts).map((name) => name), // todo delete existing contracts from defender and re-add
    } as any);
  }
};

/**
 * Seeds contracts with some initial removals and market listings
 *
 * @deprecated
 * @todo don't do this during deployment
 */
export const seedContracts = async ({
  hre,
  contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: Contracts;
}): Promise<void> => {
  if (contracts.Certificate != null && contracts.FIFOMarket != null) {
    await contracts.Certificate?.addMinter(contracts.FIFOMarket?.address); // todo stop doing this during deployment for cypress tests (use run('nori mint ...') in tests instead)
    hre.trace('Added FIFOMarket as a minter of Certificate');
  }
  if (process.env.MINT) {
    if (
      contracts.Certificate != null &&
      contracts.FIFOMarket != null &&
      contracts.Removal != null
    ) {
      const listNow = true;
      const packedData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [contracts.FIFOMarket.address, listNow]
      );
      await contracts.Removal.mintBatch(
        hre.namedAccounts.supplier,
        [formatTokenAmount(100)],
        [2018],
        packedData
      );
      hre.trace('Listed 100 NRTs for sale in FIFOMarket');
    }
    if (
      contracts.BridgedPolygonNORI != null &&
      contracts.NORI != null &&
      hre.network.name === 'hardhat'
    ) {
      await mockDepositNoriToPolygon({
        hre,
        contracts: {
          BridgedPolygonNORI: contracts.BridgedPolygonNORI,
          NORI: contracts.NORI,
        },
        amount: formatTokenAmount(500_000_000),
        to: hre.namedAccounts.admin,
        signer: hre.namedSigners.admin,
      });
      hre.trace(
        'Mock deposited 500_000_000 NORI into BridgedPolygonNORI for the admin account'
      );
      await contracts.BridgedPolygonNORI.connect(hre.namedSigners.admin).send(
        // todo stop minting/seeding during deployment
        hre.namedAccounts.buyer,
        formatTokenAmount(1_000_000),
        hre.ethers.utils.formatBytes32String('0x0')
      );
      hre.trace(
        'Sent some BridgedPolygonNORI from the admin account to the buyer account'
      );
    }
  }
};
