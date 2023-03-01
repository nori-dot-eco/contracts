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

abstract contract MarketHelper {
  SignatureUtils internal _signatureUtils;
  uint256 MAX_INT = 2**256 - 1; // todo just use type(uint256).max - 1

  function _construct(
    Market market,
    Removal removal,
    RestrictedNORI rNori,
    Certificate certificate,
    IERC20WithPermit restrictedToken
  ) internal {
    removal.registerContractAddresses({market:market, certificate:certificate}); // todo move to removal helper
    rNori.registerContractAddresses({ // todo move to rnori helper
      wrappedToken: restrictedToken,
      removal: removal,
      market: market
    });
    rNori.grantRole(rNori.MINTER_ROLE(), address(market)); // todo move to rnori helper
    rNori.grantRole(rNori.SCHEDULE_CREATOR_ROLE(), address(removal)); // todo move to rnori helper
  }
}

abstract contract UpgradeableMarket is
  UpgradeableRestrictedNORI,
  UpgradeableRemoval,
  UpgradeableCertificate,
  UpgradeableBridgedPolygonNORI,
  MarketHelper
{
  IERC20WithPermit internal _purchasingToken;
  IERC20WithPermit internal _restrictedToken;
  Market internal _market;

  constructor() {
    _purchasingToken = IERC20WithPermit(address(_bpNori));
    _restrictedToken = _purchasingToken;
    _signatureUtils = _bpNoriSignatureUtils;
    _construct();
  }

  function _construct() internal {
    _market = _deployMarket(address(_purchasingToken));
    _marketAddress = address(_market);
    _construct({
      market: _market,
      removal: _removal,
      rNori: _rNori,
      certificate: _certificate,
      restrictedToken: _restrictedToken
    });
  }

  function _deployMarket(address purchasingTokenAddress)
    internal
    returns (Market)
  {
    Market impl = new Market();
    vm.label(address(impl), "Market Implementation");
    bytes memory initializer = abi.encodeWithSelector(
      impl.initialize.selector,
      address(_removal),
      purchasingTokenAddress,
      address(_certificate),
      address(_rNori),
      address(_namedAccounts.feeWallet),
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
    vm.label(address(this), "UpgradeableUSDCMarket");
    _purchasingToken = IERC20WithPermit(address(_noriUSDC));
    vm.label(
      address(_purchasingToken),
      "UpgradeableUSDCMarket_purchasingToken"
    );
    _signatureUtils = _noriUSDCSignatureUtils; // todo why the alias?
    _restrictedToken = IERC20WithPermit(address(_noriUSDC));
    vm.label(
      address(_restrictedToken),
      "UpgradeableUSDCMarket_restrictedToken"
    );
    _construct();
  }
}

abstract contract UpgradeableMisconfiguredMarket is
  UpgradeableMarket,
  UpgradeableNoriUSDC
{
  constructor() {
    vm.label(address(this), "UpgradeableMisconfiguredMarket");
    _purchasingToken = IERC20WithPermit(address(_noriUSDC));
    _signatureUtils = _noriUSDCSignatureUtils;
    _restrictedToken = IERC20WithPermit(address(_bpNori));
    _construct();
  }
}

abstract contract NonUpgradeableMarket is Market, MarketHelper, Global {
  // exposed_ //todo

  constructor(
    IERC20WithPermit _purchasingToken,
    uint256 noriFeePercentage,
    uint256 priceMultiple
  ) {
    vm.label(address(this), "NonUpgradeableMarket");
    _purchasingToken = _purchasingToken; // todo ?
    noriFeePercentage = noriFeePercentage; // todo pass to construct or call initializer here
    priceMultiple = priceMultiple; // todo pass to construct or call initializer here
    Certificate certificate = new NonUpgradeableCertificate();
    RestrictedNORI restrictedNori = new NonUpgradeableRestrictedNORI();
    Removal removal = new NonUpgradeableRemoval();
    /**
     * Solidity doesn't allow you to use this.fn() to call external functions in the context of a constructor
     * even if they are part of the current contract. This syntax exploits that limitation.
     */
    (bool success, ) = address(this).call(
      abi.encodeWithSelector(
        this.initialize.selector,
        address(removal),
        _purchasingToken,
        address(certificate),
        address(restrictedNori),
        address(_namedAccounts.feeWallet),
        25,
        2000
      )
    );
    require(success, "NOPE!");
    // _stdstore.target(address(this)).sig("_initialized").checked_write(2);
    // initialize({
    //   removal: removal,
    //   purchasingToken: purchasingToken,
    //   certificate: certificate,
    //   restrictedNori: restrictedNori,
    //   noriFeeWalletAddress: _namedAccounts.feeWallet,
    //   noriFeePercentage_: 25,
    //   priceMultiple_: 1
    // });
    _construct({
      market: this,
      removal: removal,
      rNori: restrictedNori,
      certificate: certificate,
      restrictedToken: _purchasingToken
    });
  }

  function _disableInitializers() internal override {}
}

// abstract contract NonUpgradeableNORIMarket is NonUpgradeableMarket {
//   constructor() {
//     _construct();
//   }
// }

// abstract contract NonUpgradeableUSDCMarket is NonUpgradeableMarket {
//   constructor() {
//     _construct();
//   }
// }
