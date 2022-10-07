import { JsonRpcBatchProvider } from '@ethersproject/providers';
import type { FeeData } from '@ethersproject/abstract-provider';

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

// Sensible defaults -- all in gwei
const defaultGasFeeSettings: {
  [key: number]: { maxFeePerGas: string; maxPriorityFeePerGas: string };
} = {
  137: {
    maxFeePerGas: '120',
    maxPriorityFeePerGas: '60',
  },
  80_001: {
    maxFeePerGas: '30',
    maxPriorityFeePerGas: '30',
  },
  1: {
    maxFeePerGas: '80',
    maxPriorityFeePerGas: '2',
  },
  5: {
    maxFeePerGas: '70',
    maxPriorityFeePerGas: '2',
  },
};

type GasSpeed = 'safeLow' | 'standard' | 'fast';

interface GasStationResponse {
  safeLow: { maxFee: number; maxPriorityFee: number };
  standard: { maxFee: number; maxPriorityFee: number };
  fast: { maxFee: number; maxPriorityFee: number };
  blockTime: number;
  blockNumber: number;
}

const POLYGON_MAINNET_URL = 'https://gasstation-mainnet.matic.network/v2';
const POLYGON_MUMBAI_URL = 'https://gasstation-mumbai.matic.today/v2';
const ETHEREUM_MAINNET_URL = `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`;

const polygonGasStation = async (
  level: GasSpeed,
  url: string
): Promise<FeeData> => {
  const response = await fetch(url);
  // Gas station data is in gwei
  const fees: GasStationResponse = await response.json();
  const feeData = fees[level];
  return {
    maxFeePerGas: ethers.utils.parseUnits(feeData.maxFee.toFixed(3), 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits(
      feeData.maxPriorityFee.toFixed(3),
      'gwei'
    ),
    gasPrice: ethers.utils.parseUnits(feeData.maxFee.toFixed(3), 'gwei'),
  };
};

/**
 * {"status":"1","message":"OK","result":{"LastBlock":"15691953","SafeGasPrice":"8","ProposeGasPrice":"9","FastGasPrice":"9","suggestBaseFee":"7.376342631","gasUsedRatio":"0.9845104,0,0.978863833333333,0.2985338,0.4101417"}}
 */

interface EtherscanGasStationResponse {
  SafeGasPrice: string;
  ProposeGasPrice: string;
  FastGasPrice: string;
  suggestBaseFee: string;
  gasUsedRatio: string;
  LastBlock: number;
}

interface EthereumGasCache {
  result: EtherscanGasStationResponse | undefined;
  lastUpdated: number;
}

let ethereumGasCache: EthereumGasCache = {
  result: undefined,
  lastUpdated: 0,
};

const ethereumGasStation = async (
  level: GasSpeed,
  url: string
): Promise<FeeData> => {
  // Free tier of etherscan gas api has a 1req/5sec rate limit.
  if (
    ethereumGasCache.lastUpdated === undefined ||
    ethereumGasCache.lastUpdated < Date.now() - 6000
  ) {
    const response = await fetch(url);
    const { result } = await response.json();
    ethereumGasCache = {
      result,
      lastUpdated: Date.now(),
    };
  }

  const fees = ethereumGasCache.result;
  if (fees === undefined) {
    throw new Error(`Failed to load gas api data.`);
  }
  let feeForLevel: string;
  switch (level) {
    case 'safeLow': {
      feeForLevel = fees.SafeGasPrice;
      break;
    }
    case 'fast': {
      feeForLevel = fees.FastGasPrice;
      break;
    }
    default: {
      feeForLevel = fees.ProposeGasPrice;
      break;
    }
  }
  return {
    maxFeePerGas: ethers.utils.parseUnits(feeForLevel, 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits(
      (
        Number.parseFloat(feeForLevel) - Number.parseFloat(fees.suggestBaseFee)
      ).toFixed(3),
      'gwei'
    ),
    gasPrice: ethers.utils.parseUnits(feeForLevel, 'gwei'),
  };
};

async function getFeeDataForChain(
  chainId: number,
  level: GasSpeed = 'fast'
): Promise<FeeData> {
  if (chainId === 1) {
    return ethereumGasStation(level, ETHEREUM_MAINNET_URL);
  }
  if (chainId === 137) {
    return polygonGasStation(level, POLYGON_MAINNET_URL);
  }
  if (chainId === 80_001) {
    return polygonGasStation(level, POLYGON_MUMBAI_URL);
  }
  return Promise.resolve({
    maxFeePerGas: ethers.utils.parseUnits(
      defaultGasFeeSettings[chainId].maxFeePerGas,
      'gwei'
    ),
    maxPriorityFeePerGas: ethers.utils.parseUnits(
      defaultGasFeeSettings[chainId].maxPriorityFeePerGas,
      'gwei'
    ),
    gasPrice: ethers.utils.parseUnits(
      defaultGasFeeSettings[chainId].maxFeePerGas,
      'gwei'
    ),
  });
}

export class JsonRpcBatchProviderWithGasFees extends JsonRpcBatchProvider {
  async getFeeData(): Promise<FeeData> {
    return getFeeDataForChain(this.network.chainId);
  }
}
