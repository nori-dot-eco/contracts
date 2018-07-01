/* globals artifacts web3 */

const EIP820Registry = artifacts.require('EIP820Registry');
const MultiSigWallet = artifacts.require('MultiSigWallet');
const ContractRegistryV0_1_0 = artifacts.require('ContractRegistryV0_1_0');

module.exports = function deploy(deployer, network) {
  deployer.then(async () => {
    // yeah we won't be using this...
    if (network !== 'test') {
      return;
    }
    const contractRegistrysRegistry = await ContractRegistryV0_1_0.deployed();
    const registry = ContractRegistryV0_1_0.at(
      await contractRegistrysRegistry.getLatestProxyAddr.call(
        'ContractRegistry'
      )
    );
    await deployer.deploy(EIP820Registry);

    // todo only deploy this  to main net with nori mainnet addresses as owners
    await deployer.deploy(
      MultiSigWallet,
      [0x1d75abdf70d84e3bec66d3ce60145dddca3bcc06],
      web3.toBigNumber(1),
      registry.address
    );
  });
};
