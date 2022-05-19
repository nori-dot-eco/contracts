import type { BigNumberish } from 'ethers';

// curl https://gasstation-mainnet.matic.network/v2
// {"safeLow":{"maxPriorityFee":30.572092436066665,"maxFee":30.572092449066666},"standard":{"maxPriorityFee":33.539260376533335,"maxFee":33.53926038953333},"fast":{"maxPriorityFee":43.7949090368,"maxFee":43.7949090498},"estimatedBaseFee":1.3e-8,"blockTime":2,"blockNumber":26994294}%

// https://gasstation-mumbai.matic.today/v2

// curl -H "Authorization: xxxx" https://api.blocknative.com/gasprices/blockprices
// {"system":"ethereum","network":"main","unit":"gwei","maxPrice":55,"currentBlockNumber":14562255,"msSinceLastBlock":29419,"blockPrices":[{"blockNumber":14562256,"estimatedTransactionCount":431,"baseFeePerGas":31.171002417,"estimatedPrices":[{"confidence":99,"price":33,"maxPriorityFeePerGas":2,"maxFeePerGas":64.34},{"confidence":95,"price":32,"maxPriorityFeePerGas":1.62,"maxFeePerGas":63.96},{"confidence":90,"price":32,"maxPriorityFeePerGas":1.51,"maxFeePerGas":63.85},{"confidence":80,"price":32,"maxPriorityFeePerGas":1.5,"maxFeePerGas":63.84},{"confidence":70,"price":32,"maxPriorityFeePerGas":1.17,"maxFeePerGas":63.51}]}]}%

export interface GasPrice {
  maxFeePerGas: BigNumberish;
  maxPriorityFeePerGas: BigNumberish;
}

// Sensible defaults -- TODO query the gas station services above
const defaultGasPricesSettings: { [key: number]: GasPrice } = {
  137: {
    maxFeePerGas: 60,
    maxPriorityFeePerGas: 60,
  },
  80_001: {
    maxFeePerGas: 30,
    maxPriorityFeePerGas: 30,
  },
  1: {
    maxFeePerGas: 80,
    maxPriorityFeePerGas: 2,
  },
  5: {
    maxFeePerGas: 70,
    maxPriorityFeePerGas: 2,
  },
};

export function getGasPriceSettings(chainId: number): GasPrice {
  return defaultGasPricesSettings[chainId];
}
