/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/BytesLib.sol";
import "@/test/helpers/test.sol";

contract BytesLibTestHarness is Global {
  using BytesLib for bytes;

  function test() external {
    bytes memory data = abi.encode(_namedAccounts.admin);
    assertEq(
      this.toAddress({data: data}),
      _namedAccounts.admin,
      "Expected the function to return the correct address"
    );
  }

  function toAddress(bytes calldata data) external pure returns (address) {
    return data.toAddress();
  }
}
