const Nori_V0 = artifacts.require("Nori_V0");
const TEST_ADDRESS_CUSTOM_BRIDGE = '0x68D25464371F3a97691c52e40d4C1306aF0B7629';
const TEST_ADDRESS_OTHER = '0xf31c29B01EF18a3D9726b99Ad0E9692E498cf5f8';


module.exports = async function(deployer, network) {
  if (network === 'test' || network === 'develop') {
    const noriInstance = await Nori_V0.deployed();
    await noriInstance.mint('0x649d32C654a2c6cEE307dE897945791FA2778863', '9000000000000000000');
    await noriInstance.mint(TEST_ADDRESS_CUSTOM_BRIDGE, '80000000000000000000');
    await noriInstance.mint(TEST_ADDRESS_OTHER, '70000000000000000000');
  }
};