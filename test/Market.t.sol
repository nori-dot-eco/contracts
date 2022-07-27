/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";

contract Market_ALLOWLIST_ROLE is UpgradeableMarket {
  function test() external {
    assertEq(_market.ALLOWLIST_ROLE(), keccak256("ALLOWLIST_ROLE"));
  }
}
