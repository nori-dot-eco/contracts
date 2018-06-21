/* globals artifacts web3 */

const Migrations = artifacts.require('./Migrations.sol');

module.exports = function deploy(deployer) {
  global.artifacts = artifacts;
  global.web3 = web3;
  deployer.deploy(Migrations);
};
