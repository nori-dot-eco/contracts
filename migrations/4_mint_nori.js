const Nori_V0 = artifacts.require("Nori_V0");

module.exports = async function(deployer, network, accounts) {
  if (network === 'test' || network === 'develop') {
    const noriInstance = await Nori_V0.deployed();
    await noriInstance.mint(accounts[0], '100000000000000000000');
    await noriInstance.mint(accounts[1], '100000000000000000000');
    await noriInstance.mint(accounts[2], '100000000000000000000');
  }
};