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
   * @param _removalToInsert new removal to insert
   * @return bool true if success, false otherwise
   */
  function insertRemovalByVintage(
    RemovalQueueByVintage storage _removalQueue,
    uint256 _removalToInsert
  ) internal returns (bool) {
    uint16 vintageOfRemoval = _removalToInsert.vintage();
    if (isRemovalQueueEmpty(_removalQueue)) {
      _removalQueue.earliestYear = vintageOfRemoval;
      _removalQueue.latestYear = vintageOfRemoval;
    } else if (vintageOfRemoval < _removalQueue.earliestYear) {
      _removalQueue.earliestYear = vintageOfRemoval;
    } else if (vintageOfRemoval > _removalQueue.latestYear) {
      _removalQueue.latestYear = vintageOfRemoval;
    }
    return _removalQueue.queueByVintage[vintageOfRemoval].add(_removalToInsert);
  }

  /**
   * @param _removalQueue the queue to search through.
   */
  function removeRemoval(
    RemovalQueueByVintage storage _removalQueue,
    uint256 _removalToRemove
  ) internal returns (bool) {
    uint16 vintageOfRemoval = _removalToRemove.vintage();
    require(
      _removalQueue.queueByVintage[vintageOfRemoval].remove(_removalToRemove) ==
        true,
      "Market: failed to remove correct removal"
    );
    // If all removals were removed, check to see if there are any updates to the struct we need to make.
    if (isRemovalQueueEmptyForVintage(_removalQueue, vintageOfRemoval)) {
      if (_removalQueue.earliestYear == _removalQueue.latestYear) {
        // If there was only one year remaining, clear the values for latest and earliest years.
        _removalQueue.earliestYear = _DEFAULT_EARLIEST_YEAR;
        _removalQueue.latestYear = _DEFAULT_LATEST_YEAR;
      } else if (vintageOfRemoval == _removalQueue.earliestYear) {
        // If this was the earliest year, find the new earliest year and update the struct.
        for (
          uint16 currentYear = _removalQueue.earliestYear + 1;
          currentYear <= _removalQueue.latestYear;
          currentYear++
        ) {
          if (_removalQueue.queueByVintage[currentYear].length() > 0) {
            _removalQueue.earliestYear = currentYear;
            break;
          }
        }
      } else if (vintageOfRemoval == _removalQueue.latestYear) {
        // If this was the latest year, find the new latest year and update the struct.
        for (
          uint16 currentYear = _removalQueue.latestYear - 1;
          currentYear >= _removalQueue.earliestYear;
          currentYear--
        ) {
          if (_removalQueue.queueByVintage[currentYear].length() > 0) {
            _removalQueue.latestYear = currentYear;
            break;
          }
        }
      }
    }
    return true;
  }

  function isRemovalQueueEmpty(RemovalQueueByVintage storage _removalQueue)
    internal
    view
    returns (bool)
  {
    return _removalQueue.latestYear == _DEFAULT_LATEST_YEAR;
  }

  function isRemovalQueueEmptyForVintage(
    RemovalQueueByVintage storage _removalQueue,
    uint16 vintage
  ) internal view returns (bool) {
    return _removalQueue.queueByVintage[vintage].length() == 0;
  }

  /**
   * @param _removalQueue the queue to search through.
   */
  function getNextRemovalForSale(RemovalQueueByVintage storage _removalQueue)
    internal
    view
    returns (uint256)
  {
    return _removalQueue.queueByVintage[_removalQueue.earliestYear].at(0);
  }

  function getSizeOfQueueForVintage(
    RemovalQueueByVintage storage _removalQueue,
    uint16 vintage
  ) internal view returns (uint256) {
    return _removalQueue.queueByVintage[vintage].length();
  }

  function getSizeOfRemovalQueue(RemovalQueueByVintage storage _removalQueue)
    internal
    view
    returns (uint256)
  {
    uint256 size = 0;
    for (
      uint16 currentYear = _removalQueue.earliestYear;
      currentYear <= _removalQueue.latestYear;
      currentYear++
    ) {
      size += _removalQueue.queueByVintage[currentYear].length();
    }
    return size;
  }

  function getTotalBalanceFromRemovalQueue(
    RemovalQueueByVintage storage _removalQueue,
    Removal _removal
  ) internal view returns (uint256) {
    uint256 size = 0;
    uint256 i = 0;
    uint256 totalBalance = 0;
    uint256 currentRemoval;
    for (
      uint16 currentYear = _removalQueue.earliestYear;
      currentYear <= _removalQueue.latestYear;
      currentYear++
    ) {
      size = _removalQueue.queueByVintage[currentYear].length();
      for (i = 0; i < size; i++) {
        currentRemoval = _removalQueue.queueByVintage[currentYear].at(i);
        totalBalance += _removal.balanceOf(address(this), currentRemoval);
      }
    }
    return totalBalance;
  }
}
