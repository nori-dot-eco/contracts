import { shouldBehaveLikeMultiSigWallet } from './behaviors/MultiSig';
import { MultiSigWallet } from './helpers/artifacts';

const MultiSigWalletTests = () => {
  contract('MultiSigWallet', accounts => {
    shouldBehaveLikeMultiSigWallet(MultiSigWallet, accounts);
  });
};
export default MultiSigWalletTests;
