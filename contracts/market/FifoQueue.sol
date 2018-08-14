
pragma solidity ^0.4.24 ;
import "../../node_modules/zeppelin-solidity/contracts//math/SafeMath.sol";

contract FifoQueue {
  using SafeMath for uint256; //todo jaycen PRELAUNCH - make sure we use this EVERYWHERE its needed

  mapping(uint256 => uint256) fifoQueue;
  uint256 first = 1;
  uint256 last = 0;

  /// @notice Inserts a new token at the end of the fifoQueue.
  /// @param tokenId the token to add to queue
  function push(uint256 tokenId) public {
    last = last.add(1);
    fifoQueue[last] = tokenId;
  }

  /// @notice Removes and returns the first tokenId in the queue.
  /// @return Returns the first tokenId in the queue
  function pop() public returns (uint256 tokenId) {
    tokenId = peek();
    delete fifoQueue[first];
    first = first.add(1);
    return tokenId;
  }

  /// @notice Returns the first token in the queue, skipping over items that have
  /// been removed.
  /// @return Returns the first tokenId in the queue
  function peek() public returns (uint256 tokenId) {
    for(uint i = first; i <= last; i = i.add(1)) {
      tokenId = fifoQueue[first];
      if (tokenId == 0) {
        first = first.add(1);
      } else {
        return tokenId;
      }
    }
  }

  /// @notice Iterates through fifoQueue and removes the matched value.
  /// @param tokenId The tokenId to remove
  function remove(uint256 tokenId) public {
    for(uint256 i = first; i < last; i = i.add(1)) {
      if (fifoQueue[i] == tokenId) {
        delete fifoQueue[i];
        break;
      }
    }
  }
}