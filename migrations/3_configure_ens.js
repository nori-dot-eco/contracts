/* eslint-disable no-unused-expressions */
const namehash = require('eth-ens-namehash');
const ENS = require('ethereum-ens');
const { getLatestVersionFromFs } = require('../test/helpers/contracts');

const ENSRegistry = artifacts.require('./ENSRegistry.sol');
const FIFSRegistrar = artifacts.require('./FIFSRegistrar.sol');

/**
 * Calculate root node hashes given the top level domain(tld)
 */
function getRootNodeFromTLD(tld) {
  return {
    namehash: namehash.hash(tld),
    sha3: web3.sha3(tld),
  };
}

/**
 * Deploy the ENS and FIFSRegistrar
 */
const deployFIFSRegistrar = async (deployer, tld) => {
  const rootNode = getRootNodeFromTLD(tld);
  await deployer.deploy(ENSRegistry);
  await deployer.deploy(FIFSRegistrar, ENSRegistry.address, rootNode.namehash);
  await ENSRegistry.at(ENSRegistry.address).setSubnodeOwner(
    '0x0',
    rootNode.sha3,
    FIFSRegistrar.address
  );

  return [ENS.address, FIFSRegistrar.address];
};

const setupDomain = async () => {
  const ens = await ENSRegistry.deployed();
  const rootRegistry = await artifacts
    .require(`./RootRegistryV${await getLatestVersionFromFs('RootRegistry')}`)
    .deployed();
  const registrar = await FIFSRegistrar.deployed();
  // todo do this from multiadmin:
  await registrar.register(web3.sha3('nori'), web3.eth.accounts[0]);
  await ens.setResolver(namehash.hash('nori.eth'), rootRegistry.address);
};

module.exports = function deploy(deployer, network) {
  deployer.then(async () => {
    if (network === 'develop' || network === 'test' || network === 'testrpc') {
      try {
        const ens = await ENSRegistry.deployed();
        const resolver = await ens.resolver(namehash.hash('nori.eth'));
        process.env.MIGRATION &&
          console.log(
            `Looks like ENS is configured and resolving to ${resolver}`
          );
      } catch (e) {
        process.env.MIGRATION && console.log('Beginning new ENS configuration');
        const tld = 'eth';
        await deployFIFSRegistrar(deployer, tld);
        await setupDomain();
      }
    } else if (network === 'ropsten' || network === 'ropstenGeth') {
      const ens = new ENS(web3.currentProvider);
      const resolver = await ens.resolver('nori.test').addr();
      process.env.MIGRATION &&
        console.log(
          `Looks like ENS is configured and resolving to ${resolver}`
        );
    } else {
      process.env.MIGRATION &&
        console.log(
          `No ENS configuration steps defined for network: ${network}. Migrations will continue to look for a live deployment`
        );
    }
  });
};
