/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@prb/test/Vm.sol";
import "forge-std/console2.sol";
import {PRBTest} from "@prb/test/PRBTest.sol";

abstract contract Global is PRBTest {
  struct NamedAccounts {
    // todo generate from mnemonic env variables
    address admin;
    address supplier;
    address supplier2;
    address buyer;
  }

  NamedAccounts internal _namedAccounts =
    NamedAccounts({
      admin: account("admin"),
      supplier: account("supplier"),
      supplier2: account("supplier2"),
      buyer: account("buyer")
    });

  event LogNamedArray(string key, uint8[] value);

  /** @dev Checks if `a` equals `b`. */
  function eq(uint8[] memory a, uint8[] memory b)
    private
    pure
    returns (bool result)
  {
    result = keccak256(abi.encode(a)) == keccak256(abi.encode(b));
  }

  function account(string memory name) internal returns (address) {
    address addr = address(
      uint160(uint256((keccak256(abi.encodePacked(name)))))
    );
    vm.label(addr, name);
    return addr;
  }

  function _asSingletonUintArray(uint256 element)
    internal
    pure
    returns (uint256[] memory)
  {
    // todo deprecate in favor of ArrayLib.fill
    uint256[] memory array = new uint256[](1);
    array[0] = element;
    return array;
  }

  function _asSingletonAddressArray(address element)
    internal
    pure
    returns (address[] memory)
  {
    // todo deprecate in favor of ArrayLib.fill
    address[] memory array = new address[](1);
    array[0] = element;
    return array;
  }

  function assertEq(uint8[] memory a, uint8[] memory b) internal virtual {
    if (!eq(a, b)) {
      emit Log("Error: a == b not satisfied [uint8[]]");
      emit LogNamedArray("  Expected", b);
      emit LogNamedArray("    Actual", a);
      fail();
    }
  }
}

abstract contract Upgradeable is Global {
  function _deployProxy(address _impl, bytes memory initializer)
    internal
    returns (address)
  {
    TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
      _impl,
      vm.addr(100),
      initializer
    );
    return address(proxy);
  }
}
