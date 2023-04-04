/* eslint-disable @typescript-eslint/naming-convention -- this file overwrites many predefined types */
declare namespace NodeJS {
  interface ProcessEnv {
    MNEMONIC?: string;
    ETHERNAL_EMAIL?: string;
    ETHERNAL_PASSWORD?: string;
    ETHERNAL: boolean;
    ETHERSCAN_API_KEY?: string;
    POLYGONSCAN_API_KEY?: string;
    DEFENDER_API_KEY?: string;
    DEFENDER_API_SECRET?: string;
    GITHUB_PERSONAL_ACCESS_TOKEN?: string;
    TRACE: boolean;
    FORCE_PROXY_DEPLOYMENT: boolean;
    LOG_HARDHAT_NETWORK: boolean;
    VIA_IR: boolean;
    OPTIMIZER_RUNS: number;
    OPTIMIZER: boolean;
    CI: boolean;
    SOLC_PROFILE: 'default' | 'production' | 'test';
  }
}
