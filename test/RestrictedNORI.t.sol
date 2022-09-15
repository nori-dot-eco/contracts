/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
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

contract RestrictedNORI_linearReleaseAmountAvailable is
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
    totalSupplyValue = 100 ether;
  }

  function test() external {
    assertEq(
      totalSupplyValue / 2,
      schedules[scheduleKey].linearReleaseAmountAvailable(totalSupplyValue)
    );
  }
}

contract RestrictedNORI_createSchedule is UpgradeableMarket {
  uint256[] removalIds;

  function setUp() external {
    removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false
    });
  }

  function test() external {
    uint256 projectId = _removal.getProjectId(removalIds[0]);
    vm.expectRevert(abi.encodeWithSelector(ScheduleExists.selector, projectId));
    _rNori.createSchedule({
      projectId: projectId,
      startTime: 999_999_999,
      methodology: 2,
      methodologyVersion: 1
    });
  }
}

contract RestrictedNORI_scheduleExists is UpgradeableMarket {
  function setUp() external {
    _seedRemovals({to: _namedAccounts.supplier, count: 1, list: false});
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

contract RestrictedNORI_revokeUnreleasedTokens is UpgradeableMarket {
  uint256[] private _removalIds;
  uint256 holdbackPercentage = 50;
  uint256 projectId = 1_234_567_890;

  function setUp() external {
    // setup creates removals for 3 different suppliers but uses the same project ID for each removal
    // When sold, this will result in an rNori schedule that has 3 different token holders.
    address[3] memory suppliers = [
      _namedAccounts.supplier,
      _namedAccounts.supplier2,
      _namedAccounts.supplier3
    ];
    for (uint256 i = 0; i < suppliers.length; i++) {
      uint256[] memory localRemovalIds = _seedRemovals({
        to: suppliers[i],
        count: 1,
        list: true
      });
      _removalIds.push(localRemovalIds[0]);
    }
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey); // todo checkout helper function that accepts pk
    uint256 checkoutTotal = _market.calculateCheckoutTotal(3 ether); // todo replace other test usage of _market.calculateNoriFee
    vm.prank(_namedAccounts.admin); // todo investigate why this is the only time we need to prank the admin
    _bpNori.deposit(owner, abi.encode(checkoutTotal));
    SignedPermit memory signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      checkoutTotal,
      1 days,
      _bpNori
    );
    vm.prank(owner);
    _market.swap(
      owner,
      checkoutTotal,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
  }

  function test() external {
    _rNori.revokeUnreleasedTokens(projectId, 1 ether, _namedAccounts.admin);
  }
}

//
// todo createSchedule
// todo _createSchedule
