/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/Removal.sol"; // todo path remapping globally
import "@/test/helpers/test.sol";
import {BatchMintRemovalsData} from "@/contracts/Removal.sol";

abstract contract UpgradeableRemoval is Upgradeable {
  Removal internal _removal;

  constructor() {
    _removal = _deployRemoval();
  }

  function _deployRemoval() internal returns (Removal) {
    Removal impl = new Removal();
    bytes memory initializer = abi.encodeWithSelector(impl.initialize.selector);
    return Removal(_deployProxy(address(impl), initializer));
  }
}

abstract contract NonUpgradableRemovalMock is Removal, Global {}

abstract contract UpgradableRemovalMock is UpgradeableRemoval {
  function _seed() internal virtual {
    UnpackedRemovalIdV0 memory removalId = UnpackedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: hex"5553",
      subdivision: hex"4941",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });
    BatchMintRemovalsData memory data = BatchMintRemovalsData({
      projectId: 5_555_555_555,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50,
      list: false
    });
    uint256 _tokenId = RemovalUtils.createRemovalIdFromStruct(removalId);
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      _asSingletonUintArray(_tokenId), // todo encode ID or test won't work
      data
    );
    if (_removal.balanceOf(_namedAccounts.supplier, _tokenId) != 1) {
      revert("Supplier should have 1 removal of quantity 1 after seeding");
    }
  }
}

abstract contract RemovalSeeded is UpgradableRemovalMock {
  constructor() {
    _seed();
  }
}
