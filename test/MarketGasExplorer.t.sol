/* solhint-disable contract-name-camelcase, func-name-mixedcase, not-rely-on-time */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/market.sol";

using AddressArrayLib for address[];
using UInt256ArrayLib for uint256[];

/**
 * Helper used while determining medians.
 * Stolen from https://gist.github.com/subhodi/b3b86cc13ad2636420963e692a4d896f
 */
contract QuickSort {
  function sort(uint256[] memory data) public returns (uint256[] memory) {
    quickSort(data, int256(0), int256(data.length - 1));
    return data;
  }

  function quickSort(uint256[] memory arr, int256 left, int256 right) internal {
    int256 i = left;
    int256 j = right;
    if (i == j) return;
    uint256 pivot = arr[uint256(left + (right - left) / 2)];
    while (i <= j) {
      while (arr[uint256(i)] < pivot) i++;
      while (pivot < arr[uint256(j)]) j--;
      if (i <= j) {
        (arr[uint256(i)], arr[uint256(j)]) = (arr[uint256(j)], arr[uint256(i)]);
        i++;
        j--;
      }
    }
    if (left < j) quickSort(arr, left, j);
    if (i < right) quickSort(arr, i, right);
  }
}

/**
 * @dev This contract is used to explore average and median gas scenarios of the Market contract's permitted `swap` function.
 * It is intended to be used directly and logs results to the console.
 *
 * You can configure the number of runs and the max and min purchase amounts by changing the `RUNS`, `MAX_PURCHASE_AMOUNT`,
 * and `MIN_PURCHASE_AMOUNT` storage variables. This will generate the average and median gas amounts across all RUNS.
 * In any given run, the number of NRTs to purchase is a randomish uint256 between MIN_PURCHASE_AMOUNT and MAX_PURCHASE_AMOUNT,
 * so over the course of many runs, the average and median purchase sizes will be close to the average of the min and max.
 *
 * The seeding of removals is varied in 6 different test cases that explore (in order) best-to-worst case scenarios for gas usage
 * from a market setup perspective. (See the docstring above each test for more details.)
 * In general, the more removals that are required to fulfill an order, the worse the gas usage, and to a slightly lesser extent,
 * the more unique suppliers that are required to fulfill an order, the worse the gas. Gas measurements tightly surround the `swap`
 * function call, so the gas usage of the `swap` function is the only thing that is measured and is agnostic to setup activity.
 *
 * Note that for high RUNS values or very high purchase amounts, tests can run out of gas. You can mitigate this by
 * increasing the gas limit in your test runner by setting the `--gas-limit "18446744073709551615"` flag or by setting the `gas_limit` in your
 * `foundry.toml` config under the `[profile.default]` section to `gas_limit = "18446744073709551615"` which is the max.
 */
contract MarketGasExplorer is UpgradeableMarket, QuickSort {
  uint256 RUNS = 80;
  uint256 MAX_PURCHASE_AMOUNT = 900;
  uint256 MIN_PURCHASE_AMOUNT = 1;

  uint256[] internal _removalIds;
  uint256 private _purchaseAmount;
  address private _owner;
  SignedPermit private _signedPermit;
  uint256[] private _gasAmounts;
  uint256[] private _purchaseAmounts;
  uint256[] private _perRemovalAmount;

  /**
   * The best possible gas scenario where an order is fulfilled by one removal.
   */
  function test_0_bestPossibleCaseOneRemoval() external {
    for (uint256 i = 0; i < RUNS; i++) {
      uint256 nrtAmount = getRandomNrtAmount();
      uint256 perRemovalAmount = nrtAmount * 1 ether;
      uint256 numberOfRemovals = 1;
      _perRemovalAmount.push(perRemovalAmount);
      for (uint256 j = 0; j < numberOfRemovals; j++) {
        uint256[] memory localRemovalIds = _seedRemovalSpecificAmount({
          mintTo: address(_market),
          supplier: vm.addr(1),
          removalAmount: perRemovalAmount,
          subIdentifier: uint32(_removalIds.length + 1) // ensure uniqueness of ids across all iterations and runs
        });
        _removalIds.push(localRemovalIds[0]);
      }
      makePurchaseRecordGas(nrtAmount);
    }
    logResults();
  }

  /**
   * The most realistic test setup, with various suppliers bounded from a set of 10, and
   * removal balances that are roughly realistic.
   */
  function test_1_mostRealisticSeveralSuppliersModerateAmounts() external {
    for (uint256 i = 0; i < RUNS; i++) {
      uint256 nrtAmount = getRandomNrtAmount();
      uint256 perRemovalAmount = (100) * 1 ether; // TODO create a more interesting but realistic distribution of removal amounts.
      uint256 numberOfRemovals = ((nrtAmount * 1 ether) / perRemovalAmount) + 1; // make sure we seed enough removals to cover the purchase
      _perRemovalAmount.push(perRemovalAmount);
      for (uint256 j = 0; j < numberOfRemovals; j++) {
        uint256[] memory localRemovalIds = _seedRemovalSpecificAmount({
          mintTo: address(_market),
          supplier: vm.addr((_removalIds.length % 10) + 1), // 10 unique suppliers
          removalAmount: perRemovalAmount,
          subIdentifier: uint32(_removalIds.length + 1) // ensure uniqueness of ids across all iterations and runs
        });
        _removalIds.push(localRemovalIds[0]);
      }
      makePurchaseRecordGas(nrtAmount);
    }
    logResults();
  }

  /**
   * Second most realistic scenario. Tests the case where every removal belongs to a unique supplier, but each removal
   * is funded with a relatively large number of NRTs such that only 3 removals are used in each purchase.
   */
  function test_2_uniqueSuppliersBulkAmounts() external {
    for (uint256 i = 0; i < RUNS; i++) {
      uint256 nrtAmount = getRandomNrtAmount();
      uint256 numberOfRemovals = 3;
      uint256 perRemovalAmount = (nrtAmount / numberOfRemovals + 1) * 1 ether;
      _perRemovalAmount.push(perRemovalAmount);
      for (uint256 j = 0; j < numberOfRemovals; j++) {
        uint256[] memory localRemovalIds = _seedRemovalSpecificAmount({
          mintTo: address(_market),
          supplier: vm.addr(_removalIds.length + 1), // unique supplier for every removal
          removalAmount: perRemovalAmount,
          subIdentifier: 123456789
        });
        _removalIds.push(localRemovalIds[0]);
      }
      makePurchaseRecordGas(nrtAmount);
    }
    logResults();
  }

  /**
   * Tests the case where there is a unique supplier for every removal id, and with variable amounts that
   * are smaller than the realistic average but not completely granular.
   */
  function test_3_uniqueSuppliersVariableAmounts() external {
    for (uint256 i = 0; i < RUNS; i++) {
      uint256 nrtAmount = getRandomNrtAmount();
      // randomish uint256 between 1 and nrtAmount / 2
      // (to help keep the per-removal-amount a little higher than it would otherwise average out to be which is 2)
      uint256 randomNumberOfRemovals = (gasleft() % (nrtAmount / 2)) + 1;
      uint256 perRemovalAmount = (nrtAmount / randomNumberOfRemovals + 1) *
        1 ether;
      _perRemovalAmount.push(perRemovalAmount);
      for (uint256 j = 0; j < randomNumberOfRemovals; j++) {
        uint256[] memory localRemovalIds = _seedRemovalSpecificAmount({
          mintTo: address(_market),
          supplier: vm.addr(_removalIds.length + 1), // unique supplier for every removal
          removalAmount: perRemovalAmount,
          subIdentifier: 123456789
        });
        _removalIds.push(localRemovalIds[0]);
      }
      makePurchaseRecordGas(nrtAmount);
    }
    logResults();
  }

  /**
   * Tests the case where all removals belong to the same supplier but each removal has a balance of 1 NRT (ether).
   * This appears to be much more gas inefficient, which makes sense because the number of operations needed to process
   * the purchase is much higher -- each removal is processed individually in terms of token transfers, and the list of
   * all removals has to be emitted in events, etc.
   */
  function test_4_singleSupplierGranularAmounts() external {
    for (uint256 i = 0; i < RUNS; i++) {
      uint256 nrtAmount = getRandomNrtAmount();
      uint256 numberOfRemovals = nrtAmount; // each removal will cover one NRT
      uint256 perRemovalAmount = 1 ether;
      _perRemovalAmount.push(perRemovalAmount);
      for (uint256 j = 0; j < numberOfRemovals; j++) {
        uint256[] memory localRemovalIds = _seedRemovalSpecificAmount({
          mintTo: address(_market),
          supplier: vm.addr(1), // same supplier for every removal
          removalAmount: perRemovalAmount,
          subIdentifier: uint32(_removalIds.length + 1) // ensure uniqueness of each id across all iterations and runs
        });
        _removalIds.push(localRemovalIds[0]);
      }
      makePurchaseRecordGas(nrtAmount);
    }
    logResults();
  }

  /**
   * The worst possible case, where every removal has a unique supplier and each removal has a balance of 1 NRT (ether),
   * which leads to the maximum overhead of processing this order both in terms of the data structure management during
   * supply allocation and the number of transfer calls required when fulfilling the order.
   */
  function test_5_uniqueSuppliersGranularAmounts() external {
    for (uint256 i = 0; i < RUNS; i++) {
      uint256 nrtAmount = getRandomNrtAmount();
      uint256 numberOfRemovals = nrtAmount; // each removal will cover one NRT
      uint256 perRemovalAmount = 1 ether;
      _perRemovalAmount.push(perRemovalAmount);
      for (uint256 j = 0; j < numberOfRemovals; j++) {
        uint256[] memory localRemovalIds = _seedRemovalSpecificAmount({
          mintTo: address(_market),
          supplier: vm.addr(_removalIds.length + 1), // unique supplier for every removal
          removalAmount: perRemovalAmount,
          subIdentifier: 123456789
        });
        _removalIds.push(localRemovalIds[0]);
      }
      makePurchaseRecordGas(nrtAmount);
    }
    logResults();
  }

  /**
   * Generate a pseudorandom uint256 between MIN_PURCHASE_AMOUNT and MAX_PURCHASE_AMOUNT.
   */
  function getRandomNrtAmount() internal view returns (uint256) {
    return
      (gasleft() % (MAX_PURCHASE_AMOUNT - MIN_PURCHASE_AMOUNT)) +
      MIN_PURCHASE_AMOUNT;
  }

  function makePurchaseRecordGas(uint256 nrtAmount) internal {
    _purchaseAmount = nrtAmount * 1 ether;
    uint256 purchaseCost = _market.calculateCheckoutTotal(_purchaseAmount);

    _purchaseAmounts.push(_purchaseAmount);
    uint256 ownerPrivateKey = 0xA11CE;
    _owner = vm.addr(ownerPrivateKey);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(purchaseCost));
    vm.prank(_owner);
    _signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      purchaseCost,
      1 days,
      _bpNori
    );

    vm.startPrank(_owner);
    uint256 gasLeft1 = gasleft();
    _market.swap(
      _owner,
      _owner,
      _purchaseAmount,
      _signedPermit.permit.deadline,
      _signedPermit.v,
      _signedPermit.r,
      _signedPermit.s
    );
    uint256 gasLeft2 = gasleft();
    uint256 gasDelta = gasLeft1 - gasLeft2 - 100; // https://ethereum.stackexchange.com/questions/132323/transaction-gas-cost-in-foundry-forge-unit-tests
    vm.stopPrank();
    _gasAmounts.push(gasDelta);
  }

  function logResults() internal {
    console2.log("RUNS: ", _gasAmounts.length);
    console2.log("MAX_PURCHASE_AMOUNT: ", MAX_PURCHASE_AMOUNT);
    console2.log("MIN_PURCHASE_AMOUNT: ", MIN_PURCHASE_AMOUNT);
    uint256 gasTotal = _gasAmounts.sum();
    uint256 gasAverage = gasTotal / _gasAmounts.length;
    console2.log("Average gas used: ", gasAverage);
    uint256[] memory sortedGasAmounts = sort(_gasAmounts);
    uint256 medianGasAmount = sortedGasAmounts[sortedGasAmounts.length / 2];
    console2.log("Median gas used: ", medianGasAmount);
    uint256 averagePurchaseAmount = _purchaseAmounts.sum() /
      _purchaseAmounts.length;
    console2.log(
      "Average purchase amount (ether): ",
      averagePurchaseAmount / 1 ether
    );
    uint256[] memory sortedPurchaseAmounts = sort(_purchaseAmounts);
    uint256 medianPurchaseAmount = sortedPurchaseAmounts[
      sortedPurchaseAmounts.length / 2
    ];
    console2.log(
      "Median purchase amount (ether): ",
      medianPurchaseAmount / 1 ether
    );
    uint256 averagePerRemovalAmount = _perRemovalAmount.sum() /
      _perRemovalAmount.length;
    console2.log(
      "Average per-removal amount (ether): ",
      averagePerRemovalAmount / 1 ether
    );
    uint256[] memory sortedPerRemovalAmounts = sort(_perRemovalAmount);
    uint256 medianPerRemovalAmount = sortedPerRemovalAmounts[
      sortedPerRemovalAmounts.length / 2
    ];
    console2.log(
      "Median per-removal amount (ether): ",
      medianPerRemovalAmount / 1 ether
    );
  }
}
