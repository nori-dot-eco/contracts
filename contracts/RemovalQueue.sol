// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {RemovalIdLib} from "./RemovalIdLib.sol";
import {AddressArrayLib, UInt256ArrayLib} from "./ArrayLib.sol";
import "./Removal.sol";
import "./Errors.sol";

struct RemovalQueueByVintage {
  mapping(uint256 => EnumerableSetUpgradeable.UintSet) queueByVintage;
  uint256 earliestYear;
  uint256 latestYear;
}

// todo rename RemovalQueue to RemovalQueueLib
library RemovalQueue {
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
  using AddressArrayLib for address[];
  using UInt256ArrayLib for uint256[];

  uint256 private constant _DEFAULT_EARLIEST_YEAR = 2**256 - 1;
  uint256 private constant _DEFAULT_LATEST_YEAR = 0;

  /**
   * @notice Inserts a new removal into the queue.
   * @dev The removal is added to the Enumberable Set that maps to the year of its vintage.
   * @param removalQueue the queue from storage.
   * @param removalToInsert a new removal to insert.
   */
  function insertRemovalByVintage(
    RemovalQueueByVintage storage removalQueue,
    uint256 removalToInsert
  ) internal {
    uint256 vintageOfRemoval = RemovalIdLib.vintage(removalToInsert);
    if (isRemovalQueueEmpty(removalQueue)) {
      removalQueue.earliestYear = vintageOfRemoval;
      removalQueue.latestYear = vintageOfRemoval;
    } else if (vintageOfRemoval < removalQueue.earliestYear) {
      removalQueue.earliestYear = vintageOfRemoval;
    } else if (vintageOfRemoval > removalQueue.latestYear) {
      removalQueue.latestYear = vintageOfRemoval;
    }
    if (!removalQueue.queueByVintage[vintageOfRemoval].add(removalToInsert)) {
      revert RemovalAlreadyInQueue({
        removalId: removalToInsert,
        queueVintage: vintageOfRemoval
      });
    }
  }

  /**
   * @notice Removes a removal from the queue.
   * @dev Removes the removal from the Enumerable Set that corresponds to its vintage.
   * @param removalQueue the queue to search through.
   * @param removalToRemove the removal to remove.
   */
  function removeRemoval(
    // todo rename `RemovalQueue.removeRemoval` to `RemovalQueue.remove`
    RemovalQueueByVintage storage removalQueue,
    uint256 removalToRemove
  ) internal {
    uint256 vintageOfRemoval = RemovalIdLib.vintage(removalToRemove);
    if (
      !removalQueue.queueByVintage[vintageOfRemoval].remove(removalToRemove)
    ) {
      revert RemovalNotInQueue({
        removalId: removalToRemove,
        queueVintage: vintageOfRemoval
      });
    }
    // If all removals were removed, check to see if there are any updates to the struct we need to make.
    if (isRemovalQueueEmptyForVintage(removalQueue, vintageOfRemoval)) {
      if (removalQueue.earliestYear == removalQueue.latestYear) {
        // If there was only one year remaining, clear the values for latest and earliest years.
        removalQueue.earliestYear = _DEFAULT_EARLIEST_YEAR;
        removalQueue.latestYear = _DEFAULT_LATEST_YEAR;
      } else if (vintageOfRemoval == removalQueue.earliestYear) {
        // If this was the earliest year, find the new earliest year and update the struct.
        for (
          uint256 currentYear = removalQueue.earliestYear + 1;
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
          uint256 currentYear = removalQueue.latestYear - 1;
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
    uint256 vintage
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
    uint256 vintage
  ) internal view returns (uint256) {
    return removalQueue.queueByVintage[vintage].length();
  }

  /**
   * @notice Gets the total balance of all removals across all vintages.
   *
   * @param removalQueue the queue from storage.
   * @param removal the removal contract.
   * @return totalBalance the total balance of the queue.
   */
  function getTotalBalanceFromRemovalQueue(
    RemovalQueueByVintage storage removalQueue,
    Removal removal
  ) internal view returns (uint256 totalBalance) {
    uint256 latestYear = removalQueue.latestYear;
    for (uint256 year = removalQueue.earliestYear; year <= latestYear; ++year) {
      EnumerableSetUpgradeable.UintSet storage vintagesForYear = removalQueue
        .queueByVintage[year];
      uint256[] memory removalIds = new uint256[](vintagesForYear.length());
      uint256 numberOfRemovals = removalIds.length;
      // Skip overflow check as for loop is indexed starting at zero.
      unchecked {
        for (uint256 i = 0; i < numberOfRemovals; ++i) {
          removalIds[i] = vintagesForYear.at(i);
        }
      }
      totalBalance += removal
      // todo extracting this outside of the loop into a single call would drastically improve performance
        .balanceOfBatch(
          new address[](numberOfRemovals).fill(address(this)),
          removalIds
        )
        .sum();
    }
  }
}
