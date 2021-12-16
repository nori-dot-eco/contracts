const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const { singletons } = require('@openzeppelin/test-helpers');

const NORI = artifacts.require('NORI');
const Removal = artifacts.require('Removal');
const Certificate = artifacts.require('Certificate');
const FIFOMarket = artifacts.require('FIFOMarket');

module.exports = async (deployer, network, accounts) => {
  if (['develop', 'test'].includes(network)) {
    const registry = await singletons.ERC1820Registry(accounts[0]); // In a test environment an ERC777 token requires deploying an ERC1820 registry
    console.log('DEPLOYED REGISTRY', registry.address);
  }
  const noriInstance = await deployProxy(NORI, [], { deployer });
  const removalInstance = await deployProxy(Removal, [], { deployer });
  const certificateInstance = await deployProxy(Certificate, [], { deployer });
  const fifoMarketInstance = await deployProxy(
    FIFOMarket,
    [
      removalInstance.address,
      noriInstance.address,
      certificateInstance.address,
      accounts[9],
      this.web3.utils.toWei('0.15'),
    ],
    { deployer }
  );
  console.log('Deployed NORI', noriInstance.address);
  console.log('Deployed Removal', removalInstance.address);
  console.log('Deployed Certificate', certificateInstance.address);
  console.log('Deployed FIFOMarket', fifoMarketInstance.address);
};
