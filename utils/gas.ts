/**
 * This module packages up gas fee estimation logic.
 *
 * It currently only has live estimators for polygon and mumbai.  We need to add
 * support for mainnet and goerli at a minimum.
 *
 * I'd like to packge this up into a gas feee estimation provider abstraction
 * and have the fireblocks signer take it as a constructor argument
 */

// curl -H "Authorization: xxxx" https://api.blocknative.com/gasprices/blockprices
// {"system":"ethereum","network":"main","unit":"gwei","maxPrice":55,"currentBlockNumber":14562255,"msSinceLastBlock":29419,"blockPrices":[{"blockNumber":14562256,"estimatedTransactionCount":431,"baseFee":31.171002417,"estimatedPrices":[{"confidence":99,"price":33,"maxPriorityFee":2,"maxFee":64.34},{"confidence":95,"price":32,"maxPriorityFee":1.62,"maxFee":63.96},{"confidence":90,"price":32,"maxPriorityFee":1.51,"maxFee":63.85},{"confidence":80,"price":32,"maxPriorityFee":1.5,"maxFee":63.84},{"confidence":70,"price":32,"maxPriorityFee":1.17,"maxFee":63.51}]}]}%

export interface GasPrice {
  maxFee: number;
  maxPriorityFee: number;
}

// Sensible defaults -- TODO query the gas station services above
const defaultGasFeeSettings: { [key: number]: GasPrice } = {
  137: {
    maxFee: 120,
    maxPriorityFee: 60,
  },
  80_001: {
    maxFee: 30,
    maxPriorityFee: 30,
  },
  1: {
    maxFee: 80,
    maxPriorityFee: 2,
  },
  5: {
    maxFee: 70,
    maxPriorityFee: 2,
  },
};

type GAS_SPEED = 'safeLow' | 'standard' | 'fast';

interface GasStationResponse {
  safeLow: GasPrice;
  standard: GasPrice;
  fast: GasPrice;
  blockTime: number;
  blockNumber: number;
}

const POLYGON_MAINNET_URL = 'https://gasstation-mainnet.matic.network/v2';
const POLYGON_MUMBAI_URL = 'https://gasstation-mumbai.matic.today/v2';

const polygonGasStation = async (
  level: GAS_SPEED,
  url: string
): Promise<GasPrice> => {
  const response = await fetch(url);
  const fees: GasStationResponse = await response.json();
  const feeLevel: GasPrice = fees[level];
  return {
    maxFee: Math.round(feeLevel.maxFee),
    maxPriorityFee: Math.round(feeLevel.maxPriorityFee),
  };
};

export async function getGasFeeSettings(
  chainId: number,
  level: GAS_SPEED = 'standard'
): Promise<GasPrice> {
  if (chainId === 137) {
    return await polygonGasStation(level, POLYGON_MAINNET_URL);
  } else if (chainId === 80001) {
    return await polygonGasStation(level, POLYGON_MUMBAI_URL);
  }
  return Promise.resolve(defaultGasFeeSettings[chainId]);
}
