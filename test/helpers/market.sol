/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import {Market} from "@/contracts/Market.sol";
import {Removal} from "@/contracts/Removal.sol";
import {RestrictedNORI} from "@/contracts/RestrictedNORI.sol";
import {Certificate} from "@/contracts/Certificate.sol";
import {IERC20WithPermit} from "@/contracts/IERC20WithPermit.sol";
import {Global} from "@/test/helpers/test.sol";
import {
  UpgradeableBridgedPolygonNORI,
  NonUpgradeableBridgedPolygonNORI
} from "@/test/helpers/bridged-polygon-nori.sol";
import {
  UpgradeableRemoval,
  NonUpgradeableRemoval
} from "@/test/helpers/removal.sol";
import {
  UpgradeableCertificate,
  NonUpgradeableCertificate
} from "@/test/helpers/certificate.sol";
import {
  UpgradeableRestrictedNORI,
  NonUpgradeableRestrictedNORI
} from "@/test/helpers/restricted-nori.sol";
import {
  UpgradeableNoriUSDC,
  NonUpgradeableNoriUSDC
} from "@/test/helpers/nori-usdc.sol";
import {
  SafeMathUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

abstract contract MarketHelper is Global {
  /** @dev Configures the various marketplace contracts as if we would in a fresh/live deployment */
  function _configure(
    Market market,
    Removal removal,
    RestrictedNORI rNori,
    Certificate certificate,
    IERC20WithPermit restrictedToken
  ) internal {
    removal.registerContractAddresses({
      market: market,
      certificate: certificate
    });
    rNori.registerContractAddresses({
      wrappedToken: restrictedToken,
      removal: removal,
      market: market
    });
    rNori.grantRole({role: rNori.MINTER_ROLE(), account: address(market)});
    rNori.grantRole({
      role: rNori.SCHEDULE_CREATOR_ROLE(),
      account: address(removal)
    });
  }
}

abstract contract UpgradeableMarket is
  UpgradeableRestrictedNORI,
  UpgradeableRemoval,
  UpgradeableCertificate,
  UpgradeableBridgedPolygonNORI,
  MarketHelper
{
  Market internal _market;

  constructor() {
    // todo match constructor to style of NonUpgradeableMarket (allows setting fee, multiple, token)
    _market = _deployMarket(address(_bpNori));
    _marketAddress = address(_market);
    _configure({
      market: _market,
      removal: _removal,
      rNori: _rNori,
      certificate: _certificate,
      restrictedToken: IERC20WithPermit(address(_bpNori))
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
      100
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
    // todo just call this.initialize()
    vm.label(address(this), "UpgradeableUSDCMarket");
    _market.setPurchasingTokenAndPriceMultiple({
      purchasingToken: IERC20WithPermit(address(_noriUSDC)),
      priceMultiple: 2000
    });
    _configure({
      market: _market,
      removal: _removal,
      rNori: _rNori,
      certificate: _certificate,
      restrictedToken: IERC20WithPermit(address(_noriUSDC))
    });
  }
}

// abstract contract UpgradeableBridgedPolygonNORIMarket is UpgradeableMarket {
//   constructor()
//     UpgradeableMarket(
//       IERC20WithPermit(address(new UpgradeableBridgedPolygonNORI())),
//       25,
//       100
//     )
//   {
//     // solhint-disable-previous-line no-empty-blocks, this is a test
//   }
// }

// todo just deprecate and misconfigure without a base contract using _rNori.registerContractAddresses
abstract contract UpgradeableMisconfiguredMarket is
  UpgradeableMarket,
  UpgradeableNoriUSDC
{
  constructor() {
    vm.label(address(this), "UpgradeableMisconfiguredMarket");
    _market.setPurchasingTokenAndPriceMultiple({
      purchasingToken: IERC20WithPermit(address(_noriUSDC)),
      priceMultiple: 2000
    });
    _configure({
      market: _market,
      removal: _removal,
      rNori: _rNori,
      certificate: _certificate,
      restrictedToken: IERC20WithPermit(address(_bpNori)) // intentionally different than the purchasingToken above
    });
  }
}

abstract contract NonUpgradeableMarket is Market, MarketHelper {
  error NonUpgradeableMarketInitializationFailed();

  constructor(
    IERC20WithPermit _purchasingToken,
    uint256 noriFeePercentage,
    uint256 priceMultiple
  ) {
    vm.label(address(this), "NonUpgradeableMarket");
    NonUpgradeableCertificate certificate = new NonUpgradeableCertificate();
    NonUpgradeableRestrictedNORI restrictedNori = new NonUpgradeableRestrictedNORI();
    NonUpgradeableRemoval removal = new NonUpgradeableRemoval();
    initialize(
      removal,
      _purchasingToken,
      certificate,
      restrictedNori,
      _namedAccounts.feeWallet,
      noriFeePercentage,
      priceMultiple
    );
    _configure({
      market: this,
      removal: removal,
      rNori: restrictedNori,
      certificate: certificate,
      restrictedToken: _purchasingToken
    });
  }

  function _disableInitializers() internal virtual override {
    // solhint-disable-previous-line no-empty-blocks, this allows us to initialize an implementation contract
  }
}

abstract contract NonUpgradeableNORIMarket is NonUpgradeableMarket {
  constructor()
    NonUpgradeableMarket(
      IERC20WithPermit(address(new NonUpgradeableBridgedPolygonNORI())),
      25,
      100
    )
  {
    // solhint-disable-previous-line no-empty-blocks, this is a test
  }
}

abstract contract NonUpgradeableUSDCMarket is NonUpgradeableMarket {
  constructor()
    NonUpgradeableMarket(
      IERC20WithPermit(address(new NonUpgradeableNoriUSDC())),
      25,
      2000
    )
  {
    // solhint-disable-previous-line no-empty-blocks, this is a test
  }
}

// nonupgradeablemarket -- base contract for nonupgradeablenorimarket and nonupgradeableusdcmarket
// upgradeablemarket -- base contract for upgradeablenorimarket and upgradeableusdcmarket
