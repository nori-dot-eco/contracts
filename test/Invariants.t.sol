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

  // bytes4[] internal _selectors;

  function setUp() external {
    marketHandler = new MarketHandler();
    _certificate = Certificate(marketHandler.getCertificateAddress());
    _removal = Removal(marketHandler.getRemovalAddress());
    targetContract(address(marketHandler)); // only target the handler
    // _selectors = [MarketHandler.endToEnd.selector];
    // targetSelector(FuzzSelector(address(marketHandler), _selectors));
  }

  function invariant_sumOfPurchaseAmounts() external {
    // the sum of purchase amounts for all certificate ids should equal the total balance
    // of the certificate contract, less any reported deficit that hasn't been replaced

    uint256 sumOfPurchaseAmounts = 0;
    for (uint256 i = 0; i < _certificate.totalMinted(); i++) {
      sumOfPurchaseAmounts += _certificate.getPurchaseAmount(i);
    }
    console2.log("sumOfPurchaseAmounts", sumOfPurchaseAmounts);
    uint256 sumOfCertificateRemovalBalances = 0;
    for (uint256 i = 0; i < marketHandler.getCountOfSoldRemovalIds(); i++) {
      uint256 removalId = marketHandler.getSoldRemovalIdAtIndex(i);
      sumOfCertificateRemovalBalances += _removal.balanceOf(
        address(_certificate),
        removalId
      );
    }
    console2.log(
      "sumOfCertificateRemovalBalances",
      sumOfCertificateRemovalBalances
    );
    console2.log("_certificate.getNrtDeficit()", _certificate.getNrtDeficit());
    assertTrue(
      sumOfPurchaseAmounts ==
        sumOfCertificateRemovalBalances - _certificate.getNrtDeficit()
    );
  }
}
