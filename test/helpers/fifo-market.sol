/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/FIFOMarket.sol";
import "@/test/helpers/test.sol";
import "@/test/helpers/bridged-polygon-nori.sol";
import "@/test/helpers/removal.sol";
import "@/test/helpers/certificate.sol";
import "@/test/helpers/restricted-nori.sol";

abstract contract UpgradeableFIFOMarket is
  UpgradeableRestrictedNORI,
  UpgradeableRemoval,
  UpgradeableCertificate,
  UpgradeableBridgedPolygonNORI
{
  FIFOMarket internal _market;

  constructor() {
    _market = _deployFIFOMarket();
    _removal.registerContractAddresses(
      RestrictedNORI(_rNori),
      FIFOMarket(_market)
    );
    _rNori.registerContractAddresses(
      BridgedPolygonNORI(_bpNori),
      Removal(_removal)
    );
  }

  function _deployFIFOMarket() internal returns (FIFOMarket) {
    FIFOMarket impl = new FIFOMarket();
    bytes memory initializer = abi.encodeWithSelector(
      impl.initialize.selector,
      address(_removal),
      address(_bpNori),
      address(_certificate),
      address(_rNori),
      address(_namedAccounts.admin),
      15
    );
    return FIFOMarket(_deployProxy(address(impl), initializer));
  }
}

abstract contract NonUpgradableFIFOMarketMock is FIFOMarket, Global {}

abstract contract UpgradableFIFOMarketMock is UpgradeableFIFOMarket {}

abstract contract FIFOMarketSeeded is UpgradableFIFOMarketMock, SeedableMock {
  constructor() {
    _seed();
  }

  function _seed() internal override {}
}
