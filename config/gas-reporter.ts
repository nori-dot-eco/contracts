import type { HardhatUserConfig } from 'hardhat/types';

const REPORT_GAS =
  Boolean(process.env.REPORT_GAS) && process.env.REPORT_GAS !== 'false';
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
const REPORT_GAS_FILE = process.env.REPORT_GAS
  ? process.env.REPORT_GAS_FILE || 'gasReporterOutput.json'
  : undefined;

export const gasReporter: HardhatUserConfig['gasReporter'] = {
  enabled: REPORT_GAS,
  currency: 'USD',
  token: 'MATIC',
  gasPriceApi:
    'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice',
  coinmarketcap: COINMARKETCAP_API_KEY,
  ...(REPORT_GAS_FILE && { outputFile: REPORT_GAS_FILE }),
};
