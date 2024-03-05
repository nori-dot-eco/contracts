import { Logger } from 'ethers/lib/utils';
import type { DeployFunction } from 'hardhat-deploy/types';
import type { ContractTransaction } from 'ethers';
import { BigNumber } from 'ethers';

import {
  STAGING_USDC_TOKEN_ADDRESS,
  PROD_USDC_TOKEN_ADDRESS,
  PROD_NORI_FEE_WALLET_ADDRESS,
  STAGING_NORI_FEE_WALLET_ADDRESS,
} from '../constants/addresses';

import {
  getBridgedPolygonNori,
  getCertificate,
  getMarket,
  getRemoval,
} from '@/utils/contracts';

export const deploy: DeployFunction = async (environment) => {
  const hre = environment as unknown as CustomHardHatRuntimeEnvironment;
  const CONFIRMATIONS =
    hre.network.name === 'localhost' || hre.network.name === 'hardhat' ? 1 : 5;

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
  const removal = await getRemoval({ hre, signer });
  const bpNori = await getBridgedPolygonNori({ hre, signer });

  // SW: Leaving the default local configuration as bridged polygon NORI
  // for the purchase token to minimize test breakage.
  let purchaseTokenAddress = bpNori.address;
  let priceMultiple = BigNumber.from(100);
  if (hre.network.name === 'polygon') {
    purchaseTokenAddress = PROD_USDC_TOKEN_ADDRESS;
    priceMultiple = BigNumber.from(2000);
  } else if (hre.network.name === 'mumbai') {
    purchaseTokenAddress = STAGING_USDC_TOKEN_ADDRESS;
    priceMultiple = BigNumber.from(2000);
  }
  const restrictionScheduleDuration = 315_569_520; // seconds in 10 years
  const feeWalletAddress = ['hardhat', 'localhost'].includes(hre.network.name)
    ? hre.namedAccounts.noriWallet
    : hre.network.name === 'polygon'
    ? PROD_NORI_FEE_WALLET_ADDRESS
    : STAGING_NORI_FEE_WALLET_ADDRESS;
  let txn: ContractTransaction;
  if ((await certificate.getRemovalAddress()) !== removal.address) {
    hre.trace('Setting removal address in Certificate contract...');
    txn = await certificate.registerContractAddresses(removal.address);
    await txn.wait(CONFIRMATIONS);
    hre.trace('Set removal addresses in Certificate');
  }
  if (
    (await removal.getMarketAddress()) !== market.address ||
    (await removal.getCertificateAddress()) !== certificate.address
  ) {
    hre.trace(
      'Setting market and certificate addresses in Removal contract...'
    );
    txn = await removal.registerContractAddresses(
      market.address,
      certificate.address
    );
    await txn.wait(CONFIRMATIONS);
    hre.trace('Set market and certificate addresses in Removal');
  }

  if (
    (await market.getPurchasingTokenAddress()) !== purchaseTokenAddress ||
    (await market.getPriceMultiple()) !== priceMultiple
  ) {
    txn = await market.setPurchasingTokenAndPriceMultiple(
      purchaseTokenAddress,
      priceMultiple
    );
    await txn.wait(CONFIRMATIONS);
    hre.trace(
      `Set ${
        purchaseTokenAddress === bpNori.address ? 'bpNORI' : 'USDC'
      } as purchase token with price multiple of ${priceMultiple}`
    );
  }
  // TODO: Configure the purchasing token and fee percentage somewhere more global
  if ((await market.getNoriFeePercentage()) !== BigNumber.from(25)) {
    txn = await market.setNoriFeePercentage(25);
    await txn.wait(CONFIRMATIONS);
    hre.trace('Set fee percentage to 25');
  }

  if ((await market.getNoriFeeWallet()) !== feeWalletAddress) {
    txn = await market.setNoriFeeWallet(feeWalletAddress);
    await txn.wait(CONFIRMATIONS);
    hre.trace(`Updated fee wallet address to ${feeWalletAddress}`);
  }
};

export default deploy;
deploy.tags = ['configure'];
// TODO is there a way to remove this 'Market' dependency?
deploy.dependencies = ['Market'];
deploy.skip = async (hre) =>
  Promise.resolve(
    !['polygon', 'mumbai', 'localhost', 'hardhat'].includes(hre.network.name)
  );
