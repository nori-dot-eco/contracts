require('babel-register')({
  ignore: /node_modules\/(?!zeppelin-solidity)/,
});
require('babel-polyfill');

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    noritestnet: {
      host: 'localhost',
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
      host: 'localhost',
      gas: 4600000,
      port: 8545,
      network_id: '*',
    },
    develop: {
      host: 'localhost',
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01, // <-- Use this low gas price
      port: 9545,
      network_id: '*',
    },
    coverage: {
      host: 'localhost',
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
