require('babel-register')({
  ignore: /node_modules\/(?!zeppelin-solidity)/,
});
require('babel-polyfill');
const HDWalletProvider = require('truffle-hdwallet-provider');
const localHost = process.env.HOST || 'localhost';

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    noritestnet: {
      host: localHost,
      port: 8545,
      gas: 4600000,
      network_id: 23061,
      from: '0x1d75abdf70d84e3bec66d3ce60145dddca3bcc06',
    },
    ganache: {
      host: '35.226.55.14',
      port: 80,
      gas: 4600000,
      network_id: '*',
    },
    testrpc: {
      host: localHost,
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01, // <-- Use this low gas price
      port: 8545,
      network_id: '*',
    },
    // To get a ropsten node running locally, try the following:
    // geth --datadir=.ropsten --testnet --syncmode=light --cache 4096 --rpc --maxpeers 76 --lightpeers 50 console attatch
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
      host: localHost,
      port: 8545,
      network_id: 3,
      gas: 6219725,
    },
    develop: {
      host: localHost,
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01, // <-- Use this low gas price
      port: 9545,
      network_id: '*',
    },
    coverage: {
      host: localHost,
      network_id: '*',
      port: 8555, // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01, // <-- Use this low gas price
    },
  },
  mocha: {
    enableTimeouts: false,
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};
