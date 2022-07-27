/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";
import "@/contracts/ArrayLib.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";

using ArrayLib for uint256[];
using AddressArrayLib for address[];
using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;

abstract contract MarketBalanceTestHelper is UpgradeableMarket {
  uint256[] internal _removalIds;
  address[] internal _suppliers;
  uint256[] internal _expectedRemovalBalances;
  uint256 internal _expectedMarketSupply;
  uint256 internal _amountPerRemoval = 1 ether;
  uint256 internal _expectedPriorityRestrictedThreshold;
  EnumerableMapUpgradeable.AddressToUintMap internal _expectedTokenCount;

  function _assertCorrectStates() internal {
    assertEq(
      _removal.balanceOfBatch(_suppliers, _removalIds),
      _expectedRemovalBalances,
      "Expected _removal.balanceOfBatch(_suppliers, _removalIds) to equal _expectedRemovalBalances"
    );
    assertEq(
      _availableMarketSupply(_removalIds),
      _expectedMarketSupply,
      "Expected availableSupply to equal _expectedMarketSupply"
    );
    assertEq(
      _market.priorityRestrictedThreshold(),
      _expectedPriorityRestrictedThreshold,
      "Expected availableSupply to equal _expectedMarketSupply"
    );
    for (uint256 i; i < _expectedTokenCount.length(); ++i) {
      (address owner, uint256 count) = _expectedTokenCount.at(i);
      assertEq(
        _removal.numberOfTokensOwnedByAddress(owner),
        count,
        string.concat(
          "Expected number of tokens owned by ",
          StringsUpgradeable.toHexString(owner),
          " to equal _expectedNumberOfTokensForMarket"
        )
      );
    }
  }
}

contract Market_setPriorityRestrictedThreshold is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), 1);
    _assertCorrectStates();
  }

  function test() external {
    _expectedPriorityRestrictedThreshold = 0.5 ether;
    _market.setPriorityRestrictedThreshold(
      _expectedPriorityRestrictedThreshold
    );
    _expectedMarketSupply =
      (_amountPerRemoval * _removalIds.length) -
      _expectedPriorityRestrictedThreshold;
    _assertCorrectStates();
  }

  function test_zeroAvailable() external {
    _expectedPriorityRestrictedThreshold =
      _amountPerRemoval *
      _removalIds.length;
    _market.setPriorityRestrictedThreshold(
      _expectedPriorityRestrictedThreshold
    );
    _expectedMarketSupply = 0;
    _assertCorrectStates();
  }
}

contract Market_withdraw is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), 1);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval];
    _expectedMarketSupply = 0;
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), 0);
    _assertCorrectStates();
  }
}

contract Market_withdraw_reverts_UnauthorizedWithdrawal is
  MarketBalanceTestHelper
{
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier2);
    vm.expectRevert(Market.UnauthorizedWithdrawal.selector);
    _market.withdraw(_removalIds[0]);
    _assertCorrectStates();
  }
}

contract Market_withdraw_1x3_center is MarketBalanceTestHelper {
  function setUp() external {
    _suppliers = new address[](3).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0, 0, 0];
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 3,
      list: true
    });
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[1]);
    _expectedRemovalBalances = [0, _amountPerRemoval, 0];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }
}

/** @dev Test withdraw from the front of the market when the market has 1 removal across two suppliers */
contract Market_withdraw_2x1_front is MarketBalanceTestHelper {
  function setUp() external {
    _suppliers = [_namedAccounts.supplier, _namedAccounts.supplier2];
    _removalIds = [
      _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true})[0],
      _seedRemovals({to: _namedAccounts.supplier2, count: 1, list: true})[0]
    ];
    _expectedRemovalBalances = [0, 0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval, 0];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }
}

/** @dev Test withdraw from the front of the market when the market has 1 removal across two suppliers, then relists */
contract Market_withdraw_2x1_front_relist is MarketBalanceTestHelper {
  function _assertListedState() internal {
    _expectedRemovalBalances = [0, 0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function setUp() external {
    _suppliers = [_namedAccounts.supplier, _namedAccounts.supplier2];
    _removalIds = [
      _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true})[0],
      _seedRemovals({to: _namedAccounts.supplier2, count: 1, list: true})[0]
    ];
    _assertListedState();
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval, 0];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _removal.safeBatchTransferFrom({
      from: _namedAccounts.supplier,
      to: address(_market),
      ids: new uint256[](1).fill(_removalIds[0]),
      amounts: new uint256[](1).fill(_amountPerRemoval),
      data: ""
    });
    _assertListedState();
  }
}

/** @dev Test withdraw from the back of the market when the market has 1 removal across two suppliers */
contract Market_withdraw_2x1_back is MarketBalanceTestHelper {
  function setUp() external {
    _suppliers = [_namedAccounts.supplier, _namedAccounts.supplier2];
    _removalIds = [
      _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true})[0],
      _seedRemovals({to: _namedAccounts.supplier2, count: 1, list: true})[0]
    ];
    _expectedRemovalBalances = [0, 0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(_namedAccounts.supplier2, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier2);
    _market.withdraw(_removalIds[1]);
    _expectedRemovalBalances = [0, _amountPerRemoval];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(_namedAccounts.supplier2, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }
}

contract Market_ALLOWLIST_ROLE is UpgradeableMarket {
  function test() external {
    assertEq(_market.ALLOWLIST_ROLE(), keccak256("ALLOWLIST_ROLE"));
  }
}
