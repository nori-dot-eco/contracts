const { getLatestVersionFromFs } = require('./contracts');

const isRegistryOrRoot = async (registry, artifacts) =>
  (await registry.getLatestProxyAddr.call('ContractRegistry')) !==
  '0x0000000000000000000000000000000000000000'
    ? artifacts
        .require(
          `ContractRegistryV${await getLatestVersionFromFs('ContractRegistry')}`
        )
        .at(await registry.getLatestProxyAddr.call('ContractRegistry'))
    : registry;

const contractRegistry = async (
  multiAdmin = null,
  registry = null,
  artifacts
) => ({
  contractName: 'ContractRegistry',
  initParamTypes: ['address'],
  initParamVals: [
    multiAdmin.address ||
      (await registry.getLatestProxyAddr.call('MultiAdmin')),
  ],
  proxy: await isRegistryOrRoot(registry, artifacts),
});

const nori = async (multiAdmin, registry, artifacts) =>
  contractRegistry(multiAdmin, registry, artifacts).then(async contractReg => ({
    contractName: 'Nori',
    initParamTypes: ['string', 'string', 'uint', 'uint', 'address', 'address'],
    initParamVals: [
      'Upgradeable NORI Token',
      'NORI',
      1,
      0,
      contractReg.proxy.address,
      multiAdmin.address,
    ],
    proxy: await contractReg.proxy,
  }));
// todo async?
const participantRegistry = async (multiAdmin, registry, artifacts) =>
  contractRegistry(multiAdmin, registry, artifacts).then(async contractReg => ({
    contractName: 'ParticipantRegistry',
    initParamTypes: ['address', 'address'],
    initParamVals: [await contractReg.proxy.address, multiAdmin.address],
    proxy: await contractReg.proxy,
  }));

const crc = async (multiAdmin, registry, artifacts) =>
  contractRegistry(multiAdmin, registry, artifacts).then(async contractReg => ({
    contractName: 'CRC',
    initParamTypes: ['string', 'string', 'address', 'address', 'address'],
    initParamVals: [
      'Carbon Removal Certificate',
      'CRC',
      await contractReg.proxy.address,
      await contractReg.proxy.getLatestProxyAddr.call('ParticipantRegistry'),
      multiAdmin.address,
    ],
    proxy: await contractReg.proxy,
  }));

const participant = async (multiAdmin, registry, artifacts) =>
  contractRegistry(multiAdmin, registry, artifacts).then(async contractReg => ({
    contractName: 'Participant',
    initParamTypes: ['address', 'address', 'address'],
    initParamVals: [
      contractReg.proxy.address,
      await contractReg.proxy.getLatestProxyAddr.call('ParticipantRegistry'),
      multiAdmin.address,
    ],
    proxy: await contractReg.proxy,
  }));

const supplier = async (multiAdmin, registry, artifacts) =>
  contractRegistry(multiAdmin, registry, artifacts).then(async contractReg => ({
    contractName: 'Supplier',
    initParamTypes: ['address', 'address', 'address'],
    initParamVals: [
      contractReg.proxy.address,
      await registry.getLatestProxyAddr('ParticipantRegistry'),
      multiAdmin.address,
    ],
    proxy: await contractReg.proxy,
  }));

const verifier = async (multiAdmin, registry, artifacts) =>
  contractRegistry(multiAdmin, registry, artifacts).then(async contractReg => ({
    contractName: 'Verifier',
    initParamTypes: ['address', 'address', 'address'],
    initParamVals: [
      contractReg.proxy.address,
      await registry.getLatestProxyAddr.call('ParticipantRegistry'),
      multiAdmin.address,
    ],
    proxy: await contractReg.proxy,
  }));

const fifoCrcMarket = async (multiAdmin, registry, artifacts) =>
  contractRegistry(multiAdmin, registry, artifacts).then(async contractReg => ({
    contractName: 'FifoCrcMarket',
    initParamTypes: ['address', 'address[]', 'address'],
    initParamVals: [
      contractReg.proxy.address,
      [
        await registry.getLatestProxyAddr.call('CRC'),
        await registry.getLatestProxyAddr.call('Nori'),
      ],
      multiAdmin.address,
    ],
    proxy: await contractReg.proxy,
  }));

module.exports = {
  contractRegistry,
  nori,
  participantRegistry,
  crc,
  participant,
  supplier,
  verifier,
  fifoCrcMarket,
};
