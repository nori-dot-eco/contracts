// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "../ERC1155PresetPausableNonTransferrable.sol";

contract MockERC1155PresetPausableNonTransferrable is
  ERC1155PresetPausableNonTransferrable
{
  event BeforeTokenTransfer();

  function initialize() external initializer {
    // todo verify all inherited unchained initializers are called
    __ERC1155PresetPausableNonTransferrable_init(
      "https://nori.com/api/certificate/{id}.json"
    );
  }

  // solhint-disable-next-line func-name-mixedcase, private-vars-leading-underscore, -- mock contracts can break rules
  function _test_beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) public {
    return _beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal override(ERC1155PresetPausableNonTransferrable) {
    emit BeforeTokenTransfer();
    return
      ERC1155PresetPausableNonTransferrable._beforeTokenTransfer(
        operator,
        from,
        to,
        ids,
        amounts,
        data
      );
  }
}
