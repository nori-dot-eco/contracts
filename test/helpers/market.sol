/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/contracts/Market.sol";
import "@/contracts/IERC20WithPermit.sol";
import "@/test/helpers/test.sol";
import "@/test/helpers/bridged-polygon-nori.sol";
import "@/test/helpers/removal.sol";
import "@/test/helpers/certificate.sol";
import "@/test/helpers/restricted-nori.sol";
import "@/test/helpers/nori-usdc.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

abstract contract UpgradeableMarket is
  UpgradeableRestrictedNORI,
  UpgradeableRemoval,
  UpgradeableCertificate,
  UpgradeableBridgedPolygonNORI
{
  IERC20WithPermit internal _purchasingToken;
  SignatureUtils internal _signatureUtils;
  Market internal _market;
  uint256 MAX_INT = 2**256 - 1;

  constructor() {
    _purchasingToken = IERC20WithPermit(address(_bpNori));
    _signatureUtils = _bpNoriSignatureUtils;
    _construct();
  }

  function _construct() internal {
    _market = _deployMarket(address(_purchasingToken));
    _marketAddress = address(_market);
    _removal.registerContractAddresses( // todo move to removal helper
      Market(_market),
      Certificate(_certificate)
    );
    _rNori.registerContractAddresses( // todo move to rnori helper
      _purchasingToken,
      Removal(_removal),
      Market(_market)
    );
    _rNori.grantRole(_rNori.MINTER_ROLE(), address(_market)); // todo move to rnori helper
    _rNori.grantRole(_rNori.SCHEDULE_CREATOR_ROLE(), address(_removal)); // todo move to rnori helper
  }

  function _deployMarket(
    address purchasingTokenAddress,
  ) internal returns (Market) {
    Market impl = new Market();
    vm.label(address(impl), "Market Implementation");
    bytes memory initializer = abi.encodeWithSelector(
      impl.initialize.selector,
      address(_removal),
      purchasingTokenAddress,
      address(_certificate),
      address(_rNori),
      address(_namedAccounts.admin),
      25,
      2000
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
      _market.getPriorityRestrictedThreshold()
    );
    return availableSupply;
  }
}

abstract contract UpgradeableUSDCMarket is
  UpgradeableMarket,
  UpgradeableNoriUSDC
{
  constructor() {
    _purchasingToken = IERC20WithPermit(address(_noriUSDC));
    _signatureUtils = _noriUSDCSignatureUtils;
    _construct();
  }
}

contract NonUpgradeableMarket is Market, Global {
  constructor() {
    vm.label(address(this), "NonUpgradeableMarket");
  }
}
