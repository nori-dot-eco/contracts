pragma solidity ^0.4.24;


import "../../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";

// Note: This was take directly from the open-zeppelin solidity contracts.
// The only difference is the inclusion of a "reason string" in the require statement
// We can remove this when they apply my proposed changes in a diff PR (they declined mine)
// ref: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/1233
/**
 * @title Pausable
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 */
contract Pausable is Ownable {
  event Pause();
  event Unpause();

  bool public paused = false;


  /**
   * @dev Modifier to make a function callable only when the contract is not paused.
   */
  modifier whenNotPaused() {
    require(!paused, "You cannot use this function when the contract is paused");
    _;
  }

  /**
   * @dev Modifier to make a function callable only when the contract is paused.
   */
  modifier whenPaused() {
    require(paused, "You cannot use this function when the contract is un-paused");
    _;
  }

  /**
   * @dev called by the owner to pause, triggers stopped state
   */
  function pause() public onlyOwner whenNotPaused {
    paused = true;
    emit Pause();
  }

  /**
   * @dev called by the owner to unpause, returns to normal state
   */
  function unpause() public onlyOwner whenPaused {
    paused = false;
    emit Unpause();
  }
}
