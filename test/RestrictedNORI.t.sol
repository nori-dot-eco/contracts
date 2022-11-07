/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/restricted-nori.sol";
import "@/test/checkout.int.t.sol";

/** @dev Test correct claimable balance after claiming claimable then transferring remaining tokens, single holder */
contract RestrictedNORI_withdrawFromSchedule_claimableBalancePostTransferSingleHolder is
  UpgradeableMarket
{
  uint256[] removalIds;
  uint256 scheduleId = 1;
  uint256 removalId;

  using UInt256ArrayLib for uint256[];

  function setUp() external {
    DecodedRemovalIdV0[] memory ids = new DecodedRemovalIdV0[](1);
    ids[0] = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier + 1
    });
    removalId = RemovalIdLib.createRemovalId(ids[0]);

    _removal.grantRole(_removal.CONSIGNOR_ROLE(), address(this));
    _removal.mintBatch({
      to: _namedAccounts.supplier,
      amounts: new uint256[](1).fill(1 ether),
      removals: ids,
      projectId: scheduleId,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });

    _rNori.grantRole(_rNori.MINTER_ROLE(), address(this));
    _bpNori.grantRole(_bpNori.DEPOSITOR_ROLE(), address(this));
    _bpNori.deposit(address(_rNori), abi.encode(1 ether));
  }

  /** @dev Test that after a holder claims all claimable tokens and then transfers remaining schedule balance to
   * a new account, the new account cannot claim any additional tokens.
   */
  function testClaimableAmountAfterFullWithdrawalThenTransfer() external {
    uint256 blockTimestamp = 1000;
    vm.warp(blockTimestamp);

    // only 1 supplier in schedule
    _rNori.mint(1000, removalId);

    vm.warp(blockTimestamp + 31_556_952); // 315_569_520 == 10 year, 31_556_952 == 1 year
    uint256 startTotalSupply = _rNori.totalSupply(scheduleId);

    uint256 claimable = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      _namedAccounts.supplier
    );
    uint256 claimableForSchedule = _rNori.claimableBalanceForSchedule(
      scheduleId
    );
    assertEq(claimable, 100);
    assertEq(claimableForSchedule, 100);

    vm.startPrank(_namedAccounts.supplier);
    _rNori.withdrawFromSchedule(_namedAccounts.supplier, scheduleId, claimable);
    claimable = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      _namedAccounts.supplier
    );
    claimableForSchedule = _rNori.claimableBalanceForSchedule(scheduleId);
    assertEq(claimable, 0);
    assertEq(claimableForSchedule, 0);

    address newSupplier = address(uint160(100));
    _rNori.safeTransferFrom(
      _namedAccounts.supplier,
      newSupplier,
      scheduleId,
      _rNori.balanceOf(_namedAccounts.supplier, scheduleId),
      ""
    );
    vm.stopPrank();

    claimable = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      newSupplier
    );
    assertEq(claimable, 0);

    vm.prank(newSupplier);
    vm.expectRevert(
      abi.encodeWithSelector(
        InsufficientClaimableBalance.selector,
        newSupplier,
        scheduleId
      )
    );
    _rNori.withdrawFromSchedule(_namedAccounts.supplier, scheduleId, 90);

    uint256 endTotalSupply = _rNori.totalSupply(scheduleId);
    assertEq(endTotalSupply, startTotalSupply - 100);
  }

  /** @dev Test that after a holder claims most of the claimable tokens and then transfers remaining schedule balance to
   * a new account, the new account can only claim the remaining claimable tokens and the original account cannot claim
   * any additional tokens.
   */
  function testClaimableAmountAfterMajorityWithdrawalThenTransfer() external {
    uint256 blockTimestamp = 1000;
    vm.warp(blockTimestamp);

    // only 1 supplier in schedule
    _rNori.mint(1000, removalId);

    vm.warp(blockTimestamp + 31_556_952); // 315_569_520 == 10 year, 31_556_952 == 1 year
    uint256 startTotalSupply = _rNori.totalSupply(scheduleId);

    uint256 claimable = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      _namedAccounts.supplier
    );
    uint256 claimableForSchedule = _rNori.claimableBalanceForSchedule(
      scheduleId
    );
    assertEq(claimable, 100);
    assertEq(claimableForSchedule, 100);

    vm.startPrank(_namedAccounts.supplier);
    _rNori.withdrawFromSchedule(_namedAccounts.supplier, scheduleId, 80);
    claimable = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      _namedAccounts.supplier
    );
    claimableForSchedule = _rNori.claimableBalanceForSchedule(scheduleId);
    assertEq(claimable, 20);
    assertEq(claimableForSchedule, 20);

    address newSupplier = address(uint160(100));
    _rNori.safeTransferFrom(
      _namedAccounts.supplier,
      newSupplier,
      scheduleId,
      500, // half of schedule total
      ""
    );
    vm.stopPrank();
    uint256 claimableForNewSupplier = _rNori
      .claimableBalanceForScheduleForAccount(scheduleId, newSupplier);
    assertEq(claimableForNewSupplier, 20);

    uint256 claimableForOriginalSupplier = _rNori
      .claimableBalanceForScheduleForAccount(
        scheduleId,
        _namedAccounts.supplier
      );
    assertEq(claimableForOriginalSupplier, 0);
  }

  /** @dev Test that when a holder withdraws half of the claimable tokens, and then transfers half of the
   * schedule balance to a new account, the new account can claim the remaining tokens and the original
   * account cannot claim any additional tokens.
   */
  function testClaimableAmountAfterHalfWithdrawalThenTransfer() external {
    uint256 blockTimestamp = 1000;
    vm.warp(blockTimestamp);

    // only 1 supplier in schedule
    _rNori.mint(1000, removalId);

    vm.warp(blockTimestamp + 31_556_952); // 315_569_520 == 10 year, 31_556_952 == 1 year
    uint256 startTotalSupply = _rNori.totalSupply(scheduleId);

    uint256 claimable = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      _namedAccounts.supplier
    );
    uint256 claimableForSchedule = _rNori.claimableBalanceForSchedule(
      scheduleId
    );
    assertEq(claimable, 100);
    assertEq(claimableForSchedule, 100);

    vm.startPrank(_namedAccounts.supplier);
    _rNori.withdrawFromSchedule(_namedAccounts.supplier, scheduleId, 50);
    claimable = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      _namedAccounts.supplier
    );
    claimableForSchedule = _rNori.claimableBalanceForSchedule(scheduleId);
    assertEq(claimable, 50);
    assertEq(claimableForSchedule, 50);

    address newSupplier = address(uint160(100));
    _rNori.safeTransferFrom(
      _namedAccounts.supplier,
      newSupplier,
      scheduleId,
      500, // half of the schedule total
      ""
    );
    vm.stopPrank();

    uint256 claimableForNewSupplier = _rNori
      .claimableBalanceForScheduleForAccount(scheduleId, newSupplier);
    assertEq(claimableForNewSupplier, 50);

    uint256 claimableForOriginalSupplier = _rNori
      .claimableBalanceForScheduleForAccount(
        scheduleId,
        _namedAccounts.supplier
      );
    assertEq(claimableForOriginalSupplier, 0);

    vm.prank(newSupplier);
    _rNori.withdrawFromSchedule(newSupplier, scheduleId, 50);

    uint256 endTotalSupply = _rNori.totalSupply(scheduleId);
    assertEq(endTotalSupply, startTotalSupply - 100);
  }

  /** @dev Test that when an original holder claims a small amount of claimable tokens, and then transfers
   * half of the schedule balance to a new account, the new account can claim their proportion of the claimable
   * tokens, and the original holder can still claim their remaining portion of claimable tokens.
   */
  function testClaimableAmountAfterSmallWithdrawalThenTransfer() external {
    uint256 blockTimestamp = 1000;
    vm.warp(blockTimestamp);

    // only 1 supplier in schedule
    _rNori.mint(1000, removalId);

    vm.warp(blockTimestamp + 31_556_952); // 315_569_520 == 10 year, 31_556_952 == 1 year
    uint256 startTotalSupply = _rNori.totalSupply(scheduleId);

    uint256 claimable = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      _namedAccounts.supplier
    );
    uint256 claimableForSchedule = _rNori.claimableBalanceForSchedule(
      scheduleId
    );
    assertEq(claimable, 100);
    assertEq(claimableForSchedule, 100);

    vm.startPrank(_namedAccounts.supplier);
    _rNori.withdrawFromSchedule(_namedAccounts.supplier, scheduleId, 10);
    claimable = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      _namedAccounts.supplier
    );
    claimableForSchedule = _rNori.claimableBalanceForSchedule(scheduleId);
    assertEq(claimable, 90);
    assertEq(claimableForSchedule, 90);

    address newSupplier = address(uint160(100));
    _rNori.safeTransferFrom(
      _namedAccounts.supplier,
      newSupplier,
      scheduleId,
      500, // half of the schedule total
      ""
    );
    vm.stopPrank();

    uint256 claimableForNewSupplier = _rNori
      .claimableBalanceForScheduleForAccount(scheduleId, newSupplier);
    assertEq(claimableForNewSupplier, 50); // only their portion is claimable even though 90 is total claimable

    uint256 claimableForOriginalSupplier = _rNori
      .claimableBalanceForScheduleForAccount(
        scheduleId,
        _namedAccounts.supplier
      );
    assertEq(claimableForOriginalSupplier, 40); // original supplier can still claim the remainder of their new proportion
  }

  /** @dev Test that when an original holder makes no withdrawal, and then transfers
   * all of the schedule balance to a new account, the new account can claim all claimable tokens.
   */
  function testClaimableAmountAfterNoWithdrawalThenTransfer() external {
    uint256 blockTimestamp = 1000;
    vm.warp(blockTimestamp);

    // only 1 supplier in schedule
    _rNori.mint(1000, removalId);

    vm.warp(blockTimestamp + 31_556_952); // 315_569_520 == 10 year, 31_556_952 == 1 year
    uint256 startTotalSupply = _rNori.totalSupply(scheduleId);

    uint256 claimable = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      _namedAccounts.supplier
    );
    uint256 claimableForSchedule = _rNori.claimableBalanceForSchedule(
      scheduleId
    );
    assertEq(claimable, 100);
    assertEq(claimableForSchedule, 100);

    vm.startPrank(_namedAccounts.supplier);
    address newSupplier = address(uint160(100));
    _rNori.safeTransferFrom(
      _namedAccounts.supplier,
      newSupplier,
      scheduleId,
      _rNori.balanceOf(_namedAccounts.supplier, scheduleId),
      ""
    );
    vm.stopPrank();

    uint256 claimableForNewSupplier = _rNori
      .claimableBalanceForScheduleForAccount(scheduleId, newSupplier);
    assertEq(claimableForNewSupplier, 100);

    uint256 claimableForOriginalSupplier = _rNori
      .claimableBalanceForScheduleForAccount(
        scheduleId,
        _namedAccounts.supplier
      );
    assertEq(claimableForOriginalSupplier, 0);
  }
}

/** @dev Test correct claimable balance after claiming claimable then transferring remaining tokens, multiple holders */
contract RestrictedNORI_withdrawFromSchedule_claimableBalancePostTransferMultipleHolders is
  UpgradeableMarket
{
  uint256[] removalIds;
  uint256 scheduleId = 1;
  uint256 removalId;
  uint256 removalId2;
  uint256 removalId3;

  using UInt256ArrayLib for uint256[];

  function setUp() external {
    DecodedRemovalIdV0[] memory ids = new DecodedRemovalIdV0[](1);
    ids[0] = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier + 1
    });
    removalId = RemovalIdLib.createRemovalId(ids[0]);

    _removal.grantRole(_removal.CONSIGNOR_ROLE(), address(this));
    _removal.mintBatch({
      to: _namedAccounts.supplier,
      amounts: new uint256[](1).fill(1 ether),
      removals: ids,
      projectId: scheduleId,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });

    DecodedRemovalIdV0[] memory ids2 = new DecodedRemovalIdV0[](1);
    ids2[0] = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier2,
      subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier + 1
    });
    removalId2 = RemovalIdLib.createRemovalId(ids2[0]);

    _removal.mintBatch({
      to: _namedAccounts.supplier2,
      amounts: new uint256[](1).fill(1 ether),
      removals: ids2,
      projectId: scheduleId,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });

    DecodedRemovalIdV0[] memory ids3 = new DecodedRemovalIdV0[](1);
    ids3[0] = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier3,
      subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier + 1
    });
    removalId3 = RemovalIdLib.createRemovalId(ids3[0]);

    _removal.mintBatch({
      to: _namedAccounts.supplier3,
      amounts: new uint256[](1).fill(1 ether),
      removals: ids3,
      projectId: scheduleId,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });

    _rNori.grantRole(_rNori.MINTER_ROLE(), address(this));
    _bpNori.grantRole(_bpNori.DEPOSITOR_ROLE(), address(this));
    _bpNori.deposit(address(_rNori), abi.encode(1 ether));
  }

  function testClaimableAmountWithMultipleSuppliers() external {
    uint256 blockTimestamp = 1000;
    vm.warp(blockTimestamp);

    _rNori.mint(1000, removalId);
    _rNori.mint(8000, removalId2);
    _rNori.mint(1000, removalId3);

    vm.warp(blockTimestamp + 31_556_952); // 315_569_520 == 10 year, 31_556_952 == 1 year
    uint256 startTotalSupply = _rNori.totalSupply(scheduleId);

    uint256 claimableForSupplier1 = _rNori
      .claimableBalanceForScheduleForAccount(
        scheduleId,
        _namedAccounts.supplier
      );
    uint256 claimableForSchedule = _rNori.claimableBalanceForSchedule(
      scheduleId
    );
    assertEq(claimableForSupplier1, 100);
    assertEq(claimableForSchedule, 1000);

    vm.startPrank(_namedAccounts.supplier);
    _rNori.withdrawFromSchedule(_namedAccounts.supplier, scheduleId, 80);
    claimableForSupplier1 = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      _namedAccounts.supplier
    );
    claimableForSchedule = _rNori.claimableBalanceForSchedule(scheduleId);
    assertEq(claimableForSupplier1, 20);
    assertEq(claimableForSchedule, 920);

    address newSupplier = address(uint160(100));
    _rNori.safeTransferFrom(
      _namedAccounts.supplier,
      newSupplier,
      scheduleId,
      500, // half of supplier 1's balance
      ""
    );
    vm.stopPrank();

    claimableForSupplier1 = _rNori.claimableBalanceForScheduleForAccount(
      scheduleId,
      _namedAccounts.supplier
    );

    uint256 claimableForNewSupplier = _rNori
      .claimableBalanceForScheduleForAccount(scheduleId, newSupplier);
    claimableForSchedule = _rNori.claimableBalanceForSchedule(scheduleId);
    assertEq(claimableForSupplier1, 0);
    assertEq(claimableForNewSupplier, 20);
    assertEq(claimableForSchedule, 920);
  }
}

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
