import UnstructuredOwnedUpgradeabilityProxyTests from './UnstructuredOwnedUpgradeabilityProxy.test';
import { UnstructuredUpgradeScenarios } from './UpgradeScenarios.test';
import NoriUpgradeTests from './Nori.test';
import MultiAdminTests from './MultiAdmin.test';
import MultiSigWallet from './MultiSigWallet.test';
import { RootRegistryTests, ContractRegistryTests } from './Registry.test';
import { giveEth } from './helpers/utils';
import CRCTests from './CRC.test';
import ParticipantRegistryTests from './ParticipantRegistry.test';
import ParticipantTests from './Participant.test';
import SupplierTests from './Supplier.test';
import VerifierTests from './Verifier.test';
import FifoCrcMarketTests from './FifoCrcMarket.test';
import { EIP820RegistryTests } from './EIP820.test';
import RiskMitigationAccountTests from './RiskMitigationAccount.test';

const {
  buyer0,
  buyer1,
  supplier0,
  supplier1,
  verifier0,
  verifier1,
  auditor,
  unregistered0,
  admin0,
  admin1,
  allAccounts,
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
      verifier0: ${verifier0}
      verifier1: ${verifier1}
      auditor: ${auditor}
      unregistered0: ${unregistered0}
    `);
    // Cant find a standard way to set the default balance of an account, and some tests
    // are complex + long and require a large balance, this gives the first account
    // some additional funds to prevent running out of ether.
    giveEth(admin0, 0.25);
  });

  context('Execute tests', () => {
    // todo jaycen fix this (broken when removed eternal storage stuff)
    // ProxyTests();
    MultiSigWallet(); // MultiSig wallet tests
    MultiAdminTests(); // MultiSig admin tests
    ContractRegistryTests(admin0, admin1, unregistered0, allAccounts);
    RootRegistryTests();
    EIP820RegistryTests();
    CRCTests(admin0);
    ParticipantRegistryTests(admin0);
    ParticipantTests(admin0);
    SupplierTests(admin0);
    VerifierTests(admin0);
    FifoCrcMarketTests();
    // Unstructured upgrade tests
    UnstructuredOwnedUpgradeabilityProxyTests(admin0, admin1);
    RiskMitigationAccountTests();
  });

  context('Upgrade Scenarios', () => {
    UnstructuredUpgradeScenarios(admin0, admin1, unregistered0);
    NoriUpgradeTests(admin0, admin1, unregistered0);
  });
});
