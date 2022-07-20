/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/restricted-nori.sol";
import "@/test/checkout.int.t.sol";

contract RestrictedNORI_initialize is UpgradableRestrictedNORI {
  function test() external {
    assertEq(
      _rNori.uri(0),
      "https://nori.com/api/restrictionschedule/{id}.json"
    );
  }
}

contract RestrictedNORI__linearReleaseAmountAvailable is
  NonUpgradableRestrictedNORIMock
{
  using RestrictedNORILib for Schedule;
  uint256 scheduleKey = 0;
  uint256 totalSupplyValue;
  mapping(uint256 => Schedule) schedules;

  function setUp() external {
    uint256 scheduleDuration = 1_000_000;

    Schedule storage schedule = schedules[scheduleKey];
    uint256 blockTimestamp = 10_000_000;
    vm.warp(blockTimestamp);
    schedule.startTime = blockTimestamp - scheduleDuration / 2;
    schedule.endTime = blockTimestamp + scheduleDuration / 2;
    schedule.exists = true;
    totalSupplyValue = 100 ether;
  }

  function test() external {
    assertEq(
      totalSupplyValue / 2,
      schedules[scheduleKey]._linearReleaseAmountAvailable(totalSupplyValue)
    );
  }
}
