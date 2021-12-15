const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  contracts_directory: './contracts/v1',
  migrations_directory: './migrations/v1',
  contracts_build_directory: './build/v1',
  networks: {
    test: {
      host: 'localhost', // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: '*', // Any network (default: none)
    },
    develop: {
      host: 'localhost', // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: '9001', // Any network (default: none)
    },
    ropsten: {
      network_id: 3,
      gas: 4000000,
      provider: () => {
        if (!process.env.STAGING_MNEMONIC || !process.env.INFURA_STAGING_KEY) {
          throw new Error(
            'You must set both the STAGING_MNEMONIC and INFURA_STAGING_KEY environment variables to use the ropsten network'
          );
        }
        return new HDWalletProvider(
          process.env.STAGING_MNEMONIC,
          `https://ropsten.infura.io/v3/${process.env.INFURA_STAGING_KEY}`
        );
      },
    },
    kovan: {
      network_id: 42,
      gasPrice: 1000000000, // 1 gwei
      skipDryRun: true,
      provider: () => {
        if (!process.env.TEST_MNEMONIC || !process.env.INFURA_TEST_KEY) {
          throw new Error(
            'You must set both the TEST_MNEMONIC and INFURA_TEST_KEY environment variables to use the kovan network'
          );
        }
        return new HDWalletProvider(
          process.env.TEST_MNEMONIC,
          `https://kovan.infura.io/v3/${process.env.INFURA_TEST_KEY}`
        );
      },
    },
    goerli: {
      network_id: 5,
      skipDryRun: true,
      provider: () => {
        if (!process.env.TEST_MNEMONIC || !process.env.INFURA_TEST_KEY) {
          throw new Error(
            'You must set both the TEST_MNEMONIC and INFURA_TEST_KEY environment variables to use the kovan network'
          );
        }
        return new HDWalletProvider(
          process.env.TEST_MNEMONIC,
          `https://goerli.infura.io/v3/${process.env.INFURA_TEST_KEY}`
        );
      },
    },
    mumbai: {
      provider: () => {
        if (!process.env.TEST_MNEMONIC || !process.env.INFURA_TEST_KEY) {
          throw new Error(
            'You must set both the TEST_MNEMONIC and INFURA_TEST_KEY environment variables to use the kovan network'
          );
        }
        return new HDWalletProvider(
          process.env.TEST_MNEMONIC,
          `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_TEST_KEY}`
        );
      },
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    mainnet: {
      network_id: 1,
      gasPrice: 10000000000, // 10 gwei
      provider: () => {
        if (!process.env.MNEMONIC || !process.env.INFURA_PROD_KEY) {
          throw new Error(
            'You must set both the MNEMONIC and INFURA_PROD_KEY environment variables to use mainnet'
          );
        }
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://mainnet.infura.io/v3/${process.env.INFURA_PROD_KEY}`
        );
      },
    },
  },
  // Set default mocha options here, use special reporters etc.
  mocha: {
    enableTimeouts: false,
  },
  compilers: {
    solc: {
      version: "^0.8",
      settings: {
        optimizer: {
          enabled: false,
          runs: 200,
        },
      },
    },
  },
};
