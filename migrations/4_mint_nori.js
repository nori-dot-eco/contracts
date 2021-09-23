import { formatUnits } from "@ethersproject/units";
const Nori_V0 = artifacts.require("Nori_V0");

module.exports = async function (deployer, network, accounts) {
  if (network === "test" || network === "develop") {
    const noriInstance = await Nori_V0.deployed();
    await noriInstance.mint(accounts[0], formatUnits(100));
    await noriInstance.mint(accounts[1], formatUnits(100));
    await noriInstance.mint(accounts[2], formatUnits(100));
  }
};
