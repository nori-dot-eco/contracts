import type { SupportedNetworks } from '@/config/networks';
import { networks } from '@/config/networks';

export const isSupportedNetwork = (
  name: SupportedNetworks
): name is SupportedNetworks => {
  return Object.keys(networks).includes(name);
};
