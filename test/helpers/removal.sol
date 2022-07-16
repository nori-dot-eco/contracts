/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/Removal.sol"; // todo path remapping globally
import "@/test/helpers/test.sol";

abstract contract UpgradeableRemoval is Upgradeable {
  Removal internal _removal;
  Removal internal _removalImplementation;

  event TransferBatch(
    address indexed operator,
    address indexed from,
    address indexed to,
    uint256[] ids,
    uint256[] values
  );

  constructor() {
    _removal = _deployRemoval();
  }

  function _deployRemoval() internal returns (Removal) {
    _removalImplementation = new Removal();
    bytes memory initializer = abi.encodeWithSelector(
      _removalImplementation.initialize.selector
    );
    return Removal(_deployProxy(address(_removalImplementation), initializer));
  }
}

abstract contract NonUpgradableRemovalMock is Removal, Global {}

abstract contract UpgradableRemovalMock is UpgradeableRemoval {
  function _seed() internal virtual {}
}

abstract contract RemovalSeeded is UpgradableRemovalMock {
  constructor() {
    _seed();
  }
}
