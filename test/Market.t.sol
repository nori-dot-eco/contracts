/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";
import "@/contracts/ArrayLib.sol";

using ArrayLib for uint256[];
using AddressArrayLib for address[];

abstract contract MarketWithdrawTestHelper is UpgradeableMarket {
  uint256[] internal _removalIds;
  address[] internal _suppliers;
  uint256[] internal _expectedRemovalBalances;
  uint256 internal _expectedMarketSupply;
  uint256 internal _amountPerRemoval = 1 ether;

  function _assertCorrectStates() internal {
    assertEq(
      _removal.balanceOfBatch(_suppliers, _removalIds),
      _expectedRemovalBalances
    );
    assertEq(_market.totalUnrestrictedSupply(), _expectedMarketSupply);
    // todo assert  rest of queue state
  }
}

contract Market_withdraw is MarketWithdrawTestHelper {
  function setUp() external {
    _removalIds = _seedRemoval({to: _namedAccounts.supplier, count: 1});
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval];
    _expectedMarketSupply = 0;
    _assertCorrectStates();
  }
}

contract Market_withdraw_reverts_OnlyAdminOrSupplierCanWithdraw is
  MarketWithdrawTestHelper
{
  function setUp() external {
    _removalIds = _seedRemoval({to: _namedAccounts.supplier, count: 1});
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier2);
    vm.expectRevert(Market.OnlyAdminOrSupplierCanWithdraw.selector);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval];
    _expectedMarketSupply = 0;
    _assertCorrectStates();
  }
}

contract Market_withdraw_1x3_center is MarketWithdrawTestHelper {
  function setUp() external {
    _suppliers = new address[](3).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0, 0, 0];
    _removalIds = _seedRemoval({to: _namedAccounts.supplier, count: 3});
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[1]);
    _expectedRemovalBalances = [0, _amountPerRemoval, 0];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _assertCorrectStates();
  }
}

/** @dev Test withdraw from the front of the market when the market has 1 removal across two suppliers */
contract Market_withdraw_2x1_front is MarketWithdrawTestHelper {
  function setUp() external {
    _suppliers = [_namedAccounts.supplier, _namedAccounts.supplier2];
    _removalIds = [
      _seedRemoval({to: _namedAccounts.supplier, count: 1})[0],
      _seedRemoval({to: _namedAccounts.supplier2, count: 1})[0]
    ];
    _expectedRemovalBalances = [0, 0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval, 0];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _assertCorrectStates();
  }
}

/** @dev Test withdraw from the back of the market when the market has 1 removal across two suppliers */
contract Market_withdraw_2x1_back is MarketWithdrawTestHelper {
  function setUp() external {
    _suppliers = [_namedAccounts.supplier, _namedAccounts.supplier2];
    _removalIds = [
      _seedRemoval({to: _namedAccounts.supplier, count: 1})[0],
      _seedRemoval({to: _namedAccounts.supplier2, count: 1})[0]
    ];
    _expectedRemovalBalances = [0, 0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier2);
    _market.withdraw(_removalIds[1]);
    _expectedRemovalBalances = [0, _amountPerRemoval];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _assertCorrectStates();
  }
}

contract Market_ALLOWLIST_ROLE is UpgradeableMarket {
  function test() external {
    assertEq(_market.ALLOWLIST_ROLE(), keccak256("ALLOWLIST_ROLE"));
  }
}
