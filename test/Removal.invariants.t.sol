// /* solhint-disable contract-name-camelcase, func-name-mixedcase, reason-string */
// // SPDX-License-Identifier: MIT
// pragma solidity =0.8.17;
// import "@/test/helpers/test.sol";
// import "@/test/helpers/market.sol";
// import "@/test/helpers/MarketHandler.sol";
// import "@/contracts/Removal.sol";
// import "forge-std/InvariantTest.sol";
// import "forge-std/console2.sol";
// import {console} from "forge-std/console.sol";

// contract RemovalInvariantTestBase is InvariantTest, Upgradeable {
//   MarketHandler marketHandler;
//   Removal internal _removal; // todo do I need to exclude this one?

//   function setUp() external {
//     marketHandler = new MarketHandler();
//     _removal = Removal(marketHandler.getRemovalAddress());

//     targetContract(address(marketHandler));
//   }
// }

// contract RemovalUniqueName is RemovalInvariantTestBase {
//   function invariant_certificateAddressNeverZeroAddress() external {
//     assertTrue(_removal.getCertificateAddress() != address(0));
//   }

//   function invariant_removalIdAlwaysOwnedCorrectly() external {
//     for (uint256 i = 0; i < marketHandler.getCountOfMintedRemovalIds(); i++) {
//       uint256 removalId = marketHandler.getRemovalIdAtIndex(i);
//       assertTrue(
//         _removal.balanceOf(
//           RemovalIdLib.supplierAddress(removalId),
//           removalId
//         ) !=
//           0 ||
//           _removal.balanceOf(marketHandler.getMarketAddress(), removalId) != 0
//       );
//     }
//   }

//   // TODO this doesn't seem to be working right, including in the example from which it was pulled
//   function invariant_call_summary() external view {
//     console.log("\nCall Summary\n");
//     console.log(
//       "mintRemovalMinimizeReverts        ",
//       marketHandler.numCalls("mintRemovalMinimizeReverts")
//     );
//     console.log(
//       "consignRandomRemovalToMarket       ",
//       marketHandler.numCalls("consignRandomRemovalToMarket")
//     );
//     console.log("------------------");
//     console.log(
//       "Sum",
//       marketHandler.numCalls("mintRemovalMinimizeReverts") +
//         marketHandler.numCalls("consignRandomRemovalToMarket")
//     );
//   }
// }
