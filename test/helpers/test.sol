/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

abstract contract Global is Test {
  struct NamedAccounts {
    address admin;
    address supplier;
  }

  NamedAccounts internal _namedAccounts =
    NamedAccounts({admin: vm.addr(1), supplier: vm.addr(2)});

  function _asSingletonUintArray(uint256 element)
    internal
    pure
    returns (uint256[] memory)
  {
    uint256[] memory array = new uint256[](1);
    array[0] = element;
    return array;
  }

  function _asSingletonAddressArray(address element)
    internal
    pure
    returns (address[] memory)
  {
    address[] memory array = new address[](1);
    array[0] = element;
    return array;
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
