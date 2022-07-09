/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/bridged-polygon-nori.sol";

contract BridgedPolygonNORI_name is UpgradableBridgedPolygonNORIMock {
  function test() external {
    assertEq(_bpNori.name(), "NORI");
  }
}
