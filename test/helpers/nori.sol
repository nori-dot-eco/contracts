/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/contracts/NORI.sol";
import "@/test/helpers/test.sol";
import "@/test/helpers/signature-utils.sol";

abstract contract UpgradeableNORI is Upgradeable {
  NORI internal _nori;
  SignatureUtils internal _noriSignatureUtils;

  constructor() {
    _nori = _deployNORI();
    _noriSignatureUtils = new SignatureUtils();
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

// solhint-disable-next-line no-empty-blocks, this is a test
contract NonUpgradeableNORIMock is NORI, Global {

}
