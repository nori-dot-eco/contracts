import { shouldBehaveLikeParticipantRegistry } from './behaviors/ParticipantRegistry';

const ParticipantRegistryTests = admin => {
  shouldBehaveLikeParticipantRegistry(admin);
};
export default ParticipantRegistryTests;
