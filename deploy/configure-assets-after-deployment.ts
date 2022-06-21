import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';

import {
  getBridgedPolygonNori,
  getCertificate,
  getFIFOMarket,
  getRemoval,
  getRestrictedNORI,
} from '@/utils/contracts';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`configure-assets-after-deployment`);
  const [signer] = await hre.getSigners();
  const fifoMarket = await getFIFOMarket({ hre, signer });
  const certificate = await getCertificate({ hre, signer });
  const rNori = await getRestrictedNORI({ hre, signer });
  const removal = await getRemoval({ hre, signer });
  const bpNori = await getBridgedPolygonNori({ hre, signer });
  if (
    !(await certificate.hasRole(
      await certificate.MINTER_ROLE(),
      fifoMarket.address
    ))
  ) {
    await certificate.grantRole(
      await certificate.MINTER_ROLE(),
      fifoMarket.address
    );
  }
  hre.trace('Added FIFOMarket as a minter of Certificate');

  await rNori.registerContractAddresses(
    fifoMarket.address,
    bpNori.address,
    removal.address
  );
  hre.trace('Set market, removal and bpNori addresses in rNori');
  await removal.registerRestrictedNORIAddress(rNori.address);
  hre.trace('Set rNori address in Removal');
};

export default deploy;
deploy.tags = ['market'];
deploy.dependencies = ['FIFOMarket'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
