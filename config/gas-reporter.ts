import type { HardhatUserConfig } from 'hardhat/types';

const { REPORT_GAS, COINMARKETCAP_API_KEY, REPORT_GAS_FILE } = process.env;

export const gasReporter: HardhatUserConfig['gasReporter'] = {
  enabled: REPORT_GAS,
  currency: 'USD',
  token: 'MATIC',
  gasPriceApi:
    'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice',
  ...(Boolean(COINMARKETCAP_API_KEY) && { COINMARKETCAP_API_KEY }),
  ...(Boolean(REPORT_GAS_FILE) && {
    outputFile: REPORT_GAS_FILE || 'gasReporterOutput.json',
  }),
  maxMethodDiff: 1,
};
