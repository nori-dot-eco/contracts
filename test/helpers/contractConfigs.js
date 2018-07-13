const nori = async (multiAdmin, registry) => ({
  contractName: 'Nori',
  initParamTypes: ['string', 'string', 'uint', 'uint', 'address', 'address'],
  initParamVals: [
    'Upgradeable NORI Token',
    'NORI',
    1,
    0,
    registry.address,
    multiAdmin.address,
  ],
});

const participantRegistry = async (multiAdmin, registry) => ({
  contractName: 'ParticipantRegistry',
  initParamTypes: ['address', 'address'],
  initParamVals: [registry.address, multiAdmin.address],
});

const crc = async (multiAdmin, registry) => ({
  contractName: 'CRC',
  initParamTypes: ['string', 'string', 'address', 'address', 'address'],
  initParamVals: [
    'Carbon Removal Certificate',
    'CRC',
    registry.address,
    await registry.getLatestProxyAddr.call('ParticipantRegistry'),
    multiAdmin.address,
  ],
});

const participant = async (multiAdmin, registry) => ({
  contractName: 'Participant',
  initParamTypes: ['address', 'address', 'address'],
  initParamVals: [
    registry.address,
    await registry.getLatestProxyAddr.call('ParticipantRegistry'),
    multiAdmin.address,
  ],
});

const supplier = async (multiAdmin, registry) => ({
  contractName: 'Supplier',
  initParamTypes: ['address', 'address', 'address'],
  initParamVals: [
    registry.address,
    await registry.getLatestProxyAddr('ParticipantRegistry'),
    multiAdmin.address,
  ],
});

const verifier = async (multiAdmin, registry) => ({
  contractName: 'Verifier',
  initParamTypes: ['address', 'address', 'address'],
  initParamVals: [
    registry.address,
    await registry.getLatestProxyAddr.call('ParticipantRegistry'),
    multiAdmin.address,
  ],
});

const fifoCrcMarket = async (multiAdmin, registry) => ({
  contractName: 'FifoCrcMarket',
  initParamTypes: ['address', 'address[]', 'address'],
  initParamVals: [
    registry.address,
    [
      await registry.getLatestProxyAddr.call('CRC'),
      await registry.getLatestProxyAddr.call('Nori'),
    ],
    multiAdmin.address,
  ],
});

module.exports = {
  nori,
  participantRegistry,
  crc,
  participant,
  supplier,
  verifier,
  fifoCrcMarket,
};
