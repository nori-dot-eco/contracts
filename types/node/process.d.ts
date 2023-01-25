/* eslint-disable @typescript-eslint/naming-convention -- this file overwrites many predefined types */
declare namespace NodeJS {
  // eslint-disable-next-line unicorn/prevent-abbreviations -- this is a type augmentation
  interface ProcessEnv {
    MNEMONIC?: string;
    INFURA_STAGING_KEY?: string;
    ETHERNAL_EMAIL?: string;
    ETHERNAL_PASSWORD?: string;
    ETHERNAL: boolean;
    ETHERSCAN_API_KEY?: string;
    POLYGONSCAN_API_KEY?: string;
    DEFENDER_API_KEY?: string;
    DEFENDER_API_SECRET?: string;
    REPORT_GAS: boolean;
    COINMARKETCAP_API_KEY?: string;
    GITHUB_PERSONAL_ACCESS_TOKEN?: string;
    TRACE: boolean;
    FORCE_PROXY_DEPLOYMENT: boolean;
    LOG_HARDHAT_NETWORK: boolean;
    REPORT_GAS_FILE?: string;
    FAIL: boolean;
    VIA_IR: boolean;
    OPTIMIZER_RUNS: number;
    OPTIMIZER: boolean;
    CI: boolean;
    SOLC_PROFILE: 'default' | 'production' | 'test';
  }
}
