/* globals artifacts web3 */
const { getLatestVersionFromFs } = require('../test/helpers/contracts');

const EIP820Registry = artifacts.require('EIP820Registry');
const MultiSigWallet = artifacts.require('MultiSigWallet');

module.exports = function deploy(deployer, network, accounts) {
  deployer.then(async () => {
    // yeah we won't be using this...
    // What exactly is this being used for?
    if (network !== 'test') {
      return;
    }
    const rootRegistry = await artifacts
      .require(`./RootRegistryV${await getLatestVersionFromFs('RootRegistry')}`)
      .deployed();
    const registry = await artifacts
      .require(
        `./ContractRegistryV${await getLatestVersionFromFs('ContractRegistry')}`
      )
      .at(await rootRegistry.getLatestProxyAddr.call('ContractRegistry'));
    await deployer.deploy(EIP820Registry);

    const crcMarket = await deployer.deploy(
      await artifacts.require(
        `./SelectableCrcMarketV${await getLatestVersionFromFs(
          'SelectableCrcMarket'
        )}`
      )
    );
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
