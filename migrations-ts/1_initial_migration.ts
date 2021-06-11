const Migrations = artifacts.require('Migrations');

module.exports = ((deployer) => {
  deployer.deploy(Migrations);
}) as Truffle.Migration;

export {}; // because of https://stackoverflow.com/questions/40900791/cannot-redeclare-block-scoped-variable-in-unrelated-files
