const { getLatestVersionFromFs } = require('./contracts');

const getRootOrContractRegistry = async (root, artifacts) =>
  (await root.getLatestProxyAddr.call('ContractRegistry')) !==
  '0x0000000000000000000000000000000000000000'
    ? artifacts
        .require(
          `ContractRegistryV${await getLatestVersionFromFs('ContractRegistry')}`
        )
        .at(await root.getLatestProxyAddr.call('ContractRegistry'))
    : root;

const contractRegistryConfig = async (root, artifacts) => ({
  contractName: 'ContractRegistry',
  initParamTypes: ['address'],
  initParamVals: [await root.getLatestProxyAddr.call('MultiAdmin')],
  registry: await getRootOrContractRegistry(root, artifacts),
});

const noriConfig = async (root, artifacts) =>
  contractRegistryConfig(root, artifacts).then(async contractRegistry => ({
    contractName: 'Nori',
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

module.exports = {
  contractRegistryConfig,
  noriConfig,
  participantRegistryConfig,
  crcConfig,
  participantConfig,
  supplierConfig,
  verifierConfig,
  fifoCrcMarketConfig,
};
