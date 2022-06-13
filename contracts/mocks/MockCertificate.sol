// SPDX-License-Identifier: MIT
pragma solidity =0.8.13;

import "../Certificate.sol";

contract MockCertificate is Certificate {
  event BeforeTokenTransfer();

  function beforeTokenTransfer(
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
  ) internal override(Certificate) {
    emit BeforeTokenTransfer();
    return
      Certificate._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }
}
