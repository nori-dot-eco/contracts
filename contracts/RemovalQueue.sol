// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import {RemovalUtils} from "./RemovalUtils.sol";
import "solidity-linked-list/contracts/StructuredLinkedList.sol";

library RemovalQueue {
  using RemovalUtils for uint256;
  using StructuredLinkedList for StructuredLinkedList.List;

  /**
   * @notice Inserts a new removal to the queue.
   * @dev The removal is added by order of vintage, such that it will be inserted before the first removal of a greater
   * vintage that is found.
   * @param _removalToInsert new removal to insert
   * @return bool true if success, false otherwise
   */
  function insertByVintage(
    StructuredLinkedList.List storage _queue,
    uint256 _removalToInsert
  ) internal returns (bool) {
    (, , uint256 currentRemoval) = _queue.getNode(0);
    uint256 currentRemovalVintage = currentRemoval.vintage();
    uint256 vintageOfAddedRemoval = _removalToInsert.vintage();
    for (uint256 i = 0; i < _queue.sizeOf(); i++) {
      if (currentRemovalVintage < vintageOfAddedRemoval) {
        (, currentRemoval) = _queue.getNextNode(currentRemoval);
        currentRemovalVintage = currentRemoval.vintage();
      } else {
        // Insert the removal before the first removal we encounter with a greater vintage.
        return _queue.insertBefore(currentRemoval, _removalToInsert);
      }
    }
    // If we've reached the end of the queue, insert the removal after the last removal in the queue.
    return _queue.insertAfter(currentRemoval, _removalToInsert);
  }
}
