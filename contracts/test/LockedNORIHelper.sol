// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "../LockedNORI.sol";

contract LockedNORIHelper {
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
    LockedNORI(lnori).createGrant(
      amount,
      recipient,
      startTime,
      vestEndTime,
      unlockEndTime,
      cliff1Time,
      cliff1Time,
      vestCliff1Amount,
      0,
      unlockCliff1Amount,
      0
    );
  }

  function encodeGrantCreationParams(
    address recipient,
    uint256 startTime,
    uint256 vestEndTime,
    uint256 unlockEndTime,
    uint256 cliff1Time,
    uint256 cliff2Time,
    uint256 vestCliff1Amount,
    uint256 vestCliff2Amount,
    uint256 unlockCliff1Amount,
    uint256 unlockCliff2Amount
  ) public pure returns (bytes memory) {
    return
      abi.encode(
        recipient,
        startTime,
        vestEndTime,
        unlockEndTime,
        cliff1Time,
        cliff2Time,
        vestCliff1Amount,
        vestCliff2Amount,
        unlockCliff1Amount,
        unlockCliff2Amount
      );
  }

  function createSimpleGrant(
    address lnori,
    uint256 amount,
    address recipient,
    uint256 fromTime
  ) public {
    createFixtureGrant(
      lnori,
      amount,
      recipient,
      fromTime,
      fromTime + 365 days,
      fromTime + 365 days,
      fromTime,
      0,
      0
    );
  }

  function createSimpleGrantFromNow(
    address lnori,
    uint256 amount,
    address recipient
  ) public {
    createSimpleGrant(lnori, amount, recipient, block.timestamp + 1 hours);
  }

  // Encodes creation data for a grant with no cliff over 365 days from `fromTime`
  function getSimpleGrantCreationParamsEncoded(
    address recipient,
    uint256 fromTime
  ) public pure returns (bytes memory) {
    return
      encodeGrantCreationParams(
        recipient,
        fromTime,
        fromTime + 365 days,
        fromTime + 365 days,
        fromTime,
        fromTime,
        0,
        0,
        0,
        0
      );
  }

  function assertSimplePastGrant(
    address lnori,
    LockedNORI.TokenGrantDetail calldata expectedGrantDetails
  ) public view {
    LockedNORI.TokenGrantDetail memory actualGrantDetails = LockedNORI(lnori)
      .getGrant(expectedGrantDetails.recipient);
    assertEq(actualGrantDetails, expectedGrantDetails);
  }

  event logNamedTokenGrant(string, LockedNORI.TokenGrantDetail grant);

  function get(address lnori, address recipient)
    public
    view
    returns (LockedNORI.TokenGrantDetail memory)
  {
    return LockedNORI(lnori).getGrant(recipient);
  }

  function assertEq(
    LockedNORI.TokenGrantDetail memory a,
    LockedNORI.TokenGrantDetail memory b
  ) internal pure {
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
      revert("Error: a == b not satisfied [TokenGrantDetail]");
    }
  }
}
