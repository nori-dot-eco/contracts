/* solhint-disable contract-name-camelcase, func-name-mixedcase, not-rely-on-time */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/market.sol";
import {AddressArrayLib, UInt256ArrayLib} from "@/contracts/ArrayLib.sol";

using AddressArrayLib for address[];
using UInt256ArrayLib for uint256[];

abstract contract GasBenchmark is UpgradeableMarket {
  uint256[] internal _removalIdArray;
  uint256 internal _certificateTokenId;

  function _assertExpectedBalances(
    address owner,
    uint256 amount,
    bool ownsRemovalTokenId,
    uint256 count
  ) internal {
    assertEq(
      _removal.balanceOf({account: owner, id: _removalIdArray[0]}),
      ownsRemovalTokenId ? amount : 0
    );
    assertEq(_removal.numberOfTokensOwnedByAddress(owner), count);
  }
}

contract GasBenchmark_buyingFromManyRemovals_singleSupplier is GasBenchmark {
  uint256 numberOfRemovals;

  function setUp() external {
    numberOfRemovals = 250;
    _removalIdArray = new uint256[](numberOfRemovals);
    for (uint256 i = 0; i < numberOfRemovals; i++) {
      _removalIdArray[i] = _seedAndListRemoval({
        supplier: _namedAccounts.supplier,
        amount: 1 ether,
        vintage: uint16(2018 + (i % 4))
      });
    }

    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIdArray.length).fill(address(_market)),
        _removalIdArray
      ),
      new uint256[](_removalIdArray.length).fill(1 ether),
      "Expected the market to own the removals"
    );
    assertEq(_removal.getMarketBalance(), numberOfRemovals * 1 ether);
    assertEq(
      _removal.numberOfTokensOwnedByAddress(address(_market)),
      numberOfRemovals
    );
    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.buyer
    });
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIdArray[0]), 0);
    assertEq(
      _certificate.getPurchaseAmount(_certificateTokenId),
      0,
      "Certificate balance is wrong"
    );
  }

  function test() external {
    vm.prank(_namedAccounts.buyer);
    _market.swapWithoutFeeSpecialOrder({
      recipient: _namedAccounts.buyer,
      purchaser: _namedAccounts.buyer,
      amount: numberOfRemovals * 1 ether,
      customFee: 0,
      customPriceMultiple: 0,
      supplier: _namedAccounts.supplier,
      vintages: new uint256[](0)
    });
    // _assertExpectedBalances(address(_market), 0, false, 0);
    // _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    // assertEq(
    //   _removal.balanceOfBatch(
    //     new address[](_removalIdArray.length).fill(address(_certificate)),
    //     _removalIdArray
    //   ),
    //   new uint256[](_removalIdArray.length).fill(1 ether),
    //   "Expected the certificate to own the removals"
    // );
    // assertEq(
    //   _removal.numberOfTokensOwnedByAddress(address(_certificate)),
    //   _removalIdArray.length,
    //   "Expected the number removals held by the certificate to be equal to the number of removal IDs"
    // );
    // for (uint256 i = 0; i < numberOfRemovals; i++) {
    //   assertContains(
    //     _removalIdArray,
    //     _removal.getOwnedTokenIds(address(_certificate))[i],
    //     "Expected the certificate to hold the removal"
    //   );
    // }
    // assertEq(
    //   _certificate.getPurchaseAmount(_certificateTokenId),
    //   numberOfRemovals * 1 ether,
    //   "Certificate balance is wrong"
    // );
    // assertEq(
    //   _certificate.ownerOf(_certificateTokenId),
    //   _namedAccounts.buyer,
    //   "The wrong owner has the certificate"
    // );
  }
}

contract GasBenchmark_buyingFromOneRemoval_singleSupplier is GasBenchmark {
  uint256 numberOfRemovals;

  function setUp() external {
    numberOfRemovals = 1;
    _removalIdArray = new uint256[](numberOfRemovals);
    for (uint256 i = 0; i < numberOfRemovals; i++) {
      _removalIdArray[i] = _seedAndListRemoval({
        supplier: _namedAccounts.supplier,
        amount: 1 ether,
        vintage: uint16(2018 + (i % 4))
      });
    }

    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIdArray.length).fill(address(_market)),
        _removalIdArray
      ),
      new uint256[](_removalIdArray.length).fill(1 ether),
      "Expected the market to own the removals"
    );
    assertEq(_removal.getMarketBalance(), numberOfRemovals * 1 ether);
    assertEq(
      _removal.numberOfTokensOwnedByAddress(address(_market)),
      numberOfRemovals
    );
    _market.grantRole({
      role: _market.MARKET_ADMIN_ROLE(),
      account: _namedAccounts.buyer
    });
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIdArray[0]), 0);
    assertEq(
      _certificate.getPurchaseAmount(_certificateTokenId),
      0,
      "Certificate balance is wrong"
    );
  }

  function test() external {
    vm.prank(_namedAccounts.buyer);
    _market.swapWithoutFeeSpecialOrder({
      recipient: _namedAccounts.buyer,
      purchaser: _namedAccounts.buyer,
      amount: 0.0001 ether,
      customFee: 0,
      customPriceMultiple: 0,
      supplier: _namedAccounts.supplier,
      vintages: new uint256[](0)
    });
  }
}
