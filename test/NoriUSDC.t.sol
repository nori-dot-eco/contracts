/* solhint-disable contract-name-camelcase, func-name-mixedcase, reason-string */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/nori-usdc.sol";
import "@/test/helpers/signature-utils.sol";

contract NoriUSDC_permit is UpgradeableNoriUSDC {
  function test() external {
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    vm.prank(_namedAccounts.admin);
    _noriUSDC.transfer(owner, 5 ether);
    SignedPermit memory signedPermit = _noriUSDCSignatureUtils.generatePermit(
      ownerPrivateKey,
      _namedAccounts._this,
      5 ether,
      1 days,
      _noriUSDC
    );
    _noriUSDC.permit({
      owner: owner,
      spender: _namedAccounts._this,
      value: signedPermit.permit.value,
      deadline: signedPermit.permit.deadline,
      v: signedPermit.v,
      r: signedPermit.r,
      s: signedPermit.s
    });
  }
}
