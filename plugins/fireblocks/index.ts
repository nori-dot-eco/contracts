/* eslint-disable no-param-reassign -- hre and config are intended to be configured via assignment in this file */
import '@nomiclabs/hardhat-ethers';
import fs from 'fs';

import { extendConfig, extendEnvironment } from 'hardhat/config';
import { lazyObject } from 'hardhat/plugins';
import type {
  HardhatConfig,
  HardhatUserConfig,
  HttpNetworkConfig,
} from 'hardhat/types';
import './type-extensions';
import { FireblocksSDK, Chain } from 'fireblocks-defi-sdk';

import { FireblocksSigner } from './fireblocks-signer';
import { JsonRpcBatchProviderWithGasFees } from './provider-gas-wrapper';

type NetworkMap = {
  [K in CustomHardHatRuntimeEnvironment['network']['name']]: Chain | undefined;
};

// TODO: move network name translation to our config and make Chain a required config property
const networkNameToChain: NetworkMap = {
  mumbai: Chain.MUMBAI,
  goerli: Chain.GOERLI,
  mainnet: Chain.MAINNET,
  polygon: Chain.POLYGON,
  hardhat: undefined,
  localhost: undefined,
};

const setupFireblocksSigner = async (
  hre: CustomHardHatRuntimeEnvironment
): Promise<FireblocksSigner | undefined> => {
  const networkConfig: HttpNetworkConfig = hre.network
    .config as HttpNetworkConfig;
  const config = hre.config.fireblocks;
  if (config.apiKey && config.apiSecret) {
    try {
      const fireblocksApiClient = new FireblocksSDK(
        config.apiSecret,
        config.apiKey
      );
      const network = networkNameToChain[hre.network.name];
      if (network === undefined) {
        throw new Error(`Invalid network ${hre.network.name}`);
      }
      const signer = new FireblocksSigner(
        fireblocksApiClient,
        network,
        new JsonRpcBatchProviderWithGasFees(
          networkConfig.url,
          networkConfig.chainId
        ),
        config.vaultId
      );
      const address = await signer.getAddress();
      hre.log(
        `Fireblocks signer created for address: ${address} (${hre.network.name})`
      );
      return signer;
    } catch (error) {
      hre.log(error, 'ERROR: Constructing fireblocks signer');
    }
  } else {
    console.log(`ERROR: Fireblocks signer missing configuration.`);
  }
  return undefined;
};

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    const defaultConfig = { apiKey: '', apiSecret: '', vaultId: '0' };
    if (
      userConfig.fireblocks == undefined ||
      !userConfig.fireblocks.apiKey ||
      !userConfig.fireblocks.apiSecret
    ) {
      const sampleConfig = JSON.stringify(
        { apiKey: 'YOUR_API_KEY', apiSecret: 'YOUR_API_SECRET', vaultId: '0' },
        undefined,
        2
      );
      config.fireblocks = defaultConfig;
    } else {
      config.fireblocks = {
        apiKey: userConfig.fireblocks!.apiKey,
        apiSecret: fs.readFileSync(userConfig.fireblocks!.apiSecret, 'utf8'),
        vaultId: userConfig.fireblocks!.vaultId,
      };
    }
  }
);

extendEnvironment((hre) => {
  hre.fireblocks = lazyObject(() => {
    const signer = setupFireblocksSigner(hre);
    const getSigners = async (): Promise<FireblocksSigner[]> => {
      const s = await signer;
      return s === undefined ? [] : [s];
    };
    return {
      getSigners,
      getSigner: async (index: number): Promise<FireblocksSigner | undefined> =>
        (await getSigners())[index],
    };
  });
});
