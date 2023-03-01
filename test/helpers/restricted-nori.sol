/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/contracts/RestrictedNORI.sol";
import "@/test/helpers/test.sol";

abstract contract UpgradeableRestrictedNORI is Upgradeable {
  RestrictedNORI internal _rNori;

  constructor() {
    _rNori = _deployRestrictedNORI();
  }

  function _deployRestrictedNORI() internal returns (RestrictedNORI) {
    RestrictedNORI impl = new RestrictedNORI();
    vm.label(address(impl), "RestrictedNORI Implementation");
    bytes memory initializer = abi.encodeWithSelector(impl.initialize.selector);
    RestrictedNORI rNoriProxy = RestrictedNORI(
      _deployProxy(address(impl), initializer)
    );
    vm.label(address(rNoriProxy), "RestrictedNORI Proxy");
    return rNoriProxy;
  }
}

contract NonUpgradeableRestrictedNORI is RestrictedNORI, Global {
  constructor() {
    vm.label(address(this), "NonUpgradeableRestrictedNORI");
    initialize();
  }

  function _disableInitializers() internal override {
    // solhint-disable-previous-line no-empty-blocks, this allows us to initialize an implementation contract
  }
}
