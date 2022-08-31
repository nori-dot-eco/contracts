// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.15;

import "forge-std/Script.sol";
import "../contracts/BridgedPolygonNORI.sol";

contract MintBPNori is Script {
  /**
   * @notice The BridgedPolygonNORI contract.
   */
  // address bpNoriAddress = 0x8D7713C76A2A6Ec517FB3C032524dd86425E24f4;
  address bpNoriAddress = 0xBD16B6880F76CA8A3543dd7A2a60d375d0485dBB;
  address defenderRelayer = 0x6Dc772F80495F47d8000530A59eE975B67B7c646;
  BridgedPolygonNORI private _bridgedPolygonNORI;

  function run() external {
    vm.startBroadcast();
    _bridgedPolygonNORI = BridgedPolygonNORI(bpNoriAddress);
    _bridgedPolygonNORI.deposit(
      defenderRelayer,
      abi.encode(200000000000000000000)
    ); // 200 NORI
    vm.stopBroadcast();
  }
}
