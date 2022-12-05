/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/contracts/NORI.sol";
import "@/test/helpers/test.sol";
import "@/test/helpers/signature-utils.sol";

abstract contract UpgradeableNORI is Upgradeable {
  NORI internal _nori;
  SignatureUtils internal _signatureUtils;

  constructor() {
    _nori = _deployNORI();
    _signatureUtils = new SignatureUtils(_nori.DOMAIN_SEPARATOR());
  }

  function _deployNORI() internal returns (NORI) {
    NORI impl = new NORI();
    vm.label(address(impl), "NORI Implementation");
    bytes memory initializer = abi.encodeWithSelector(impl.initialize.selector);
    NORI proxy = NORI(_deployProxy(address(impl), initializer));
    vm.label(address(proxy), "NORI Proxy");
    return proxy;
  }
}

contract NonUpgradableNORIMock is NORI, Global {}

abstract contract UpgradableNORIMock is UpgradeableNORI {}
