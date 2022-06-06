// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import {RemovalUtils} from "./RemovalUtils.sol";

struct Queue {
  uint256 length;
  mapping(uint256 => mapping(bool => uint256)) queue;
}

library RemovalQueue {
  using RemovalUtils for uint256;

  uint256 private constant _NULL = 0;
  uint256 private constant _FIRST_REMOVAL = 0;
  bool private constant _PREVIOUS_REMOVAL = false;
  bool private constant _NEXT_REMOVAL = true;

  /**
   * @dev Insert removal `_removalToInsert` beside existing removal `_removal` in direction `_NEXT`.
   * @param self queue from storage
   * @param _removal existing removal
   * @param _removalToInsert  new removal to insert
   * @return bool true if success, false otherwise
   */
  function insertAfter(
    Queue storage self,
    uint256 _removal,
    uint256 _removalToInsert
  ) internal returns (bool) {
    return _insert(self, _removal, _removalToInsert, _NEXT_REMOVAL);
  }

  /**
   * @dev Insert removal `_removalToInsert` beside existing removal `_removal` in direction `_PREV`.
   * @param self queue from storage
   * @param _removal existing removal
   * @param _removalToInsert  new removal to insert
   * @return bool true if success, false otherwise
   */
  function insertBefore(
    Queue storage self,
    uint256 _removal,
    uint256 _removalToInsert
  ) internal returns (bool) {
    return _insert(self, _removal, _removalToInsert, _PREVIOUS_REMOVAL);
  }

  /**
   * @notice Inserts a new removal to the queue.
   * @dev The removal is added by order of vintage, such that it will be inserted before the first removal of a greater
   * vintage that is found.
   * @param self queue from storage
   * @param _removalToInsert  new removal to insert
   * @return bool true if success, false otherwise
   */
  function insert(Queue storage self, uint256 _removalToInsert)
    internal
    returns (bool)
  {
    uint256 currentRemoval = _FIRST_REMOVAL;
    uint256 currentRemovalVintage = _FIRST_REMOVAL.vintage();
    uint256 vintageOfAddedRemoval = _removalToInsert.vintage();
    for (uint256 i = 0; i < getLength(self); i++) {
      if (currentRemovalVintage < vintageOfAddedRemoval) {
        (, currentRemoval) = getNextRemoval(self, currentRemoval);
        currentRemovalVintage = currentRemoval.vintage();
      } else {
        // Insert the removal before the first removal we encounter with a greater vintage.
        return insertBefore(self, currentRemoval, _removalToInsert);
      }
    }
    // If we've reached the end of the queue, insert the removal after the last removal in the queue.
    return insertAfter(self, currentRemoval, _removalToInsert);
  }

  /**
   * @dev Removes an entry from the  queue
   * @param self queue from storage
   * @param _removal removal to remove from the queue
   * @return uint256 the removed removal
   */
  function remove(Queue storage self, uint256 _removal)
    internal
    returns (uint256)
  {
    if ((_removal == _NULL) || (!isRemovalInQueue(self, _removal))) {
      return 0;
    }
    _createLink(
      self,
      self.queue[_removal][_PREVIOUS_REMOVAL],
      self.queue[_removal][_NEXT_REMOVAL],
      _NEXT_REMOVAL
    );
    delete self.queue[_removal][_PREVIOUS_REMOVAL];
    delete self.queue[_removal][_NEXT_REMOVAL];

    self.length -= 1; // NOT: SafeMath library should be used here to decrement.

    return _removal;
  }

  /**
   * @dev Pops the first entry from the head of the queue
   * @param self queue from storage
   * @return uint256 the removed removal
   */
  function popFront(Queue storage self) internal returns (uint256) {
    return _pop(self, _NEXT_REMOVAL);
  }

  /**
   * @dev Checks if the queue exists
   * @param self queue from storage
   * @return bool true if queue exists, false otherwise
   */
  function isQueueEmpty(Queue storage self) internal view returns (bool) {
    // if the head removals previous or next pointers both point to itself, then there are no items in the queue
    if (
      self.queue[_FIRST_REMOVAL][_PREVIOUS_REMOVAL] != _FIRST_REMOVAL ||
      self.queue[_FIRST_REMOVAL][_NEXT_REMOVAL] != _FIRST_REMOVAL
    ) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * @dev Checks if the removal exists
   * @param self stored  queue from contract
   * @param _removal a removal to search for
   * @return bool true if removal exists, false otherwise
   */
  function isRemovalInQueue(Queue storage self, uint256 _removal)
    internal
    view
    returns (bool)
  {
    if (
      self.queue[_removal][_PREVIOUS_REMOVAL] == _FIRST_REMOVAL &&
      self.queue[_removal][_NEXT_REMOVAL] == _FIRST_REMOVAL
    ) {
      if (self.queue[_FIRST_REMOVAL][_NEXT_REMOVAL] == _removal) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  /**
   * @dev Returns the number of removals in the queue
   * @param self queue from storage
   * @return uint256
   */
  function getLength(Queue storage self) internal view returns (uint256) {
    return self.length;
  }

  /**
   * @dev Returns the link of a removal `_removal` in direction `_direction`.
   * @param self queue from storage
   * @param _removal id of the removal to step from
   * @param _direction direction to step in
   * @return bool, uint256 true if removal exists or false otherwise, removal in _direction
   */
  function getAdjacent(
    Queue storage self,
    uint256 _removal,
    bool _direction
  ) internal view returns (bool, uint256) {
    if (!isRemovalInQueue(self, _removal)) {
      return (false, 0);
    } else {
      return (true, self.queue[_removal][_direction]);
    }
  }

  /**
   * @dev Returns the link of a removal `_removal` in direction `_NEXT_REMOVAL`.
   * @param self queue from storage
   * @param _removal id of the removal to step from
   * @return bool, uint256 true if removal exists or false otherwise, next removal
   */
  function getNextRemoval(Queue storage self, uint256 _removal)
    internal
    view
    returns (bool, uint256)
  {
    return getAdjacent(self, _removal, _NEXT_REMOVAL);
  }

  /**
   * @dev Returns the link of a removal `_removal` in direction `_PREVIOUS_REMOVAL`.
   * @param self queue from storage
   * @param _removal id of the removal to step from
   * @return bool, uint256 true if removal exists or false otherwise, previous removal
   */
  function getPreviousRemoval(Queue storage self, uint256 _removal)
    internal
    view
    returns (bool, uint256)
  {
    return getAdjacent(self, _removal, _PREVIOUS_REMOVAL);
  }

  /**
   * @dev Pops the first entry from the  queue
   * @param self queue from storage
   * @param _direction pop from the head (_NEXT_REMOVAL) or the tail (_PREVIOUS_REMOVAL)
   * @return uint256 the removed removal
   */
  function _pop(Queue storage self, bool _direction) private returns (uint256) {
    uint256 adj;
    (, adj) = getAdjacent(self, _FIRST_REMOVAL, _direction);
    return remove(self, adj);
  }

  /**
   * @dev Insert removal `_removalToInsert` beside existing removal `_removal` in direction `_direction`.
   * @param self queue from storage
   * @param _removal existing removal
   * @param _removalToInsert  new removal to insert
   * @param _direction direction to insert removal in
   * @return bool true if success, false otherwise
   */
  function _insert(
    Queue storage self,
    uint256 _removal,
    uint256 _removalToInsert,
    bool _direction
  ) private returns (bool) {
    if (
      !isRemovalInQueue(self, _removalToInsert) &&
      isRemovalInQueue(self, _removal)
    ) {
      uint256 linkedRemoval = self.queue[_removal][_direction];
      _createLink(self, _removal, _removalToInsert, _direction);
      _createLink(self, _removalToInsert, linkedRemoval, _direction);

      self.length += 1;

      return true;
    }

    return false;
  }

  /**
   * @dev Creates a bidirectional link between two removals on direction `_direction`
   * @param self queue from storage
   * @param _removal existing removal
   * @param _removalToLink removal to link to in the _direction
   * @param _direction direction to insert removal in
   */
  function _createLink(
    Queue storage self,
    uint256 _removal,
    uint256 _removalToLink,
    bool _direction
  ) private {
    self.queue[_removalToLink][!_direction] = _removal;
    self.queue[_removal][_direction] = _removalToLink;
  }
}
