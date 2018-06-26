import { shouldBehaveLikeMultiSigWallet } from './behaviors/MultiSig';
import { MultiSigWallet } from './helpers/Artifacts';

const MultiSigWalletTests = () => {
  contract('MultiSigWallet', accounts => {
    shouldBehaveLikeMultiSigWallet(MultiSigWallet, accounts);
  });
};
export default MultiSigWalletTests;
