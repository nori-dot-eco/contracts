/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/RestrictedNORI.sol";
import "@/test/helpers/test.sol";

abstract contract UpgradeableRestrictedNORI is Upgradeable {
  RestrictedNORI internal _rNori;

  constructor() {
    _rNori = _deployRestrictedNORI();
  }

  function _deployRestrictedNORI() internal returns (RestrictedNORI) {
    RestrictedNORI impl = new RestrictedNORI();
    bytes memory initializer = abi.encodeWithSelector(impl.initialize.selector);
    return RestrictedNORI(_deployProxy(address(impl), initializer));
  }
}

abstract contract NonUpgradableRestrictedNORIMock is RestrictedNORI, Global {}

abstract contract UpgradableRestrictedNORIMock is UpgradeableRestrictedNORI {}

abstract contract RestrictedNORISeeded is
  UpgradableRestrictedNORIMock,
  SeedableMock
{
  constructor() {
    _seed();
  }

  function _seed() internal override {}
}
