/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/certificate.sol";

contract Certificate_name is UpgradableCertificateMock {
  function test_name() external {
    assertEq(_certificate.name(), "Certificate");
  }
}
