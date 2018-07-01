/* globals artifacts */
import {
  ParticipantRegistryV0,
  ContractRegistryV0_1_0,
  UnstructuredOwnedUpgradeabilityProxy,
  SupplierV0,
} from '../helpers/Artifacts';
import { deployUpgradeableContract } from '../helpers/contracts';

const Web3 = require('web3');

const deployUpgradeableParticipantRegistry = async (
  admin,
  contractRegistry
) => {
  const proxy = await UnstructuredOwnedUpgradeabilityProxy.new(
    contractRegistry.address
  );
  const initParams = [
    ['address', 'address'],
    [contractRegistry.address, admin],
  ];
  const [, participantRegistry] = await deployUpgradeableContract(
    artifacts,
    proxy,
    ParticipantRegistryV0,
    contractRegistry,
    initParams
  );
  return [proxy, participantRegistry];
};

const shouldBehaveLikeParticipantRegistry = admin => {
  contract('ParticipantRegistryV0', () => {
    let participantRegistry;
    let supplier;
    let web3;
    before(async () => {
      const contractRegistry = await ContractRegistryV0_1_0.new();
      [, participantRegistry] = await deployUpgradeableParticipantRegistry(
        admin,
        contractRegistry
      );
      supplier = await SupplierV0.new();
      await supplier.initialize(
        contractRegistry.address,
        participantRegistry.address,
        admin
      );
      web3 = await new Web3();
    });
    describe('toggleParticipantType', () => {
      const toggles = [true, false];
      toggles.forEach(toggle => {
        it('should toggle participantType permissions', async () => {
          await participantRegistry.toggleParticipantType(
            'Supplier',
            supplier.address,
            toggle,
            {
              from: admin,
            }
          );
          assert.equal(
            await participantRegistry.participantTypes.call(
              web3.sha3('Supplier'),
              supplier.address,
              {
                from: admin,
              }
            ),
            toggle,
            'did not toggle participant type'
          );
        });
      });
    });
  });
};

module.exports = {
  shouldBehaveLikeParticipantRegistry,
  deployUpgradeableParticipantRegistry,
};
