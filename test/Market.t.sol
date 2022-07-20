/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";

contract Market_numberOfActiveRemovals is UpgradeableMarket {
  function test() external {
    assertEq(_market.numberOfActiveRemovals(), 0);
  }
}
