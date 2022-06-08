// SPDX-License-Identifier: MIT

pragma solidity =0.8.13;
import {RemovalUtils} from "./RemovalUtils.sol";
import "solidity-linked-list/contracts/StructuredLinkedList.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "./Removal.sol";

struct RemovalQueueByVintage {
  mapping(uint16 => EnumerableSetUpgradeable.UintSet) queueByVintage;
  uint16 earliestYear;
  uint16 latestYear;
}

library RemovalQueue {
  using RemovalUtils for uint256;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  uint16 private constant _DEFAULT_EARLIEST_YEAR = 2**16 - 1;
  uint16 private constant _DEFAULT_LATEST_YEAR = 0;

  /**
   * @notice Inserts a new removal to the queue.
   * @dev The removal is added by order of vintage, such that it will be inserted before the first removal of a greater
   * vintage that is found. If no removal with a greater vintage is found, it will be pushed to the back of the queue.
   * @param removalToInsert new removal to insert
   * @return bool true if success, false otherwise
   */
  function insertRemovalByVintage(
    RemovalQueueByVintage storage removalQueue,
    uint256 removalToInsert
  ) internal returns (bool) {
    uint16 vintageOfRemoval = removalToInsert.vintage();
    if (isRemovalQueueEmpty(removalQueue)) {
      removalQueue.earliestYear = vintageOfRemoval;
      removalQueue.latestYear = vintageOfRemoval;
    } else if (vintageOfRemoval < removalQueue.earliestYear) {
      removalQueue.earliestYear = vintageOfRemoval;
    } else if (vintageOfRemoval > removalQueue.latestYear) {
      removalQueue.latestYear = vintageOfRemoval;
    }
    return removalQueue.queueByVintage[vintageOfRemoval].add(removalToInsert);
  }

  /**
   * @param removalQueue the queue to search through.
   */
  function removeRemoval(
    RemovalQueueByVintage storage removalQueue,
    uint256 removalToRemove
  ) internal returns (bool) {
    uint16 vintageOfRemoval = removalToRemove.vintage();
    require(
      removalQueue.queueByVintage[vintageOfRemoval].remove(removalToRemove),
      "Market: failed to remove correct removal"
    );
    // If all removals were removed, check to see if there are any updates to the struct we need to make.
    if (isRemovalQueueEmptyForVintage(removalQueue, vintageOfRemoval)) {
      if (removalQueue.earliestYear == removalQueue.latestYear) {
        // If there was only one year remaining, clear the values for latest and earliest years.
        removalQueue.earliestYear = _DEFAULT_EARLIEST_YEAR;
        removalQueue.latestYear = _DEFAULT_LATEST_YEAR;
      } else if (vintageOfRemoval == removalQueue.earliestYear) {
        // If this was the earliest year, find the new earliest year and update the struct.
        for (
          uint16 currentYear = removalQueue.earliestYear + 1;
          currentYear <= removalQueue.latestYear;
          currentYear++
        ) {
          if (removalQueue.queueByVintage[currentYear].length() > 0) {
            removalQueue.earliestYear = currentYear;
            break;
          }
        }
      } else if (vintageOfRemoval == removalQueue.latestYear) {
        // If this was the latest year, find the new latest year and update the struct.
        for (
          uint16 currentYear = removalQueue.latestYear - 1;
          currentYear >= removalQueue.earliestYear;
          currentYear--
        ) {
          if (removalQueue.queueByVintage[currentYear].length() > 0) {
            removalQueue.latestYear = currentYear;
            break;
          }
        }
      }
    }
    return true;
  }

  function isRemovalQueueEmpty(RemovalQueueByVintage storage removalQueue)
    internal
    view
    returns (bool)
  {
    return removalQueue.latestYear == _DEFAULT_LATEST_YEAR;
  }

  function isRemovalQueueEmptyForVintage(
    RemovalQueueByVintage storage removalQueue,
    uint16 vintage
  ) internal view returns (bool) {
    return getSizeOfQueueForVintage(removalQueue, vintage) == 0;
  }

  /**
   * @param removalQueue the queue to search through.
   */
  function getNextRemovalForSale(RemovalQueueByVintage storage removalQueue)
    internal
    view
    returns (uint256)
  {
    return removalQueue.queueByVintage[removalQueue.earliestYear].at(0);
  }

  function getSizeOfQueueForVintage(
    RemovalQueueByVintage storage removalQueue,
    uint16 vintage
  ) internal view returns (uint256) {
    return removalQueue.queueByVintage[vintage].length();
  }

  function getTotalBalanceFromRemovalQueue(
    RemovalQueueByVintage storage removalQueue,
    Removal removal
  ) internal view returns (uint256) {
    uint256 size = 0;
    uint256 i = 0;
    uint256 totalBalance = 0;
    uint256 currentRemoval;
    for (
      uint16 currentYear = removalQueue.earliestYear;
      currentYear <= removalQueue.latestYear;
      currentYear++
    ) {
      size = removalQueue.queueByVintage[currentYear].length();
      for (i = 0; i < size; i++) {
        currentRemoval = removalQueue.queueByVintage[currentYear].at(i);
        totalBalance += removal.balanceOf(address(this), currentRemoval);
      }
    }
    return totalBalance;
  }
}
