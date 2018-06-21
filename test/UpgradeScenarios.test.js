import { shouldBehaveLikeUnstructuredUpgradeableToken } from './behaviors/UnstructuredUpgradeableToken';
import {
  UnstructuredUpgradeableTokenV0,
  UnstructuredUpgradeableTokenV1,
  UnstructuredUpgradeableTokenV2,
  UnstructuredUpgradeableTokenV3,
} from './helpers/artifacts';

const UnstructuredUpgradeScenarios = (
  admin,
  mintRecipient,
  transferRecipient
) => {
  context(
    'Test Upgradeable NORI Token Scenarios using Unstructured storage approach approach',
    () => {
      context(
        'Deploy an upgradeable token and set (upgrade) the proxy to V0',
        () => {
          unstructuredVersionScenario(
            admin,
            mintRecipient,
            transferRecipient,
            UnstructuredUpgradeableTokenV0,
            0,
            [
              ['string', 'string', 'uint', 'uint', 'address', 'address'],
              ['Upgradeable NORI Token', 'NORI', 1, 0, 0, admin],
            ]
          );
        }
      );
      context(
        'Upgrade token at proxy from V0 to V1. Preserve V0 state, add and set new state, and add/call new functions.',
        () => {
          unstructuredVersionScenario(
            admin,
            mintRecipient,
            transferRecipient,
            UnstructuredUpgradeableTokenV1,
            1,
            [
              ['string', 'string', 'uint', 'uint', 'address', 'address'],
              ['Upgradeable NORI Token', 'NORI', 1, 0, 0, admin],
            ]
          );
        }
      );
      context(
        'Upgrade token at proxy from V1 to V2, change some functions',
        () => {
          unstructuredVersionScenario(
            admin,
            mintRecipient,
            transferRecipient,
            UnstructuredUpgradeableTokenV2,
            2,
            [
              ['string', 'string', 'uint', 'uint', 'address', 'address'],
              ['Upgradeable NORI Token', 'NORI', 1, 0, 0, admin],
            ]
          );
        }
      );
      context(
        'Upgrade token at proxy from V2 to V3, V3 does not inherit the previous versions and should not have any token functionality',
        () => {
          // only test upgradeabletoken function, skip ton token since it cant call those functions in this version
          unstructuredVersionScenario(
            admin,
            mintRecipient,
            transferRecipient,
            UnstructuredUpgradeableTokenV3,
            3,
            [
              ['string', 'string', 'uint', 'uint', 'address', 'address'],
              ['Upgradeable NORI Token', 'NORI', 1, 0, 0, admin],
            ]
          );
        }
      );
      context(
        'Upgrade token at proxy to V3 and then roll back to V2 since V3 will destroy state availability naming it V4',
        () => {
          unstructuredVersionScenario(
            admin,
            mintRecipient,
            transferRecipient,
            UnstructuredUpgradeableTokenV2,
            4
          );
        }
      );
    }
  );
};

const unstructuredVersionScenario = (
  admin,
  mintRecipient,
  transferRecipient,
  contract,
  version,
  initParams
) => {
  context(
    `UnstructuredUpgradeableTokenV${version} at UnstructuredOwnedUpgradeabilityProxy`,
    () => {
      shouldBehaveLikeUnstructuredUpgradeableToken(
        admin,
        mintRecipient,
        transferRecipient,
        contract,
        initParams,
        version
      );
    }
  );
};

module.exports = {
  unstructuredVersionScenario,
  UnstructuredUpgradeScenarios,
};
