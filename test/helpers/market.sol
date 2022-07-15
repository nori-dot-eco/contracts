/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/Market.sol";
import "@/test/helpers/test.sol";
import "@/test/helpers/bridged-polygon-nori.sol";
import "@/test/helpers/removal.sol";
import "@/test/helpers/certificate.sol";
import "@/test/helpers/restricted-nori.sol";

abstract contract UpgradeableMarket is
  UpgradeableRestrictedNORI,
  UpgradeableRemoval,
  UpgradeableCertificate,
  UpgradeableBridgedPolygonNORI
{
  Market internal _market;

  constructor() {
    _market = _deployFIFOMarket();
    _removal.registerContractAddresses(RestrictedNORI(_rNori), Market(_market));
    _rNori.registerContractAddresses(
      BridgedPolygonNORI(_bpNori),
      Removal(_removal)
    );
    _rNori.grantRole(_rNori.MINTER_ROLE(), address(_market));
  }

  function _deployFIFOMarket() internal returns (Market) {
    Market impl = new Market();
    bytes memory initializer = abi.encodeWithSelector(
      impl.initialize.selector,
      address(_removal),
      address(_bpNori),
      address(_certificate),
      address(_rNori),
      address(_namedAccounts.admin),
      15
    );
    return Market(_deployProxy(address(impl), initializer));
  }
}

abstract contract NonUpgradableFIFOMarketMock is Market, Global {}

abstract contract UpgradableFIFOMarketMock is UpgradeableMarket {}

abstract contract FIFOMarketSeeded is UpgradableFIFOMarketMock, SeedableMock {
  constructor() {
    _seed();
  }

  function _seed() internal override {}
}
