import { deployUpgradeableParticipantRegistry } from './ParticipantRegistry';
import {
  deployUpgradeableContract,
  getLatestVersionFromFs,
} from '../helpers/contracts';

const shouldBehaveLikeParticipant = admin => {
  contract('Participant', () => {
    let participant;
    let participantRegistry;
    before(async () => {
      const contractRegistry = await artifacts
        .require(
          `./ContractRegistryV${await getLatestVersionFromFs(
            'ContractRegistry'
          )}`
        )
        .new();
      [, participantRegistry] = await deployUpgradeableParticipantRegistry(
        admin,
        contractRegistry
      );

      const initParams = [
        ['address', 'address', 'address'],
        [contractRegistry.address, participantRegistry.address, admin],
      ];
      [, participant] = await deployUpgradeableContract(
        artifacts,
        null,
        await artifacts.require(
          `./ParticipantV${await getLatestVersionFromFs('Participant')}`
        ),
        contractRegistry,
        initParams
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
