const ENS = require('ethereum-ens');
const namehash = require('eth-ens-namehash');

const getENSDetails = async (network, artifacts, web3) => {
  let ens, resolver;
  console.log(`Looking for existing registry at ENS on ${network}`);
  if (network === 'ropstenGeth' || network === 'ropsten') {
    ens = new ENS(web3.currentProvider);
    resolver = ens.resolver('nori.test').addr();
  } else {
    try {
      ens = await artifacts.require('./ENSRegistry.sol').deployed();
      resolver = ens.resolver(namehash.hash('nori.eth'));
    } catch (e) {
      console.log('make sure ENS is deployed first');
    }
  }
  return artifacts.require('./RootRegistryV0_1_0.sol').at(await resolver);
};
module.exports = {
  getENSDetails,
};
