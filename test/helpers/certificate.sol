/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/Certificate.sol";
import "@/test/helpers/test.sol";

abstract contract UpgradeableCertificate is Upgradeable {
  Certificate internal _certificate;

  constructor() {
    _certificate = _deployCertificate();
  }

  function _deployCertificate() internal returns (Certificate) {
    Certificate impl = new Certificate();
    bytes memory initializer = abi.encodeWithSelector(impl.initialize.selector);
    return Certificate(_deployProxy(address(impl), initializer));
  }
}

abstract contract NonUpgradableCertificateMock is Certificate, Global {}

abstract contract UpgradableCertificateMock is UpgradeableCertificate {}

abstract contract CertificateSeeded is UpgradableCertificateMock, SeedableMock {
  constructor() {
    _seed();
  }

  function _seed() internal override {}
}
