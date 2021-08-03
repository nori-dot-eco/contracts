require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');
require('hardhat-ethernal');

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});

/**
 * @type import('hardhat/config').HardhatUserConfig['networks']['hardhat']
 */
const testEnvironment = {};

/**
 * @type import('hardhat/config').HardhatUserConfig['networks']['hardhat']
 */
const devEnvironment = {
  forking: {
    // todo protect key
    url: process.env.WEB3_RPC_ENDPOINT, // todo deprecate infura?
  },
  mining: {
    auto: false,
    interval: [1000, 10000], // transactions will be mined between 1 and 10 seconds
  },
};

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.5.15',
  networks: {
    hardhat: process.env.NODE_ENV === 'test' ? testEnvironment : devEnvironment,
  },
};
