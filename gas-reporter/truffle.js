require('babel-register')({
  ignore: /node_modules\/(?!zeppelin-solidity)/,
});
require('babel-polyfill');

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  truffle_directory: '../node_modules/.bin/truffle',
  working_directory: '../',
  build_directory: 'build/',
  contracts_directory: '../contracts/',
  contracts_build_directory: 'build/',
  test_directory: '../test',
  networks: {
    testrpc: {
      host: 'localhost',
      gas: 4600000,
      port: 8545,
      network_id: '*',
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  mocha: {
    reporter: '@jaycenhorton/eth-gas-reporter',
    reporterOptions: {
      currency: 'USD',
      gasPrice: 10,
      outputFile: 'gasreport',
      noColors: true,
      contractsDir: '../contracts/',
    },
  },
};
