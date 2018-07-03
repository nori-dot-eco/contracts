import { NoriV0_1_0 } from './helpers/Artifacts';
import { shouldBehaveLikeUnstructuredUpgradeableToken } from './behaviors/UnstructuredUpgradeableToken';
// NoriV0_1_0 should behave like an unstructured upgradeable token
const NoriV0Tests = (admin, mintRecipient, transferRecipient) => {
  contract('NoriV0_1_0', () => {
    shouldBehaveLikeUnstructuredUpgradeableToken(
      admin,
      mintRecipient,
      transferRecipient,
      NoriV0_1_0,
      [
        ['string', 'string', 'uint', 'uint', 'address', 'address'],
        ['Upgradeable NORI Token', 'NORI', 1, 0, 0, admin],
      ],
      0
    );
  });
};
export default NoriV0Tests;
