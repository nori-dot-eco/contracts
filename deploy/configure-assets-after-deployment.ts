import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';
import type { ContractTransaction } from 'ethers';

import {
  getBridgedPolygonNori,
  getCertificate,
  getMarket,
  getRemoval,
  getRestrictedNORI,
} from '@/utils/contracts';

const CONFIRMATIONS = 5;
export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  Logger.setLogLevel(Logger.levels.DEBUG);
  hre.trace(`configure-assets-after-deployment`);

  // impersonating the fireblocks account that deployed contracts
  // on mainnet so that we can test mainnet deploy on a local fork
  // used this issue to figure out how to do this:
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
  const market = await getMarket({ hre, signer });
  const certificate = await getCertificate({ hre, signer });
  const rNori = await getRestrictedNORI({ hre, signer });
  const removal = await getRemoval({ hre, signer });
  const bpNori = await getBridgedPolygonNori({ hre, signer });
  let txn: ContractTransaction;
  if (
    !(await rNori.hasRole(await rNori.SCHEDULE_CREATOR_ROLE(), removal.address))
  ) {
    hre.trace(
      "Granting Removal the role 'SCHEDULE_CREATOR_ROLE' for RestrictedNORI..."
    );
    const txn = await rNori.grantRole(
      await rNori.SCHEDULE_CREATOR_ROLE(),
      removal.address
    );
    await txn.wait(CONFIRMATIONS);
    hre.trace(
      "Granted Removal the role 'SCHEDULE_CREATOR_ROLE' for RestrictedNORI"
    );
  }

  if (!(await rNori.hasRole(await rNori.MINTER_ROLE(), market.address))) {
    hre.trace("Granting Market the role 'MINTER_ROLE' for RestrictedNORI...");
    txn = await rNori.grantRole(
      hre.ethers.utils.id('MINTER_ROLE'),
      market.address
    );
    await txn.wait(CONFIRMATIONS);
    hre.trace("Granted Market the role 'MINTER_ROLE' for RestrictedNORI");
  }
  // TODO figure out how to make a check about what these addresses are currently set to
  // bigger TODO: expose getters for these on the contract
  txn = await rNori.registerContractAddresses(
    bpNori.address,
    removal.address,
    market.address
  );
  await txn.wait(CONFIRMATIONS);
  hre.trace('Set removal, bpNori and market addresses in rNori');
  if ((await certificate.getRemovalAddress()) !== removal.address) {
    hre.trace('Setting removal address in Certificate contract...');
    txn = await certificate.registerContractAddresses(removal.address);
    await txn.wait(CONFIRMATIONS);
    hre.trace('Set removal addresses in Certificate');
  }
  if (
    (await market.getRemovalAddress()) !== removal.address ||
    (await market.getCertificateAddress()) !== certificate.address
  ) {
    hre.trace(
      'Setting removal and certificate addresses in Removal contract...'
    );
    txn = await removal.registerContractAddresses(
      market.address,
      certificate.address
    );
    await txn.wait(CONFIRMATIONS);
    hre.trace('Set market and certificate addresses in Removal');
  }
};

export default deploy;
deploy.tags = ['market', 'configure'];
// TODO is there a way to remove this 'Market' dependency?
deploy.dependencies = ['Market'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
