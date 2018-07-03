/* globals artifacts web3 */

const EIP820Registry = artifacts.require('EIP820Registry');
const MultiSigWallet = artifacts.require('MultiSigWallet');
const ContractRegistryV0_1_0 = artifacts.require('ContractRegistryV0_1_0');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');
const SelectableCrcMarketV0 = artifacts.require('SelectableCrcMarketV0');

module.exports = function deploy(deployer, network, accounts) {
  deployer.then(async () => {
    // yeah we won't be using this...
    if (network !== 'test') {
      return;
    }
    const rootRegistry = await RootRegistryV0_1_0.deployed();
    const registry = ContractRegistryV0_1_0.at(
      await rootRegistry.getLatestProxyAddr.call('ContractRegistry')
    );
    await deployer.deploy(EIP820Registry);

    const crcMarket = await deployer.deploy(SelectableCrcMarketV0);
    await crcMarket.initialize(
      registry.address,
      [
        await registry.getLatestProxyAddr.call('CRC'),
        await registry.getLatestProxyAddr.call('Nori'),
      ],
      accounts[0]
    );

    // todo only deploy this  to main net with nori mainnet addresses as owners
    await deployer.deploy(
      MultiSigWallet,
      [0x1d75abdf70d84e3bec66d3ce60145dddca3bcc06],
      web3.toBigNumber(1),
      registry.address
    );
  });
};
