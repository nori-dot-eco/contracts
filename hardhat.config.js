/* globals task */
require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');

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
  solidity: '0.5.15',
};
