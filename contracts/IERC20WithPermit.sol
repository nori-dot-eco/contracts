// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-IERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

// solhint-disable-next-line no-empty-blocks, This interface just combines two other interfaces.
interface IERC20WithPermit is
  IERC20MetadataUpgradeable,
  IERC20PermitUpgradeable
{

}
