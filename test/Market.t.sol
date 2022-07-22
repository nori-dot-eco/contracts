/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";
import "@/contracts/ArrayLib.sol";

using ArrayLib for uint256[];
using AddressArrayLib for address[];

contract Market_ALLOWLIST_ROLE is UpgradeableMarket {
  function test() external {
    assertEq(_market.ALLOWLIST_ROLE(), keccak256("ALLOWLIST_ROLE"));
  }
}

// todo test with 3 suppliers, 3 removals each, withdraw from center
// todo test with 2 suppliers 1 removal each, withdraw from end
// todo test with 2 suppliers, 1 removal each, withdraw from start
contract Market_withdraw is UpgradeableMarket {
  uint256[] private _removalIds;
  address[] private _suppliers;
  uint32 private _count = uint32(1);

  function setUp() external {
    _removalIds = new uint256[](_count).fill(
      _seedRemovalWithSubIdentifier(_count)
    );
    _suppliers = new address[](_count).fill(_namedAccounts.supplier);
    assertEq(
      _removal.balanceOfBatch(_suppliers, _removalIds),
      new uint256[](_count).fill(0)
    );
    assertEq(_market.totalUnrestrictedSupply(), 1 ether * _count);
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    assertEq(
      _removal.balanceOfBatch(_suppliers, _removalIds),
      new uint256[](_count).fill(1 ether * _count)
    );
    assertEq(_market.totalUnrestrictedSupply(), 0);
    // todo assert  rest of queue state
  }
}
