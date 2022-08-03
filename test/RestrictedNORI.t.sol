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
  NonUpgradableRestrictedNORI
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

contract RestrictedNORI_scheduleExists is UpgradeableMarket {
  function setUp() external {
    _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true});
  }

  function test() external {
    assertEq(_rNori.scheduleExists({scheduleId: 1_234_567_890}), true);
  }

  function test_doesntExist() external {
    assertEq(_rNori.scheduleExists({scheduleId: 1}), false);
  }
}

contract RestrictedNORI__validateSchedule is NonUpgradableRestrictedNORI {
  function test_startTimeNotZero() external pure {
    _validateSchedule({startTime: 1, restrictionDuration: 1});
  }
}

contract RestrictedNORI__validateSchedule_reverts is
  NonUpgradableRestrictedNORI
{
  function test_startTimeZero() external {
    vm.expectRevert("rNORI: Invalid start time");
    _validateSchedule({startTime: 0, restrictionDuration: 1});
  }

  function test_restrictionDurationZero() external {
    vm.expectRevert("rNORI: duration not set");
    _validateSchedule({startTime: 1, restrictionDuration: 0});
  }
}
//
// todo createSchedule
// todo _createSchedule
