// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "./SigUtils.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";

contract PermitSigner {
  function digestPermitCall(
    address token,
    address spender,
    uint256 value,
    uint256 deadline
  ) public returns (bytes32 digest) {
    IERC20PermitUpgradeable _erc20 = IERC20PermitUpgradeable(token);
    SigUtils sigUtils = new SigUtils(_erc20.DOMAIN_SEPARATOR());
    SigUtils.Permit memory permit = SigUtils.Permit({
      owner: msg.sender,
      spender: spender,
      value: value,
      nonce: _erc20.nonces(msg.sender),
      deadline: deadline
    });

    return sigUtils.getTypedDataHash(permit);
  }
}
