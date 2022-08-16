// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.15;

import "forge-std/Script.sol";
import "../contracts/Removal.sol";
import {UInt256ArrayLib} from "../contracts/ArrayLib.sol";

contract MintAndListRemovals is Script {
  using UInt256ArrayLib for uint256[];
  // todo configurable / different suppliers / different amounts
  bool listInMarketNow = true;
  uint32 numberOfRemovalsToCreate = 1;

  Removal private _removal;
  address removalAddress = 0xa051E9EeaC803d2fCA1DbF415b78AD9BfEB723b0;
  address mockSupplierAddress = 0x8eB185e20A9B7b31bd48DA19E834B93bE952795E; // account 2 on staging mnemonic wallet

  function run() external {
    vm.startBroadcast();
    _removal = Removal(removalAddress);
    DecodedRemovalIdV0[] memory removals = new DecodedRemovalIdV0[](
      numberOfRemovalsToCreate
    );
    for (uint32 i = 0; i < numberOfRemovalsToCreate; i++) {
      DecodedRemovalIdV0 memory removalData = DecodedRemovalIdV0({
        idVersion: 0,
        methodology: 1,
        methodologyVersion: 0,
        vintage: 2018,
        country: "AA",
        subdivision: "ZZ",
        supplierAddress: mockSupplierAddress,
        subIdentifier: numberOfRemovalsToCreate + i
      });
      removals[i] = removalData;
      _removal.mintBatch({
        to: listInMarketNow ? _removal.marketAddress() : mockSupplierAddress,
        amounts: new uint256[](numberOfRemovalsToCreate).fill(1 ether),
        removals: removals,
        projectId: 1_234_567_890,
        scheduleStartTime: block.timestamp,
        holdbackPercentage: 50
      });
      vm.stopBroadcast();
    }
  }
}
