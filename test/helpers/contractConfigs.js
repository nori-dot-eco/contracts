const { getLatestVersionFromFs } = require('./contracts');

const getRootOrContractRegistry = async (root, artifacts) =>
  (await root.getLatestProxyAddr.call('ContractRegistry')) !==
  '0x0000000000000000000000000000000000000000'
    ? {
        registry: await artifacts
          .require(
            `ContractRegistryV${await getLatestVersionFromFs(
              'ContractRegistry'
            )}`
          )
          .at(await root.getLatestProxyAddr.call('ContractRegistry')),
        versionName: await getLatestVersionFromFs('RootRegistry'),
      }
    : {
        registry: root,
        versionName: await getLatestVersionFromFs('ContractRegistry'),
      };

const contractRegistryConfig = async (root, artifacts) => ({
  contractName: 'ContractRegistry',
  versionName: (await getRootOrContractRegistry(root, artifacts)).versionName,
  initParamTypes: ['address'],
  initParamVals: [await root.getLatestProxyAddr.call('MultiAdmin')],
  registry: (await getRootOrContractRegistry(root, artifacts)).registry,
});

const noriConfig = async (root, artifacts) =>
  contractRegistryConfig(root, artifacts).then(async contractRegistry => ({
    contractName: 'Nori',
    versionName: await getLatestVersionFromFs('Nori'),
    initParamTypes: ['string', 'string', 'uint', 'uint', 'address', 'address'],
    initParamVals: [
      'Upgradeable NORI Token',
      'NORI',
      1,
      0,
      contractRegistry.registry.address,
      await root.getLatestProxyAddr.call('MultiAdmin'),
    ],
    registry: contractRegistry.registry,
  }));

const participantRegistryConfig = async (root, artifacts) =>
  contractRegistryConfig(root, artifacts).then(async contractRegistry => ({
    contractName: 'ParticipantRegistry',
    versionName: await getLatestVersionFromFs('ParticipantRegistry'),
    initParamTypes: ['address', 'address'],
    initParamVals: [
      contractRegistry.registry.address,
      await root.getLatestProxyAddr.call('MultiAdmin'),
    ],
    registry: contractRegistry.registry,
  }));

const crcConfig = async (root, artifacts) =>
  contractRegistryConfig(root, artifacts).then(async contractRegistry => ({
    contractName: 'CRC',
    versionName: await getLatestVersionFromFs('CRC'),
    initParamTypes: ['string', 'string', 'address', 'address', 'address'],
    initParamVals: [
      'Carbon Removal Certificate',
      'CRC',
      contractRegistry.registry.address,
      await contractRegistry.registry.getLatestProxyAddr.call(
        'ParticipantRegistry'
      ),
      await root.getLatestProxyAddr.call('MultiAdmin'),
    ],
    registry: contractRegistry.registry,
  }));

const participantConfig = async (root, artifacts) =>
  contractRegistryConfig(root, artifacts).then(async contractRegistry => ({
    contractName: 'Participant',
    versionName: await getLatestVersionFromFs('Participant'),
    initParamTypes: ['address', 'address', 'address'],
    initParamVals: [
      contractRegistry.registry.address,
      await contractRegistry.registry.getLatestProxyAddr.call(
        'ParticipantRegistry'
      ),
      await root.getLatestProxyAddr.call('MultiAdmin'),
    ],
    registry: contractRegistry.registry,
  }));

const supplierConfig = async (root, artifacts) =>
  contractRegistryConfig(root, artifacts).then(async contractRegistry => ({
    contractName: 'Supplier',
    versionName: await getLatestVersionFromFs('Supplier'),
    initParamTypes: ['address', 'address', 'address'],
    initParamVals: [
      contractRegistry.registry.address,
      await contractRegistry.registry.getLatestProxyAddr('ParticipantRegistry'),
      await root.getLatestProxyAddr.call('MultiAdmin'),
    ],
    registry: contractRegistry.registry,
  }));

const verifierConfig = async (root, artifacts) =>
  contractRegistryConfig(root, artifacts).then(async contractRegistry => ({
    contractName: 'Verifier',
    versionName: await getLatestVersionFromFs('Verifier'),
    initParamTypes: ['address', 'address', 'address'],
    initParamVals: [
      contractRegistry.registry.address,
      await contractRegistry.registry.getLatestProxyAddr.call(
        'ParticipantRegistry'
      ),
      await root.getLatestProxyAddr.call('MultiAdmin'),
    ],
    registry: contractRegistry.registry,
  }));

const fifoCrcMarketConfig = async (root, artifacts) =>
  contractRegistryConfig(root, artifacts).then(async contractRegistry => ({
    contractName: 'FifoCrcMarket',
    versionName: await getLatestVersionFromFs('FifoCrcMarket'),
    initParamTypes: ['address', 'address[]', 'address'],
    initParamVals: [
      contractRegistry.registry.address,
      [
        await contractRegistry.registry.getLatestProxyAddr.call('CRC'),
        await contractRegistry.registry.getLatestProxyAddr.call('Nori'),
      ],
      await root.getLatestProxyAddr.call('MultiAdmin'),
    ],
    registry: contractRegistry.registry,
  }));

const unstructuredUpgradeableTokenV0Config = async (root, artifacts) =>
  contractRegistryConfig(root, artifacts).then(async contractRegistry => ({
    contractName: 'UnstructuredUpgradeableToken',
    versionName: '0_1_0',
    initParamTypes: ['string', 'string', 'uint', 'uint', 'address', 'address'],
    initParamVals: [
      'Token',
      'NORI',
      1,
      0,
      contractRegistry.registry.address,
      await root.getLatestProxyAddr.call('MultiAdmin'),
    ],
    registry: contractRegistry.registry,
  }));

const unstructuredUpgradeableTokenV1Config = async (root, artifacts) =>
  contractRegistryConfig(root, artifacts).then(async contractRegistry => ({
    contractName: 'UnstructuredUpgradeableToken',
    versionName: '0_2_0',
    initParamTypes: null,
    initParamVals: null,
    registry: contractRegistry.registry,
  }));

const unstructuredUpgradeableTokenV2Config = async (root, artifacts) =>
  contractRegistryConfig(root, artifacts).then(async contractRegistry => ({
    contractName: 'UnstructuredUpgradeableToken',
    versionName: '0_3_0',
    initParamTypes: null,
    initParamVals: null,
    registry: contractRegistry.registry,
  }));

module.exports = {
  contractRegistryConfig,
  noriConfig,
  participantRegistryConfig,
  crcConfig,
  participantConfig,
  supplierConfig,
  verifierConfig,
  fifoCrcMarketConfig,
  unstructuredUpgradeableTokenV0Config,
  unstructuredUpgradeableTokenV1Config,
  unstructuredUpgradeableTokenV2Config,
};
