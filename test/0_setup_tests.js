import UnstructuredOwnedUpgradeabilityProxyTests from './UnstructuredOwnedUpgradeabilityProxy.test';
import { UnstructuredUpgradeScenarios } from './UpgradeScenarios.test';
import NoriV0Tests from './NoriV0.test';
import MultiAdminTests from './MultiAdmin.test';
import MultiSigWallet from './MultiSigWallet.test';
import { RootRegistryTests, ContractRegistryTests } from './Registry.test';
import { giveEth } from './helpers/utils';
import CRCV0Tests from './CRCV0.test';
import ParticipantRegistryTests from './ParticipantRegistry.test';
import ParticipantTests from './Participant.test';
import SupplierTests from './Supplier.test';
import VerifierTests from './Verifier.test';
import FifoCrcMarketV0Tests from './FifoCrcMarket.test';

const {
  buyer0,
  buyer1,
  supplier0,
  supplier1,
  verifier,
  auditor,
  unregistered0,
  unregistered1,
  admin0,
  admin1,
} = require('./helpers/getNamedAccounts')(web3);

// NOTE: this will become the standard way of testing both scenarios and per-contract functions.
// The tests will be refactored to fit into here in future PRs
context('Setup test environment', () => {
  before(() => {
    console.info(`
      Tests have been set up with:
      admin0: ${admin0}
      admin1: ${admin1}
      supplier0: ${supplier0}
      supplier1: ${supplier1}
      buyer0: ${buyer0}
      buyer1: ${buyer1}
      verifier: ${verifier}
      auditor: ${auditor}
      unregistered0: ${unregistered0}
      unregistered1: ${unregistered1}
    `);
    // Cant find a standard way to set the default balance of an account, and some tests
    // are complex + long and require a large balance, this gives the first account
    // some additional funds to prevent running out of ether.
    giveEth(admin0, 0.15);
  });

  context('Execute tests', () => {
    // todo jaycen fix this (broken when removed etsernal storage stuffz)
    // ProxyTests();
    MultiSigWallet(); // Multisig wallet tests
    MultiAdminTests(); // Multisig admin tests
    ContractRegistryTests(admin0, admin1, unregistered0);
    RootRegistryTests();
    CRCV0Tests(admin0);
    ParticipantRegistryTests(admin0);
    ParticipantTests(admin0);
    SupplierTests(admin0);
    VerifierTests(admin0);
    FifoCrcMarketV0Tests(admin0);
    // Unstructured upgrade tests
    UnstructuredOwnedUpgradeabilityProxyTests(admin0, admin1);
  });

  context('Upgrade Scenarios', () => {
    UnstructuredUpgradeScenarios(admin0, admin1, unregistered0);
    NoriV0Tests(admin0, admin1, unregistered0);
  });
});
