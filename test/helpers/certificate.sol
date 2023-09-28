/* solhint-disable contract-name-camelcase, func-name-mixedcase, no-empty-blocks */
// todo add to solhint config file ^
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/contracts/Certificate.sol";
import "@/test/helpers/test.sol";
import "@/test/helpers/removal.sol";

abstract contract UpgradeableCertificate is Upgradeable, UpgradeableRemoval {
  Certificate internal _certificate;

  event CreateCertificate(
    address from,
    address indexed recipient,
    uint256 indexed certificateId,
    uint256 certificateAmount,
    uint256[] removalIds,
    uint256[] removalAmounts,
    address indexed purchasingTokenAddress,
    uint256 priceMultiple,
    uint256 noriFeePercentage
  );

  constructor() {
    _certificate = _deployCertificate();
  }

  function _deployCertificate() internal returns (Certificate) {
    Certificate impl = new Certificate();
    vm.label(address(impl), "Certificate Implementation");
    bytes memory initializer = abi.encodeWithSelector(
      impl.initialize.selector,
      "https://registry.test.nori.com/certificates"
    );
    Certificate proxy = Certificate(_deployProxy(address(impl), initializer));
    proxy.registerContractAddresses(_removal); // todo consider simple registry pattern
    vm.label(address(proxy), "Certificate Proxy");
    return proxy;
  }
}

contract NonUpgradeableCertificate is Certificate, Global {
  constructor() {
    vm.label(address(this), "NonUpgradeableCertificate");
  }
}
