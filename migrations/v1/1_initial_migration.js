const Migrations = artifacts.require('Migrations');

module.exports = (deployer, network) => {
  if (!['mumbai', 'polygon'].includes(network)) {
    deployer.deploy(Migrations);
  }
};
