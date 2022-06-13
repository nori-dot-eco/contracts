// SPDX-License-Identifier: MIT

pragma solidity =0.8.13;
import {RemovalUtils} from "./RemovalUtils.sol";
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
   * @notice Inserts a new removal into the queue.
   * @dev The removal is added to the Enumberable Set that maps to the year of its vintage.
   * @param removalToInsert a new removal to insert.
   * @return bool true if success, false otherwise.
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
   * @notice Removes a removal from the queue.
   * @dev Removes the removal from the Enumerable Set that corresponds to its vintage.
   * @param removalQueue the queue to search through.
   * @param removalToRemove the removal to remove.
   * @return bool true if success, false otherwise.
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

  /**
   * @notice Checks if the queue is empty across all vintages.
   * @dev Uses the latestYear property to check if any vintages have been set.
   * @param removalQueue the queue from storage.
   * @return bool true if empty, false otherwise.
   */
  function isRemovalQueueEmpty(RemovalQueueByVintage storage removalQueue)
    internal
    view
    returns (bool)
  {
    return removalQueue.latestYear == _DEFAULT_LATEST_YEAR;
  }

  /**
   * @notice Checks if the queue is empty for a particular vintage.
   * @param removalQueue the queue from storage.
   * @param vintage the vintage to check.
   * @return bool true if empty, false otherwise.
   */
  function isRemovalQueueEmptyForVintage(
    RemovalQueueByVintage storage removalQueue,
    uint16 vintage
  ) internal view returns (bool) {
    return getSizeOfQueueForVintage(removalQueue, vintage) == 0;
  }

  /**
   * @notice Gets the next removal in the queue for sale.
   * @dev Gets the first item from the Enumerable Set that corresponds to the earliest vintage.
   * @param removalQueue the queue from storage.
   * @return uint256 the removal for sale.
   */
  function getNextRemovalForSale(RemovalQueueByVintage storage removalQueue)
    internal
    view
    returns (uint256)
  {
    return removalQueue.queueByVintage[removalQueue.earliestYear].at(0);
  }

  /**
   * @notice Gets the size of the queue for a particular vintage.
   * @dev Gets the size of the Enumerable Set that corresponds to the given vintage.
   * @param removalQueue the queue from storage.
   * @param vintage the vintage to check.
   * @return uint256 the size of the queue.
   */
  function getSizeOfQueueForVintage(
    RemovalQueueByVintage storage removalQueue,
    uint16 vintage
  ) internal view returns (uint256) {
    return removalQueue.queueByVintage[vintage].length();
  }

  /**
   * @notice Gets the total balance of all removals across all vintages.
   * @dev Gets the size of the Enumerable Set that corresponds to the given vintage.
   * @param removalQueue the queue from storage.
   * @param removal the removal contract.
   * @return uint256 the total balance of the queue.
   */
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
        totalBalance += removal.balanceOf(address(this), currentRemoval); // TODO: Use batch get for balanceOf
      }
    }
    return totalBalance;
  }
}
