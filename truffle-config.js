const HDWalletProvider = require('truffle-hdwallet-provider');

const rpcUrl = `https://ropsten.infura.io/v3`;

module.exports = {
  networks: {
    test: {
      host: 'localhost', // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: '*', // Any network (default: none)
    },
    development: {
      host: 'localhost', // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: '*', // Any network (default: none)
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
          `${rpcUrl}/${process.env.INFURA_KEY}`
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
