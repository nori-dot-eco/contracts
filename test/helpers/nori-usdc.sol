/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/contracts/test/NoriUSDC.sol";
import "@/test/helpers/test.sol";
import "@/test/helpers/signature-utils.sol";

abstract contract UpgradeableNoriUSDC is Upgradeable {
  NoriUSDC internal _noriUSDC;
  NoriUSDC internal _noriUSDCImplementation;
  SignatureUtils internal _noriUSDCSignatureUtils;

  constructor() {
    _noriUSDC = _deployPurchaseToken();
    _noriUSDCSignatureUtils = new SignatureUtils(_noriUSDC.DOMAIN_SEPARATOR());
  }

  function _deployPurchaseToken() internal returns (NoriUSDC) {
    _noriUSDCImplementation = new NoriUSDC();
    vm.label(address(_noriUSDCImplementation), "NoriUSDC Implementation");
    bytes memory initializer = abi.encodeWithSelector(
      _noriUSDCImplementation.initialize.selector,
      _namedAccounts.admin
    );
    NoriUSDC purchaseTokenProxy = NoriUSDC(
      _deployProxy(address(_noriUSDCImplementation), initializer)
    );
    vm.label(address(purchaseTokenProxy), "NoriUSDC Proxy");
    return purchaseTokenProxy;
  }
}

contract NonUpgradablePurchaseToken is NoriUSDC, Global {}
