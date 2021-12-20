import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { DeployFunction } from 'hardhat-deploy/types';

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
  await run('ethernal:reset');
  await run('test:setup-test-environment');
  const { noriWallet } = await getNamedAccounts();
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
  console.log('Deployed NORI', noriInstance.address);
  console.log('Deployed Removal', removalInstance.address);
  console.log('Deployed Certificate', certificateInstance.address);
  console.log('Deployed FIFOMarket', fifoMarketInstance.address);
  await hre.ethernal.push({
    name: 'NORI',
    address: noriInstance.address,
  });
  await hre.ethernal.push({
    name: 'NORI',
    address: noriInstance.address,
  });
  await hre.ethernal.push({
    name: 'Removal',
    address: removalInstance.address,
  });
  await hre.ethernal.push({
    name: 'Certificate',
    address: certificateInstance.address,
  });
  await hre.ethernal.push({
    name: 'FIFOMarket',
    address: fifoMarketInstance.address,
  });
};
func.tags = ['NORI', 'Removal', 'Certificate', 'FIFOMarket'];
export default func;
