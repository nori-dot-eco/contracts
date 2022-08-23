import type { Network } from 'defender-base-client/lib/utils/network';

export const isDefenderNetwork = (network: string): network is Network => {
  return [
    'mainnet',
    'ropsten',
    'rinkeby',
    'kovan',
    'goerli',
    'xdai',
    'sokol',
    'fuse',
    'bsc',
    'bsctest',
    'fantom',
    'fantomtest',
    'moonbase',
    'matic',
    'mumbai',
  ].includes(network);
};
