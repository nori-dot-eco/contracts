// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "../LockedNORIV2.sol";
import "./DSTest/test.sol";

contract LockedNORIV2Helper is DSTest {
  uint256 constant SECONDS_PER_YEAR = 31_536_000;

  function createFixtureGrant(
    address lnori,
    uint256 amount,
    address recipient,
    uint256 startTime,
    uint256 vestEndTime,
    uint256 unlockEndTime,
    uint256 cliff1Time,
    uint256 vestCliff1Amount,
    uint256 unlockCliff1Amount
  ) public {
    LockedNORIV2(lnori).createGrant(
      amount,
      recipient,
      startTime,
      vestEndTime,
      unlockEndTime,
      cliff1Time,
      0,
      vestCliff1Amount,
      0,
      unlockCliff1Amount,
      0
    );
  }

  function createSimplePastGrant(
    address lnori,
    uint256 amount,
    address recipient
  ) public {
    createFixtureGrant(
      lnori,
      amount,
      recipient,
      block.timestamp - SECONDS_PER_YEAR,
      block.timestamp + 1,
      block.timestamp + 1,
      block.timestamp + 1,
      0,
      0
    );
  }

  function assertSimplePastGrant(
    address lnori,
    LockedNORIV2.TokenGrantDetail calldata expectedGrantDetails
  ) public {
    LockedNORIV2.TokenGrantDetail memory actualGrantDetails = LockedNORIV2(
      lnori
    ).getGrant(expectedGrantDetails.recipient);
    assertEq(actualGrantDetails, expectedGrantDetails);
  }

  event logNamedTokenGrant(string, LockedNORIV2.TokenGrantDetail grant);

  function get(address lnori, address recipient)
    public
    view
    returns (LockedNORIV2.TokenGrantDetail memory)
  {
    return LockedNORIV2(lnori).getGrant(recipient);
  }

  function assertEq(
    LockedNORIV2.TokenGrantDetail memory a,
    LockedNORIV2.TokenGrantDetail memory b
  ) internal {
    if (
      a.grantAmount != b.grantAmount ||
      a.recipient != b.recipient ||
      a.startTime != b.startTime ||
      a.vestEndTime != b.vestEndTime ||
      a.unlockEndTime != b.unlockEndTime ||
      a.cliff1Time != b.cliff1Time ||
      a.cliff2Time != b.cliff2Time ||
      a.vestCliff1Amount != b.vestCliff1Amount ||
      a.vestCliff2Amount != b.vestCliff2Amount ||
      a.unlockCliff1Amount != b.unlockCliff1Amount ||
      a.unlockCliff2Amount != b.unlockCliff2Amount
      // not adding runtime state checks here, maybe add?
    ) {
      emit log("Error: a == b not satisfied [TokenGrantDetail]");
      emit logNamedTokenGrant("  Expected", b);
      emit logNamedTokenGrant("    Actual", a);
      fail();
    }
  }
}
