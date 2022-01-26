import path from 'path';

import { writeJsonSync, readJsonSync } from 'fs-extra';

import type {
  Certificate,
  Certificate__factory,
  FIFOMarket,
  FIFOMarket__factory,
  NCCRV0,
  NCCRV0__factory,
  NORI,
  NoriV0,
  NoriV0__factory,
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
  const { noriWallet, buyer, supplier, admin } = await getNamedAccounts();
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
  // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
  const Nori_V0 = await ethers.getContractFactory<NoriV0__factory>('Nori_V0'); // todo deprecate
  const noriV0Instance = await deployProxy<NoriV0>(Nori_V0, [], {
    initializer: 'initialize()',
  }); // todo deprecate
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const NCCR_V0 = await ethers.getContractFactory<NCCRV0__factory>('NCCR_V0'); // todo deprecate
  const nccrV0Instance = await deployProxy<NCCRV0>(NCCR_V0, [], {
    initializer: 'initialize()',
  }); // todo deprecate
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
  await noriV0Instance.deployed();
  await nccrV0Instance.deployed();
  await noriInstance.deployed();
  await removalInstance.deployed();
  await certificateInstance.deployed();
  await fifoMarketInstance.deployed();
  console.log('Deployed NORI', noriInstance.address);
  console.log('Deployed Removal', removalInstance.address);
  console.log('Deployed Certificate', certificateInstance.address);
  console.log('Deployed FIFOMarket', fifoMarketInstance.address);
  await certificateInstance.addMinter(fifoMarketInstance.address);
  console.log('Added FIFOMarket as a minter of Certificate');
  if (network.name === 'hardhat') {
    await Promise.all([
      removalInstance.mintBatch(
        supplier,
        [ethers.utils.parseUnits('100')],
        [2018],
        ethers.utils.formatBytes32String('0x0')
      ),
      noriInstance.mint(
        buyer,
        ethers.utils.parseUnits('1000000'),
        ethers.utils.formatBytes32String('0x0'),
        ethers.utils.formatBytes32String('0x0')
      ),
      noriV0Instance.mint(buyer, ethers.utils.parseUnits('1000000')),
      noriV0Instance.mint(supplier, ethers.utils.parseUnits('100')),
      noriV0Instance.mint(admin, ethers.utils.parseUnits('100')),
    ]);
    const accounts = await ethers.getSigners();
    await removalInstance
      .connect(accounts[2])
      .safeBatchTransferFrom(
        supplier,
        fifoMarketInstance.address,
        [0],
        [ethers.utils.parseUnits('100')],
        ethers.utils.formatBytes32String('0x0')
      );
    console.log('Minted NORI and Nori_V0 to buyer wallet', buyer);
    console.log('Listed 100 NRTs for sale in FIFOMarket');
    /*
    Note: the named contracts in the ethernal UI are the proxies.
    The 'name' field in the push command must match the contract name exactly,
    so labeling the implementations would add confusion.
    */
    if (process.env.ETHERNAL_EMAIL && process.env.ETHERNAL_PASSWORD) {
      await Promise.all([
        ethernal.push({
          name: 'Nori_V0',
          address: noriV0Instance.address,
        }),
        ethernal.push({
          name: 'NCCR_V0',
          address: nccrV0Instance.address,
        }),
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
      ]);
      console.log('Registered contracts in Ethernal', buyer);
    }
  }
  console.log('Writing contracts.json config');
  const originalContractsJson =
    readJsonSync(path.join(__dirname, '../contracts.json'), {
      throws: false,
    }) ?? {};
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
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Nori_V0: {
          proxyAddress: noriV0Instance.address,
        },
        NCCR_V0: {
          proxyAddress: nccrV0Instance.address,
        },
      },
      mainnet: {
        // todo use new contracts when ready (remove NCCR_V0 + Nori_V0)
        NCCR_V0: {
          proxyAddress: '0xBBbD7AEBD29360a34ceA492e012B9A2119DEd306',
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Nori_V0: {
          proxyAddress: '0x1f77C0415bc4E5B5Dcb33C796F9c8cd8cc1c259d',
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
  const nccrV0Implementation =
    await hre.upgrades.erc1967.getImplementationAddress(nccrV0Instance.address);
  const noriV0Implementation =
    await hre.upgrades.erc1967.getImplementationAddress(noriV0Instance.address);
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
      address: nccrV0Implementation,
      constructorArguments: [],
    }),
    run('verify:verify', {
      address: noriV0Implementation,
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
