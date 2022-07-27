/* solhint-disable contract-name-camelcase, func-name-mixedcase, no-empty-blocks */
// todo add to solhint config file ^
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/Certificate.sol";
import "@/test/helpers/test.sol";
import "@/test/helpers/removal.sol";

abstract contract UpgradeableCertificate is Upgradeable, UpgradeableRemoval {
  Certificate internal _certificate;

  constructor() {
    _certificate = _deployCertificate();
  }

  function _deployCertificate() internal returns (Certificate) {
    Certificate impl = new Certificate();
    bytes memory initializer = abi.encodeWithSelector(impl.initialize.selector);
    Certificate certificate = Certificate(
      _deployProxy(address(impl), initializer)
    );
    certificate.registerContractAddresses(Removal(_removal)); // todo consider simple registry pattern
    return certificate;
  }
}

abstract contract NonUpgradableCertificate is Certificate, Global {}
