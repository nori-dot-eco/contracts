import { shouldBehaveLikeMultiSigWallet } from './behaviors/MultiSig';
import { MultiAdmin } from './helpers/artifacts';

const MultiAdminTests = () => {
  contract('MultiAdmin', accounts => {
    shouldBehaveLikeMultiSigWallet(MultiAdmin, accounts);
  });
};
export default MultiAdminTests;
