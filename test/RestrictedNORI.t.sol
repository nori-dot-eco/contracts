/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/restricted-nori.sol";
import "@/test/checkout.int.t.sol";
import {RestrictedNORIUtils, Schedule} from "../contracts/RestrictedNORIUtils.sol";

contract RestrictedNORI_initialize is UpgradableRestrictedNORIMock {
  function test() external {
    assertEq(
      _rNori.uri(0),
      "https://nori.com/api/restrictionschedule/{id}.json"
    );
    // todo rest
  }
}

contract RestrictedNORI__linearReleaseAmountAvailable is
  NonUpgradableRestrictedNORIMock
{
  using RestrictedNORIUtils for Schedule;
  uint256 numSchedules;
  mapping(uint256 => Schedule) schedules;

  function test() external {
    uint256 scheduleDuration = 1_000_000;

    Schedule storage schedule = schedules[numSchedules++];
    uint256 blockTimestamp = 10_000_000;
    vm.warp(blockTimestamp);
    schedule.startTime = blockTimestamp - scheduleDuration / 2;
    schedule.endTime = blockTimestamp + scheduleDuration / 2;
    schedule.exists = true;
    uint256 totalSupply = 100 ether;
    assertEq(
      totalSupply / 2,
      schedule._linearReleaseAmountAvailable(totalSupply)
    );
  }
}
