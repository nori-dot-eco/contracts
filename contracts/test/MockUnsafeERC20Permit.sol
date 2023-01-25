// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "../IERC20WithPermit.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";

contract MockUnsafeERC20Permit is ERC20PermitUpgradeable, IERC20WithPermit {
  function initialize() public initializer {
    __ERC20Permit_init("MockUnsafeERC20Permit");
    __ERC20_init_unchained("MockUnsafeERC20Permit", "MERC20");
    _mint(_msgSender(), 1_000_000_000_000_000_000_000_000);
  }

  /**
   * @dev "Unsafe" ERC20 implementations may not revert in the case of a transfer failure, and instead
   * indicate failure by returning false. This contract can be used for testing purposes to simulate
   * such an implementation.
   */
  function transferFrom(
    address,
    address,
    uint256
  )
    public
    virtual
    override(ERC20Upgradeable, IERC20Upgradeable)
    returns (bool)
  {
    return false;
  }
}
