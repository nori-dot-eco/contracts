
pragma solidity ^0.4.24 ;
import "../../node_modules/zeppelin-solidity/contracts//math/SafeMath.sol";

contract FifoQueue {
  using SafeMath for uint256; //todo jaycen PRELAUNCH - make sure we use this EVERYWHERE its needed

  mapping(uint256 => uint256) fifoQueue;
  uint256 first = 1;
  uint256 last = 0;

  modifier isNotEmpty() {
    require(
      last >= first,
      "There are no items in the queue"
    );
    _;
  }

  function push(uint256 tokenId) public {
    last = last.add(1);
    fifoQueue[last] = tokenId;
  }

  function pop() public isNotEmpty returns (uint256 tokenId) {
    tokenId = peek();
    delete fifoQueue[first];
    first = first.add(1);
    return tokenId;
  }

  function peek() public view isNotEmpty returns (uint256 tokenId) {
    for(uint i = first; i <= last; i = i.add(1)) {
      tokenId = fifoQueue[first];
      if (tokenId == 0) {
        first = first.add(1);
      } else {
        return tokenId;
      }
    }
  }

  function remove(uint256 tokenId) public isNotEmpty {
    require(
      last >= first,
      "There are no items in the queue"
    );
    for(uint256 i = first; i < last; i = i.add(1)) {
      if (fifoQueue[i] == tokenId) {
        delete fifoQueue[i];
        break;
      }
    }
  }
}