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
} from '../typechain-types';
import contractsConfig from '../contracts.json';

export interface Contracts {
  Removal: Removal;
  NORI: NORI;
  FIFOMarket: FIFOMarket;
  LockedNORI: LockedNORI;
  Certificate: Certificate;
}

export const verifyContracts = async ({
  hre,
  contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: Contracts;
}): Promise<void> => {
  if (hre.network.name !== 'hardhat') {
    console.log('Verifying contracts');
    await Promise.allSettled(
      Object.values(contracts).map(async ({ address }) => {
        return hre.run('verify:verify', {
          address: await hre.upgrades.erc1967.getImplementationAddress(address),
          constructorArguments: [],
        });
      })
    );
    console.log('Verified contracts');
  }
};

export const writeContractsConfig = ({
  contracts,
}: {
  contracts: Contracts;
}): void => {
  console.log('Writing contracts.json config', hre.network.name);
  writeJsonSync(
    path.join(__dirname, '../contracts.json'),
    {
      ...contractsConfig,
      [hre.network.name]: Object.fromEntries(
        Object.entries(contracts).map(([name, { address: proxyAddress }]) => [
          name,
          { proxyAddress },
        ])
      ),
    },
    { spaces: 2 }
  );
  console.log('Wrote contracts.json config');
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
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): Promise<Contracts> => {
  const noriInstance = await hre.deployOrUpgradeProxy<NORI, NORI__factory>({
    contractName: 'NORI',
    args: [],
  });
  const removalInstance = await hre.deployOrUpgradeProxy<
    Removal,
    Removal__factory
  >({
    contractName: 'Removal',
    args: [],
    options: { initializer: 'initialize()' },
  });
  const certificateInstance = await hre.deployOrUpgradeProxy<
    Certificate,
    Certificate__factory
  >({
    contractName: 'Certificate',
    args: [],
    options: { initializer: 'initialize()' },
  });
  const fifoMarketInstance = await hre.deployOrUpgradeProxy<
    FIFOMarket,
    FIFOMarket__factory
  >({
    contractName: 'FIFOMarket',
    args: [
      removalInstance.address,
      noriInstance.address,
      certificateInstance.address,
      hre.namedAccounts.noriWallet,
      15,
    ],
    options: {
      initializer: 'initialize(address,address,address,address,uint256)',
    },
  });
  const lNoriInstance = await hre.deployOrUpgradeProxy<
    LockedNORI,
    LockedNORI__factory
  >({
    contractName: 'LockedNORI',
    args: [noriInstance.address],
    options: { initializer: 'initialize(address)' },
  });
  return {
    NORI: noriInstance,
    Removal: removalInstance,
    Certificate: certificateInstance,
    FIFOMarket: fifoMarketInstance,
    LockedNORI: lNoriInstance,
  };
};

export const validateDeployment = ({
  hre,
}: {
  hre: CustomHardHatRuntimeEnvironment;
}): void => {
  if (hre.network.name === 'mainnet') {
    throw new Error('You cannot deploy to mainnet yet');
  }
  if (
    (['goerli', 'mumbai'].includes(hre.network.name) &&
      hre.namedAccounts.admin !==
        '0x465d5a3fFeA4CD109043499Fa576c3E16f918463') ||
    (['polygon', 'mainnet'].includes(hre.network.name) &&
      hre.namedAccounts.admin !== '0x465d5a3fFeA4CD109043499Fa576c3E16f918463')
  ) {
    throw new Error(
      `You can only deploy to ${hre.network.name} using the admin account`
    );
  }
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
    console.log('pushing contracts to ethernal');
    await Promise.allSettled(
      Object.entries(contracts).map(async ([name, { address }]) => {
        return hre.ethernal.push({ name, address });
      })
    );
    console.log('pushed contracts to ethernal');
  }
};

export const addContractsToDefender = async ({
  hre,
  contracts,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: Contracts;
}): Promise<void> => {
  await hre.run('defender:add', {
    contractNames: Object.keys(contracts).map((name) => name), // todo delete existing contracts from defender and re-add
  });
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
  await contracts.Certificate.addMinter(contracts.FIFOMarket.address); // todo stop doing this during deployment for cypress tests (use run('nori mint ...') in tests instead)
  console.log('Added FIFOMarket as a minter of Certificate');
  if (
    hre.network.name === 'hardhat' &&
    process.env.MINT &&
    process.env.MINT !== 'false'
  ) {
    const parcelIdentifier = hre.ethers.utils.formatBytes32String(
      'someParcelIdentifier'
    );
    const listNow = true;
    const packedData = hre.ethers.utils.defaultAbiCoder.encode(
      ['address', 'bytes32', 'bool'],
      [contracts.FIFOMarket.address, parcelIdentifier, listNow]
    );
    await Promise.all([
      contracts.Removal.mintBatch(
        hre.namedAccounts.supplier,
        [ethers.utils.parseUnits('100')],
        [2018],
        packedData
      ),
      contracts.NORI.mint(
        hre.namedAccounts.buyer,
        ethers.utils.parseUnits('1000000'),
        ethers.utils.formatBytes32String('0x0'),
        ethers.utils.formatBytes32String('0x0')
      ),
    ]);
    console.log('Minted 1000000 NORI to buyer wallet', hre.namedAccounts.buyer);
    console.log('Listed 100 NRTs for sale in FIFOMarket');
  }
};
