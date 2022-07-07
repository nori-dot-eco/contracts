// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "./SigUtils.sol";
import "forge-std/Test.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";

contract PermitSigner is Test {
  function signPermit(
    address token,
    address spender,
    uint256 value,
    uint256 deadline,
    uint256 ownerPrivateKey
  )
    public
    returns (
      uint8 v,
      bytes32 r,
      bytes32 s
    )
  {
    IERC20PermitUpgradeable _erc20 = IERC20PermitUpgradeable(token);
    SigUtils sigUtils = new SigUtils(_erc20.DOMAIN_SEPARATOR());
    SigUtils.Permit memory permit = SigUtils.Permit({
      owner: msg.sender,
      spender: spender,
      value: value,
      nonce: _erc20.nonces(msg.sender),
      deadline: deadline
    });

    bytes32 digest = sigUtils.getTypedDataHash(permit);
    return vm.sign(ownerPrivateKey, digest);
  }
}
