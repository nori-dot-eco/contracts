import path from 'path';

import { writeJsonSync, readJsonSync } from 'fs-extra';

import type {
  Certificate,
  Certificate__factory,
  FIFOMarket,
  FIFOMarket__factory,
  LockedNORI,
  LockedNORI__factory,
  NORI,
  NORI__factory,
  Removal,
  Removal__factory,
} from '../typechain-types';

const func: CustomHardhatDeployFunction = async (hre) => {
  // todo throw if wrong account is deploying on goerli, mumbai or mainnet
  // todo does deploy proxy always deploy a proxy or will it upgradeTo if it exists?
  const {
    getNamedAccounts,
    upgrades: { deployProxy },
    ethers,
    run,
    network,
    ethernal,
  } = hre;
  const { noriWallet, buyer, supplier } = await getNamedAccounts();
  if ((network.name as string) === 'mainnet') {
    throw new Error('You cannot deploy to mainnet yet');
  }
  if (network.name === 'hardhat') {
    await network.provider.send('hardhat_setLoggingEnabled', [true]);
    if (process.env.ETHERNAL_EMAIL && process.env.ETHERNAL_PASSWORD) {
      await ethernal.startListening();
      await run('ethernal:reset');
    }
    await run('deploy:erc1820');
  }
  const originalContractsJson =
    readJsonSync(path.join(__dirname, '../contracts.json'), {
      throws: false,
    }) ?? {};
  console.log('Deployed legacy contracts (Nori_V0 and NCCR_V0)');
  const NORI = await ethers.getContractFactory<NORI__factory>('NORI');
  const Removal = await ethers.getContractFactory<Removal__factory>('Removal');
  const Certificate = await ethers.getContractFactory<Certificate__factory>(
    'Certificate'
  );
  const FIFOMarket = await ethers.getContractFactory<FIFOMarket__factory>(
    'FIFOMarket'
  );
  const noriInstance = await deployProxy<NORI>(NORI, []);
  const removalInstance = await deployProxy<Removal>(Removal, [], {
    initializer: 'initialize()',
  });
  const certificateInstance = await deployProxy<Certificate>(Certificate, [], {
    initializer: 'initialize()',
  });
  const fifoMarketInstance = await deployProxy<FIFOMarket>(
    FIFOMarket,
    [
      removalInstance.address,
      noriInstance.address,
      certificateInstance.address,
      noriWallet,
      15,
    ],
    {
      initializer: 'initialize(address,address,address,address,uint256)',
    }
  );
  const LockedNORI = await ethers.getContractFactory<LockedNORI__factory>(
    'LockedNORI'
  );
  await noriInstance.deployed();
  await removalInstance.deployed();
  await certificateInstance.deployed();
  await fifoMarketInstance.deployed();
  console.log('Deployed NORI', noriInstance.address);
  console.log('Deployed Removal', removalInstance.address);
  console.log('Deployed Certificate', certificateInstance.address);
  console.log('Deployed FIFOMarket', fifoMarketInstance.address);
  console.log('Deploying LockedNORI');
  const lNoriInstance = await deployProxy<LockedNORI>(
    LockedNORI,
    [noriInstance.address],
    {
      initializer: 'initialize(address)',
    }
  );
  await lNoriInstance.deployed();
  console.log('Deployed LockedNORI', lNoriInstance.address);
  await certificateInstance.addMinter(fifoMarketInstance.address);
  await hre.run('defender:add', {
    contractNames: ['NCCR_V0', 'NORI', 'Removal', 'Certificate', 'FIFOMarket'],
  });
  console.log('Added FIFOMarket as a minter of Certificate');
  const parcelIdentifier = hre.ethers.utils.formatBytes32String(
    'someParcelIdentifier'
  );
  const list = true;
  const packedData = hre.ethers.utils.defaultAbiCoder.encode(
    ['address', 'bytes32', 'bool'],
    [fifoMarketInstance.address, parcelIdentifier, list]
  );
  if (network.name === 'hardhat') {
    await Promise.all([
      removalInstance.mintBatch(
        supplier,
        [ethers.utils.parseUnits('100')],
        [2018],
        packedData
      ),
      noriInstance.mint(
        buyer,
        ethers.utils.parseUnits('1000000'),
        ethers.utils.formatBytes32String('0x0'),
        ethers.utils.formatBytes32String('0x0')
      ),
    ]);
    console.log('Minted 1000000 NORI to buyer wallet', buyer);
    await removalInstance
      .connect(await ethers.getSigner(supplier))
      .safeBatchTransferFrom(
        supplier,
        fifoMarketInstance.address,
        [0],
        [ethers.utils.parseUnits('100')],
        ethers.utils.formatBytes32String('0x0')
      );
    console.log('Listed 100 NRTs for sale in FIFOMarket');
    /*
    Note: the named contracts in the ethernal UI are the proxies.
    The 'name' field in the push command must match the contract name exactly,
    so labeling the implementations would add confusion.
    */
    if (process.env.ETHERNAL_EMAIL && process.env.ETHERNAL_PASSWORD) {
      await Promise.all([
        ethernal.push({
          name: 'NORI',
          address: noriInstance.address,
        }),
        ethernal.push({
          name: 'Removal',
          address: removalInstance.address,
        }),
        ethernal.push({
          name: 'Certificate',
          address: certificateInstance.address,
        }),
        ethernal.push({
          name: 'FIFOMarket',
          address: fifoMarketInstance.address,
        }),
        ethernal.push({
          name: 'LockedNORI',
          address: lNoriInstance.address,
        }),
      ]);
      console.log('Registered contracts in Ethernal', buyer);
    }
  }
  console.log('Writing contracts.json config');
  writeJsonSync(
    path.join(__dirname, '../contracts.json'),
    {
      ...originalContractsJson,
      [hre.network.name]: {
        NORI: {
          proxyAddress: noriInstance.address,
        },
        Removal: {
          proxyAddress: removalInstance.address,
        },
        Certificate: {
          proxyAddress: certificateInstance.address,
        },
        FIFOMarket: {
          proxyAddress: fifoMarketInstance.address,
        },
        LockedNORI: {
          proxyAddress: lNoriInstance.address,
        },
      },
      mainnet: {
        // todo use new contracts when ready (remove NCCR_V0 + Nori_V0)
        NCCR_V0: {
          proxyAddress: '0xBBbD7AEBD29360a34ceA492e012B9A2119DEd306',
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        Nori_V0: {
          proxyAddress: '0x1f77C0415bc4E5B5Dcb33C796F9c8cd8cc1c259d',
        },
        NORI: {
          proxyAddress: '',
        },
        Removal: {
          proxyAddress: '',
        },
        Certificate: {
          proxyAddress: '',
        },
        FIFOMarket: {
          proxyAddress: '',
        },
      },
    },
    { spaces: 2 }
  );
  console.log('Wrote contracts.json config');
  console.log('Verifying contracts');
  const noriImplementation =
    await hre.upgrades.erc1967.getImplementationAddress(noriInstance.address);
  const removalImplementation =
    await hre.upgrades.erc1967.getImplementationAddress(
      removalInstance.address
    );
  const fifoMarketImplementation =
    await hre.upgrades.erc1967.getImplementationAddress(
      fifoMarketInstance.address
    );
  const certificateImplementation =
    await hre.upgrades.erc1967.getImplementationAddress(
      certificateInstance.address
    );
  await Promise.allSettled([
    run('verify:verify', {
      address: noriImplementation,
      constructorArguments: [],
    }),
    run('verify:verify', {
      address: removalImplementation,
      constructorArguments: [],
    }),
    run('verify:verify', {
      address: fifoMarketImplementation,
      constructorArguments: [],
    }),
    run('verify:verify', {
      address: certificateImplementation,
      constructorArguments: [],
    }),
  ]);
  console.log('Verified contracts');
};

export default func;
