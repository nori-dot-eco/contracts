/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/bridged-polygon-nori.sol";
import {SignedPermit} from "@/test/helpers/signature-utils.sol";

contract BridgedPolygonNORI_name is UpgradeableBridgedPolygonNORI {
  function test() external {
    assertEq(_bpNori.name(), "NORI");
  }
}

contract BridgedPolygonNORI_permit is UpgradeableBridgedPolygonNORI {
  function test() external {
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 amount = 1;
    SignedPermit memory signedPermit = _bpNoriSignatureUtils.generatePermit(
      ownerPrivateKey,
      _namedAccounts.admin,
      amount,
      1 days,
      _bpNori
    );
    _bpNori.permit(
      signedPermit.permit.owner,
      signedPermit.permit.spender,
      signedPermit.permit.value,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    assertEq(_bpNori.allowance(owner, signedPermit.permit.spender), amount);
    assertEq(_bpNori.nonces(owner), 1);
  }
}
