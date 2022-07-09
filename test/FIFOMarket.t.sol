/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/fifo-market.sol";

contract FIFOMarket_numberOfActiveRemovals is UpgradableFIFOMarketMock {
  function test() external {
    assertEq(_market.numberOfActiveRemovals(), 0);
  }
}
