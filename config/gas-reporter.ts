import type { HardhatUserConfig } from 'hardhat/types';

export const getGasReporterConfig = (
  environment = process.env
): HardhatUserConfig['gasReporter'] => {
  const { REPORT_GAS, COINMARKETCAP_API_KEY, REPORT_GAS_FILE } = environment;
  const gasReporterConfig: HardhatUserConfig['gasReporter'] = {
    enabled: REPORT_GAS,
    currency: 'USD',
    token: 'MATIC',
    gasPriceApi:
      'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice',
    ...(Boolean(COINMARKETCAP_API_KEY) && {
      coinmarketcap: COINMARKETCAP_API_KEY,
    }),
    ...(Boolean(REPORT_GAS_FILE) && {
      outputFile: REPORT_GAS_FILE ?? 'gasReporterOutput.json',
    }),
    maxMethodDiff: 1,
  };
  return gasReporterConfig;
};

export const gasReporter: HardhatUserConfig['gasReporter'] =
  getGasReporterConfig();
