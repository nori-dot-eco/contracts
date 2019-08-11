const Migrations = artifacts.require('Migrations');

module.exports = deployer => {
  // todo transfer ownership of ProxyAdmin to a multisig contract
  // todo allow whitelisting of verifier,supplier from an address on the server OR the multiadmin
  // todo break-glass function to freeze all contracts
  // todo solidity prettier
  // todo set contract ENS subdomains
  deployer.deploy(Migrations);
};
