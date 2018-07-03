/* globals artifacts web3 */
const { deployUpgradeableContract } = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');

module.exports = deployer => {
  deployer.then(async () => {
    const namedAccounts = getNamedAccounts(web3);
    // this non upgradeable registry keeps track of all upgraded registries and their versions
    // you can use it to see the full history of registry implementation addresses,
    // but should not be used for anything else (including to get the current registry addr)
    const [, rootRegistryAtProxy] = await deployUpgradeableContract(
      artifacts,
      null,
      artifacts.require('RootRegistryV0_1_0'),
      null,
      [['address'], [namedAccounts.admin0]],
      { from: namedAccounts.admin0 }
    );

    // Deploy the registry behind a proxy
    const [, registryAtProxy, registryProxy] = await deployUpgradeableContract(
      artifacts,
      null,
      artifacts.require('ContractRegistryV0_1_0'),
      rootRegistryAtProxy,
      [['address'], [namedAccounts.admin0]],
      { from: namedAccounts.admin0 }
    );

    // Deploy nori token behind a proxy
    const [, , noriProxy] = await deployUpgradeableContract(
      artifacts,
      null,
      artifacts.require('NoriV0'),
      registryAtProxy,
      [
        ['string', 'string', 'uint', 'uint', 'address', 'address'],
        [
          'Upgradeable NORI Token',
          'NORI',
          1,
          0,
          registryAtProxy.address,
          namedAccounts.admin0,
        ],
      ],
      { from: namedAccounts.admin0 }
    );

    // Deploy upgradeable ParticipantRegistry
    const [, , participantRegistryProxy] = await deployUpgradeableContract(
      artifacts,
      null,
      artifacts.require('ParticipantRegistryV0'),
      registryAtProxy,
      [['address', 'address'], [registryAtProxy.address, namedAccounts.admin0]],
      { from: namedAccounts.admin0 }
    );

    // CRC
    const [, , crcProxy] = await deployUpgradeableContract(
      artifacts,
      null,
      artifacts.require('CRCV0'),
      registryAtProxy,
      [
        ['string', 'string', 'address', 'address', 'address'],
        [
          'Carbon Removal Certificate',
          'CRC',
          registryAtProxy.address,
          participantRegistryProxy.address,
          namedAccounts.admin0,
        ],
      ],
      { from: namedAccounts.admin0 }
    );

    // Participant type
    await deployUpgradeableContract(
      artifacts,
      null,
      artifacts.require('ParticipantV0_1_0'),
      registryAtProxy,
      [
        ['address', 'address', 'address'],
        [
          registryAtProxy.address,
          participantRegistryProxy.address,
          namedAccounts.admin0,
        ],
      ],
      { from: namedAccounts.admin0 }
    );

    // Supplier participant type
    await deployUpgradeableContract(
      artifacts,
      null,
      artifacts.require('SupplierV0_1_0'),
      registryAtProxy,
      [
        ['address', 'address', 'address'],
        [
          registryAtProxy.address,
          participantRegistryProxy.address,
          namedAccounts.admin0,
        ],
      ],
      { from: namedAccounts.admin0 }
    );

    // Verifier participant type
    await deployUpgradeableContract(
      artifacts,
      null,
      artifacts.require('VerifierV0'),
      registryAtProxy,
      [
        ['address', 'address', 'address'],
        [
          registryAtProxy.address,
          participantRegistryProxy.address,
          namedAccounts.admin0,
        ],
      ],
      { from: namedAccounts.admin0 }
    );

    // FIFO CRC market
    await deployUpgradeableContract(
      artifacts,
      null, // pass current proxy here (and null the initParams param) this if you want to upgrade without init
      artifacts.require('FifoCrcMarketV0_1_0'),
      registryAtProxy,
      [
        ['address', 'address[]', 'address'],
        [
          registryAtProxy.address,
          [crcProxy.address, noriProxy.address],
          namedAccounts.admin0,
        ],
      ],
      { from: namedAccounts.admin0 }
    );

    await deployUpgradeableContract(
      artifacts,
      null,
      artifacts.require('SelectableCrcMarketV0_1_0'),
      registryAtProxy,
      [
        ['address', 'address[]', 'address'],
        [
          registryAtProxy.address,
          [crcProxy.address, noriProxy.address],
          namedAccounts.admin0,
        ],
      ]
    );

    console.log('REGISTRY PROXY:', registryProxy.address);
  });
};
