import '@nomiclabs/hardhat-ethers';
import fs from 'fs';
import { extendConfig, extendEnvironment } from 'hardhat/config';
import { lazyObject } from 'hardhat/plugins';
import {
  HardhatConfig,
  HardhatUserConfig,
  HttpNetworkConfig,
} from 'hardhat/types';
import { JsonRpcProvider } from '@ethersproject/providers';
import './type-extensions';
import { Chain } from './from-upstream/chain';
import { FireblocksSDK } from 'fireblocks-sdk';
import { FireblocksSigner } from './fireblocks-signer';

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
      const fireblockApiClient = new FireblocksSDK(
        config.apiSecret,
        config.apiKey
      );
      const signer = new FireblocksSigner(
        fireblockApiClient,
        networkNameToChain[hre.network.name],
        new JsonRpcProvider(networkConfig.url, networkConfig.chainId),
        config.vaultId,
      );
      const address = await signer.getAddress();
      hre.log(
        `Fireblocks signer created for address: ${address} (${hre.network.name})`
      );
      return signer;
    } catch (e) {
      hre.log(e, 'ERROR: Constructing fireblocks signer');
    }
  } else {
    console.log(`ERROR: Fireblocks signer missing configuration.`);
  }
  return Promise.resolve(undefined);
};

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    const defaultConfig = { apiKey: '', apiSecret: '', vaultId: '0' };
    if (
      !userConfig.fireblocks ||
      !userConfig.fireblocks.apiKey ||
      !userConfig.fireblocks.apiSecret
    ) {
      const sampleConfig = JSON.stringify(
        { apiKey: 'YOUR_API_KEY', apiSecret: 'YOUR_API_SECRET', vaultId: '0' },
        null,
        2
      );
      console.warn(
        `Fireblocks API key and secret are not set. `,
        `Add the following to your hardhat.config.js exported configuration:\n\n${sampleConfig}\n`
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

extendEnvironment(async (hre) => {
  hre.fireblocks = lazyObject(() => {
    const signer = setupFireblocksSigner(hre);
    const getSigners = async (): Promise<FireblocksSigner[]> => {
      const s = await signer;
      return s ? [s] : [];
    };
    return {
      getSigners: getSigners,
      getSigner: async (index: number): Promise<FireblocksSigner | undefined> =>
        (await getSigners())[index],
    };
  });
});
