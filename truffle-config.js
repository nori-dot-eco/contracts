const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
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
        if (!process.env.MNEMONIC || !process.env.INFURA_KEY) {
          throw new Error(
            'You must set both the MNEMONIC and INFURA_KEY environment variables to use the ropsten network'
          );
        }
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://ropsten.infura.io/v3/${process.env.INFURA_KEY}`
        );
      },
    },
    mainnet: {
      network_id: 1,
      gasPrice: 10000000000, // 10 gwei
      provider: () => {
        if (!process.env.MNEMONIC || !process.env.INFURA_PROD_KEY) {
          throw new Error(
            'You must set both the MNEMONIC and INFURA_PROD_KEY environment variables to use the ropsten network'
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
      settings: {
        optimizer: {
          enabled: false,
          runs: 200,
        },
      },
    },
  },
};
