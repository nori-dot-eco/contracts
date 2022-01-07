import path from 'path';

import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';
import { writeJsonSync, readJsonSync } from 'fs-extra';

import type { namedAccounts } from '../hardhat.config';

interface HRE extends Partial<DeployFunction> {
  (
    hre: Omit<HardhatRuntimeEnvironment, 'getNamedAccounts'> & {
      getNamedAccounts: () => Promise<typeof namedAccounts>;
    }
  ): Promise<void | boolean>;
}

const func: HRE = async (hre) => {
  const {
    getNamedAccounts,
    upgrades: { deployProxy },
    ethers,
    run,
  } = hre;
  await hre.network.provider.send('hardhat_setLoggingEnabled', [true]);
  await hre.ethernal.startListening();
  await run('ethernal:reset'); // todo network === hardhat node only
  await run('deploy:erc1820'); // todo network === hardhat node only
  const { noriWallet, buyer } = await getNamedAccounts();

  // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
  const Nori_V0 = await ethers.getContractFactory('Nori_V0'); // todo deprecate
  const noriV0Instance = await deployProxy(Nori_V0, [], {
    initializer: 'initialize()',
  }); // todo deprecate
  const NCCR_V0 = await ethers.getContractFactory('NCCR_V0'); // todo deprecate
  const nccrV0Instance = await deployProxy(NCCR_V0, [], {
    initializer: 'initialize()',
  }); // todo deprecate

  const NORI = await ethers.getContractFactory('NORI');
  const Removal = await ethers.getContractFactory('Removal');
  const Certificate = await ethers.getContractFactory('Certificate');
  const FIFOMarket = await ethers.getContractFactory('FIFOMarket');
  const noriInstance = await deployProxy(NORI, []);
  const removalInstance = await deployProxy(Removal, [], {
    initializer: 'initialize()',
  });
  const certificateInstance = await deployProxy(Certificate, [], {
    initializer: 'initialize()',
  });
  const fifoMarketInstance = await deployProxy(
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
  const originalContractsJson = readJsonSync(
    path.join(__dirname, '../contracts.json'),
    {
      throws: false,
    }
  ) ?? { contracts: {} };
  writeJsonSync(
    path.join(__dirname, '../contracts.json'),
    {
      contracts: {
        ...originalContractsJson.contracts,
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
    },
    { spaces: 2 }
  );
  console.log('Deployed NORI', noriInstance.address);
  console.log('Deployed Removal', removalInstance.address);
  console.log('Deployed Certificate', certificateInstance.address);
  console.log('Deployed FIFOMarket', fifoMarketInstance.address);
  await certificateInstance.addMinter(fifoMarketInstance.address);
  await (
    await ethers.getSigners()
  )[0].sendTransaction({
    value: ethers.utils.parseUnits('100'),
    to: '0x469B0265F7453c282F4593E1c3482be7a04C37A7',
  });
  await (
    await ethers.getSigners()
  )[0].sendTransaction({
    value: ethers.utils.parseUnits('100'),
    to: '0x570268636168892361D2bC95c9916afe6461bB33',
  });

  console.log('Added FIFOMarket as a minter of Certificate');
  await noriInstance.mint(
    '0x469B0265F7453c282F4593E1c3482be7a04C37A7',
    ethers.utils.parseUnits('1000000'),
    ethers.utils.formatBytes32String('0x0'),
    ethers.utils.formatBytes32String('0x0')
  ); // todo network === hardhat node only
  hre.ethernalTrace = false;
  console.log('Minted NORI to buyer wallet', buyer);
  await Promise.all([
    // todo network === hardhat node only
    hre.ethernal.push({
      name: 'NORI',
      address: noriInstance.address,
    }),
    hre.ethernal.push({
      name: 'Removal',
      address: removalInstance.address,
    }),
    hre.ethernal.push({
      name: 'Certificate',
      address: certificateInstance.address,
    }),
    hre.ethernal.push({
      name: 'FIFOMarket',
      address: fifoMarketInstance.address,
    }),
  ]);
  console.log('Registered contracts in Ethernal', buyer);
};
func.tags = ['NORI', 'Removal', 'Certificate', 'FIFOMarket'];
export default func;
