import { shouldBehaveLikeVerifier } from './behaviors/Verifier';

const VerifierTests = admin => {
  shouldBehaveLikeVerifier(admin);
};
export default VerifierTests;
