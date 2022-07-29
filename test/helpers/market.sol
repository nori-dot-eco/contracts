/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/Market.sol";
import "@/test/helpers/test.sol";
import "@/test/helpers/bridged-polygon-nori.sol";
import "@/test/helpers/removal.sol";
import "@/test/helpers/certificate.sol";
import "@/test/helpers/restricted-nori.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

abstract contract UpgradeableMarket is
  UpgradeableRestrictedNORI,
  UpgradeableRemoval,
  UpgradeableCertificate,
  UpgradeableBridgedPolygonNORI
{
  Market internal _market;

  constructor() {
    _market = _deployMarket();
    vm.label(address(_market), "Market");
    _removal.registerContractAddresses( // todo move to removal helper
      Market(_market),
      Certificate(_certificate)
    );
    _rNori.registerContractAddresses( // todo move to rnori helper
      BridgedPolygonNORI(_bpNori),
      Removal(_removal)
    );
    _rNori.grantRole(_rNori.MINTER_ROLE(), address(_market)); // todo move to rnori helper
    _rNori.grantRole(_rNori.SCHEDULE_CREATOR_ROLE(), address(_removal)); // todo move to rnori helper
  }

  function _deployMarket() internal returns (Market) {
    Market impl = new Market();
    vm.label(address(impl), "Market Implementation");
    bytes memory initializer = abi.encodeWithSelector(
      impl.initialize.selector,
      address(_removal),
      address(_bpNori),
      address(_certificate),
      address(_rNori),
      address(_namedAccounts.admin),
      15
    );
    Market marketProxy = Market(_deployProxy(address(impl), initializer));
    vm.label(address(marketProxy), "Market Proxy");
    return marketProxy;
  }

  function _availableMarketSupply(uint256[] memory removalIds)
    internal
    view
    returns (uint256)
  {
    (, uint256 availableSupply) = SafeMathUpgradeable.trySub(
      _cumulativeBalanceOfRemovalsForOwner(address(_market), removalIds),
      _market.priorityRestrictedThreshold()
    );
    return availableSupply;
  }
}

abstract contract NonUpgradableMarket is Market, Global {}
