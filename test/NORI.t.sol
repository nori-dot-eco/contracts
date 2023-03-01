/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import {UpgradeableNORI} from "@/test/helpers/nori.sol";
import {SignedPermit} from "@/test/helpers/signature-utils.sol";

contract NORI_name is UpgradeableNORI {
  function test() external {
    assertEq(_nori.name(), "NORI");
  }
}

contract NORI_permit is UpgradeableNORI {
  function test() external {
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 amount = 1;
    SignedPermit memory signedPermit = _noriSignatureUtils.generatePermit(
      ownerPrivateKey,
      _namedAccounts.admin,
      amount,
      1 days,
      _nori
    );
    _nori.permit(
      signedPermit.permit.owner,
      signedPermit.permit.spender,
      signedPermit.permit.value,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    assertEq(_nori.allowance(owner, signedPermit.permit.spender), amount);
    assertEq(_nori.nonces(owner), 1);
  }
}
