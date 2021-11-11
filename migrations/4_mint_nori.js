const { parseUnits } = require('@ethersproject/units');

const Nori_V0 = artifacts.require('Nori_V0');

module.exports = async function (deployer, network, accounts) {
  if (network === 'test' || network === 'develop') {
    const noriInstance = await Nori_V0.deployed();
    const tokensToMint = parseUnits('100');

    await noriInstance.mint(accounts[0], tokensToMint);
    await noriInstance.mint(accounts[1], tokensToMint);
    await noriInstance.mint(accounts[2], tokensToMint);
    await noriInstance.mint(accounts[3], tokensToMint);
    await noriInstance.mint(accounts[4], tokensToMint);
    await noriInstance.mint(accounts[5], tokensToMint);
    await noriInstance.mint(accounts[6], tokensToMint);
    await noriInstance.mint(accounts[7], tokensToMint);
  }
};
