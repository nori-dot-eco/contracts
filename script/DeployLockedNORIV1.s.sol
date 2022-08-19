// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.15;

/**
 * This is a little helper to deploy the old LockedNORI.  It's not
 * yet well integrated with anything else but I'm using it to
 * manually verify the upgrade process.
 */

import "forge-std/Script.sol";
import "../contracts/deprecated/LockedNORIV1.sol";
import "../contracts/test/MockERC777.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

contract DeployLockedNORIV1 is Script {
  MockERC777 erc777;
  LockedNORIV1 lNori;
  address internal _admin = vm.addr(69);

  function run() external {
    vm.startBroadcast();

    erc777 = _deployMockERC777();
    lNori = _deployLockedNORIV1(address(erc777));
    vm.stopBroadcast();
  }

  function _deployProxy(address _impl, bytes memory initializer)
    internal
    returns (address)
  {
    TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
      _impl,
      _admin,
      initializer
    );
    return address(proxy);
  }

  function _deployLockedNORIV1(address erc777_)
    internal
    returns (LockedNORIV1)
  {
    LockedNORIV1 impl = new LockedNORIV1();
    bytes memory initializer = abi.encodeWithSelector(
      impl.initialize.selector,
      erc777_
    );
    return LockedNORIV1(_deployProxy(address(impl), initializer));
  }

  function _deployMockERC777() internal returns (MockERC777) {
    MockERC777 impl = new MockERC777();
    bytes memory initializer = abi.encodeWithSignature("initialize()");
    return MockERC777(_deployProxy(address(impl), initializer));
  }
}
