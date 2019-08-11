const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  networks: {
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
          `https://ropsten.infura.io/${process.env.INFURA_KEY}`
        );
      },
    },
    // Use this if you want to use a ledger + geth
    ropstenGeth: {
      host: 'localhost',
      port: 8545,
      network_id: 3,
      gas: 6219725,
      // production: true    // Treats this network as if it was a public net. (default: false)
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
