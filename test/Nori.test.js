import { NoriV0_2_0 } from './helpers/Artifacts';
import { shouldBehaveLikeUnstructuredUpgradeableToken } from './behaviors/UnstructuredUpgradeableToken';
// Nori should behave like an unstructured upgradeable token
const NoriUpgradeTests = (admin, mintRecipient, transferRecipient) => {
  contract('Nori', () => {
    shouldBehaveLikeUnstructuredUpgradeableToken(
      admin,
      mintRecipient,
      transferRecipient,
      NoriV0_2_0,
      [
        ['string', 'string', 'uint', 'uint', 'address', 'address'],
        ['Upgradeable NORI Token', 'NORI', 1, 0, 0, admin],
      ],
      0,
      ['', '', 1, [0x0000000000000000000000000000000000000000]]
    );
  });
};
export default NoriUpgradeTests;
