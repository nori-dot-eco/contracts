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
  const market = await getFIFOMarket({ hre, signer });
  const certificate = await getCertificate({ hre, signer });
  const rNori = await getRestrictedNORI({ hre, signer });
  const removal = await getRemoval({ hre, signer });
  const bpNori = await getBridgedPolygonNori({ hre, signer });
  if (
    !(await certificate.hasRole(
      await certificate.MINTER_ROLE(),
      market.address
    ))
  ) {
    await certificate.grantRole(
      await certificate.MINTER_ROLE(),
      market.address
    );
  }
  hre.trace('Added Market as a minter of Certificate');
  if (
    !(await rNori.hasRole(await rNori.SCHEDULE_CREATOR_ROLE(), market.address))
  ) {
    await rNori.grantRole(
      hre.ethers.utils.id('SCHEDULE_CREATOR_ROLE'),
      market.address
    );
  }
  hre.trace(
    "Granted Market the role 'SCHEDULE_CREATOR_ROLE' for RestrictedNORI"
  );
  if (!(await rNori.hasRole(await rNori.MINTER_ROLE(), market.address))) {
    await rNori.grantRole(hre.ethers.utils.id('MINTER_ROLE'), market.address);
  }
  hre.trace("Granted Market the role 'MINTER_ROLE' for RestrictedNORI");
  await rNori.registerContractAddresses(bpNori.address, removal.address);
  hre.trace('Set market, removal and bpNori addresses in rNori');
  await removal.registerContractAddresses(rNori.address, market.address);
  hre.trace('Set rNori address in Removal');
};

export default deploy;
deploy.tags = ['market'];
deploy.dependencies = ['Market'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
