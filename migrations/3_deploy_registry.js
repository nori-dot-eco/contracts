/* globals artifacts */
const Artifacts = require('../test/helpers/Artifacts');

const ContractRegistryV0_1_0 = artifacts.require(
  './ContractRegistryV0_1_0.sol'
);
const Contracts = require('../test/helpers/contracts');
const Accounts = require('../test/helpers/accounts');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    // this non upgradeable registry keeps track of all upgraded registries and their versions
    // you can use it to see the full history of registry implementation addresses,
    // but should not be used for anything else (including to get the current registry addr)
    const contractRegistrysRegistry = await ContractRegistryV0_1_0.deployed();

    // Deploy the registry behind a proxy
    const [
      ,
      registryAtProxy,
      registryProxy,
    ] = await Contracts.deployUpgradeableContract(
      null,
      Artifacts.ContractRegistryV0_1_0,
      contractRegistrysRegistry,
      [['address'], [Accounts.admin0]],
      { from: Accounts.admin0 }
    );

    // Deploy nori token behind a proxy
    const [, , noriProxy] = await Contracts.deployUpgradeableContract(
      null,
      Artifacts.NoriV0,
      registryAtProxy,
      [
        ['string', 'string', 'uint', 'uint', 'address', 'address'],
        [
          'Upgradeable NORI Token',
          'NORI',
          1,
          0,
          registryAtProxy.address,
          Accounts.admin0,
        ],
      ],
      { from: Accounts.admin0 }
    );

    // Deploy upgradeable ParticipantRegistry
    const [
      ,
      ,
      participantRegistryProxy,
    ] = await Contracts.deployUpgradeableContract(
      null,
      Artifacts.ParticipantRegistryV0,
      registryAtProxy,
      [['address', 'address'], [registryAtProxy.address, Accounts.admin0]],
      { from: Accounts.admin0 }
    );

    // CRC
    const [, , crcProxy] = await Contracts.deployUpgradeableContract(
      null,
      Artifacts.CRCV0,
      registryAtProxy,
      [
        ['string', 'string', 'address', 'address', 'address'],
        [
          'Carbon Removal Certificate',
          'CRC',
          registryAtProxy.address,
          participantRegistryProxy.address,
          Accounts.admin0,
        ],
      ],
      { from: Accounts.admin0 }
    );

    // Participant type
    await Contracts.deployUpgradeableContract(
      null,
      Artifacts.ParticipantV0,
      registryAtProxy,
      [
        ['address', 'address', 'address'],
        [
          registryAtProxy.address,
          participantRegistryProxy.address,
          Accounts.admin0,
        ],
      ],
      { from: Accounts.admin0 }
    );

    // Supplier participant type
    await Contracts.deployUpgradeableContract(
      null,
      Artifacts.SupplierV0,
      registryAtProxy,
      [
        ['address', 'address', 'address'],
        [
          registryAtProxy.address,
          participantRegistryProxy.address,
          Accounts.admin0,
        ],
      ],
      { from: Accounts.admin0 }
    );

    // Verifier participant type
    await Contracts.deployUpgradeableContract(
      null,
      Artifacts.VerifierV0,
      registryAtProxy,
      [
        ['address', 'address', 'address'],
        [
          registryAtProxy.address,
          participantRegistryProxy.address,
          Accounts.admin0,
        ],
      ],
      { from: Accounts.admin0 }
    );

    // FIFO CRC market
    await Contracts.deployUpgradeableContract(
      null, // pass current proxy here (and null the initParams param) this if you want to upgrade without init
      Artifacts.FifoCrcMarketV0,
      registryAtProxy,
      [
        ['address', 'address[]', 'address'],
        [
          registryAtProxy.address,
          [crcProxy.address, noriProxy.address],
          Accounts.admin0,
        ],
      ],
      { from: Accounts.admin0 }
    );

    console.log('REGISTRY PROXY:', registryProxy.address);
  });
};
