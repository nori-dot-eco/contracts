import { deployUpgradeableParticipantRegistry } from './ParticipantRegistry';
import { ContractRegistryV0_1_0, ParticipantV0 } from '../helpers/artifacts';
import { deployUpgradeableContract } from '../helpers/contracts';

const shouldBehaveLikeParticipant = admin => {
  contract('ParticipantV0', () => {
    let participant;
    let participantRegistry;
    before(async () => {
      const contractRegistry = await ContractRegistryV0_1_0.new();
      [, participantRegistry] = await deployUpgradeableParticipantRegistry(
        admin,
        contractRegistry
      );

      const initParams = [
        ['address', 'address', 'address'],
        [contractRegistry.address, participantRegistry.address, admin],
      ];
      [, participant] = await deployUpgradeableContract(
        null,
        ParticipantV0,
        contractRegistry,
        initParams,
        []
      );
    });
    describe('setParticipantRegistry', () => {
      it('should set the participant registry', async () => {
        await participant.setParticipantRegistry(participantRegistry.address, {
          from: admin,
        });
        assert.equal(
          await participant.participantRegistry.call({ from: admin }),
          participantRegistry.address,
          'did not toggle account permission'
        );
      });
    });
  });
};

module.exports = {
  shouldBehaveLikeParticipant,
};
