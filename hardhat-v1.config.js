/* globals task */
require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-web3");

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  accounts.forEach((account) => {
    console.log(account.address);
  });
});

/**
 * @type {import('hardhat/config').HardhatUserConfig}
 */
module.exports = {
  paths:{
    sources: "./contracts/v1",
    tests: "./test/v1",
    artifacts: "./artifacts/v1",
  },
  solidity: '0.8.10',
};
