const namehash = require('eth-ens-namehash');

const ENS = artifacts.require('./ENSRegistry.sol');
const FIFSRegistrar = artifacts.require('./FIFSRegistrar.sol');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');

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
  await deployer.deploy(ENS);
  await deployer.deploy(FIFSRegistrar, ENS.address, rootNode.namehash);
  await ENS.at(ENS.address).setSubnodeOwner(
    '0x0',
    rootNode.sha3,
    FIFSRegistrar.address
  );

  return [ENS.address, FIFSRegistrar.address];
};

const setupDomain = async () => {
  const ens = await ENS.deployed();
  const rootRegistry = await RootRegistryV0_1_0.deployed();
  const registrar = await FIFSRegistrar.deployed();
  // todo do this from multiadmin:
  await registrar.register(web3.sha3('nori'), web3.eth.accounts[0]);
  await ens.setResolver(namehash.hash('nori.eth'), rootRegistry.address);
};

module.exports = function deploy(deployer, network) {
  if (network === 'develop' || network === 'test') {
    deployer.then(async () => {
      const tld = 'eth';
      await deployFIFSRegistrar(deployer, tld);
      await setupDomain();
    });
  } else {
    console.log(`No ENS configuration steps defined for ${network}`);
  }
};
