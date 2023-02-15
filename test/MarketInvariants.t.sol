/* solhint-disable contract-name-camelcase, func-name-mixedcase, reason-string */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/test.sol";
import "@/test/helpers/market.sol";
import "@/test/helpers/MarketHandler.sol";
import "@/contracts/Certificate.sol";
import "@/contracts/Removal.sol";
import "forge-std/InvariantTest.sol";
import "forge-std/console2.sol";
import {console} from "forge-std/console.sol";

contract MarketInvariantTest is InvariantTest, Global {
  MarketHandler marketHandler;
  Certificate internal _certificate;
  Removal internal _removal;

  function setUp() external {
    marketHandler = new MarketHandler();
    _certificate = Certificate(marketHandler.getCertificateAddress());
    _removal = Removal(marketHandler.getRemovalAddress());
    targetContract(address(marketHandler)); // only target the handler
  }

  function invariant_sumOfPurchaseAmounts() external {
    // the sum of purchase amounts for all certificate ids should equal the total balance
    // of the certificate contract, less any reported deficit that hasn't been replaced
    uint256 sumOfPurchaseAmounts = 0;
    for (uint256 i = 0; i < _certificate.totalMinted(); i++) {
      sumOfPurchaseAmounts += _certificate.getPurchaseAmount(i);
    }
    uint256 sumOfCertificateRemovalBalances = 0;
    for (uint256 i = 0; i < marketHandler.getCountOfSoldRemovalIds(); i++) {
      uint256 removalId = marketHandler.getSoldRemovalIdAtIndex(i);
      sumOfCertificateRemovalBalances += _removal.balanceOf(
        address(_certificate),
        removalId
      );
    }
    assertTrue(
      sumOfPurchaseAmounts ==
        sumOfCertificateRemovalBalances + _certificate.getNrtDeficit()
    );
  }

  // TODO define more invariants!
  // Invariant ideas:
  // - removal tokens should only be held by the specific subset of addresses that are allowed to hold them
  // - the nrtDeficit in the certificate contract should never exceed the number of NRTs that were released
  // - the active suppliers in the market should only come from the set of addresses used to mint removal batches
  // - the amount of bpNori held by the RestrictedNORI contract should never exceed the total supply all schedule 1155s
  //    combined
  // - all kinds of contract-specific invariants that could examine things like permissions and roles etc.
  //    (consider writing contract-specific handlers for this with minimal setup)

  /**
   * @dev Will report the number of times each function in the MarketHandler contract has been called.
   * Note that this is not a true invariant, but it is useful for debugging and monitoring.
   * It will only report the number of calls on the last run of the test, so it is only useful for a
   * general sense of the probability of each function being called.
   * Note that a reverted call will not be counted here but will increase the depth counter for that run.
   */
  function invariant_callSummary() external {
    console.log("\nCall Summary\n");
    console.log(
      "mintRemovalMinimizeReverts         ",
      marketHandler.numCalls("mintRemovalMinimizeReverts")
    );
    console.log(
      "consignRandomRemovalToMarket       ",
      marketHandler.numCalls("consignRandomRemovalToMarket")
    );
    console.log(
      "purchaseFromMarket        ",
      marketHandler.numCalls("purchaseFromMarket")
    );
    console.log(
      "releaseRandomRemoval       ",
      marketHandler.numCalls("releaseRandomRemoval")
    );
    console.log(
      "replaceRandomPortionOfNrtDeficit   ",
      marketHandler.numCalls("replaceRandomPortionOfNrtDeficit")
    );
    console.log("endToEnd              ", marketHandler.numCalls("endToEnd"));
  }
}
