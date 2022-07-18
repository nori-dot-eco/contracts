/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";
import {BatchMintRemovalsData} from "@/contracts/Removal.sol";

// todo fuzz RemovalUtils

contract Removal_mintBatch is UpgradableRemovalMock {
  UnpackedRemovalIdV0 internal _removalData =
    UnpackedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "AZ",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });
  BatchMintRemovalsData internal _mintData =
    BatchMintRemovalsData({
      projectId: 1,
      scheduleStartTime: 0,
      holdbackPercentage: 0,
      list: false
    });

  function test() external {
    // console.log("ID===", RemovalUtils.createRemovalIdFromStruct(_removalData));
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1 ether),
      _asSingletonRemovalIdArray(
        RemovalUtils.createRemovalIdFromStruct(_removalData)
      ),
      _mintData
    );
  }
}

contract Removal_release is RemovalSeeded, UpgradeableMarket {
  UnpackedRemovalIdV0 internal _removalData =
    UnpackedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "AZ",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });
  RemovalId internal _removalId =
    RemovalUtils.createRemovalIdFromStruct(_removalData);

  // todo idea: the only one who can burn is nori and therefore this can be tested as part of _beforeTokenTransfer
  function test_revert_missingReleaserRole() external {
    vm.prank(address(0));
    vm.expectRevert(
      bytes(
        string.concat(
          "AccessControl: account 0x0000000000000000000000000000000000000000 is missing role ",
          "0x88f3509f0e42391f2d94ebfb2a37cbd0782b1b8f73715330017f4663290b8117"
        )
      )
    );
    _removal.release(_namedAccounts.supplier, _removalId, 1);
  }
}

contract Removal_release_unlisted is RemovalSeeded, UpgradeableMarket {
  UnpackedRemovalIdV0 internal _removalData =
    UnpackedRemovalIdV0({ // todo de-dupe
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "AZ",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });
  RemovalId internal _removalId =
    RemovalUtils.createRemovalIdFromStruct(_removalData);

  function test() external {
    BatchMintRemovalsData memory data = BatchMintRemovalsData({
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50,
      list: false
    });
    vm.expectEmit(false, false, false, false); // todo
    emit TransferBatch(
      address(0),
      address(0),
      address(_namedAccounts.supplier),
      _asSingletonUintArray(RemovalId.unwrap(_removalId)),
      _asSingletonUintArray(1)
    );
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      _asSingletonRemovalIdArray(_removalId),
      data
    );
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, RemovalId.unwrap(_removalId)),
      1
    );
    _removal.release(_namedAccounts.supplier, _removalId, 1);
    // todo events
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, RemovalId.unwrap(_removalId)),
      0
    );
  }
}

/**
 * @dev Tests for when a removal is released when it has already been sold, retired, and used as part of the balance
 * of a certificate
 * // todo consider moving these to release.int.t.sol since they rely on several contracts
 */
contract Removal_release_retired is RemovalSeeded, UpgradeableMarket {
  UnpackedRemovalIdV0 internal _removalData =
    UnpackedRemovalIdV0({ // todo de-dupe
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "AZ",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });
  RemovalId internal _removalId =
    RemovalUtils.createRemovalIdFromStruct(_removalData);

  function setUp() external {
    BatchMintRemovalsData memory data = BatchMintRemovalsData({
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50,
      list: true
    });
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1 ether),
      _asSingletonRemovalIdArray(_removalId),
      data
    );
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey); // todo checkout helper function that accepts pk
    uint256 checkoutTotal = _market.getCheckoutTotal(1 ether); // todo replace other test usage of _market.getNoriFee
    vm.prank(_namedAccounts.admin); // todo investigate why this is the only time we need to prank the admin
    _bpNori.deposit(owner, abi.encode(checkoutTotal));
    SignedPermit memory signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      checkoutTotal,
      1 days,
      _bpNori
    );
    vm.prank(owner);
    _market.swap(
      owner,
      checkoutTotal,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    // todo revert if  certificate doesnt exist
    // todo revert if removals for certificate dont exists/add up to total
    if (_certificate.balanceOf(0) != 1 ether) {
      revert("certificate has invalid balance");
    }
  }

  function test() external {
    _removal.release(address(_certificate), _removalId, 1 ether);
    assertEq(
      _removal.balanceOf(address(_certificate), RemovalId.unwrap(_removalId)),
      0
    );
    // assertEq(_certificate.balanceOfRemoval(0, RemovalId.unwrap(_removalId)), 0); // todo missing implementation
    // assertEq(_certificate.balanceOf(0), 0); // todo missing implementation
    assertEq(_removal.totalSupply(RemovalId.unwrap(_removalId)), 0);
    assertEq(_removal.exists(RemovalId.unwrap(_removalId)), false);
  }
}

contract Removal_release_listed is RemovalSeeded, UpgradeableMarket {
  UnpackedRemovalIdV0 internal _removalData =
    UnpackedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "AZ",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });
  RemovalId internal _removalId =
    RemovalUtils.createRemovalIdFromStruct(_removalData);

  function test() external {
    BatchMintRemovalsData memory data = BatchMintRemovalsData({
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50,
      list: true
    });
    vm.expectEmit(false, false, false, false); // todo
    emit TransferBatch(
      address(0),
      address(0),
      address(_namedAccounts.supplier),
      _asSingletonUintArray(RemovalId.unwrap(_removalId)),
      _asSingletonUintArray(1)
    );
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      _asSingletonRemovalIdArray(_removalId),
      data
    );
    assertEq( // todo reuse checkout.int assertions
      _removal.balanceOf(_namedAccounts.supplier, RemovalId.unwrap(_removalId)),
      0
    );
    assertEq(
      _removal.balanceOf(address(_market), RemovalId.unwrap(_removalId)),
      1
    );
    _removal.release(address(_market), _removalId, 1);
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, RemovalId.unwrap(_removalId)),
      0
    );
    assertEq(
      _removal.balanceOf(address(_market), RemovalId.unwrap(_removalId)),
      0
    );
    // todo events
  }
}

contract Removal_cummulativeBalanceOfBatch is RemovalSeeded {
  function test() external {
    UnpackedRemovalIdV0 memory removalId = UnpackedRemovalIdV0({ // todo declare outside test?
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });
    RemovalId _removalId = RemovalUtils.createRemovalIdFromStruct(removalId);
    BatchMintRemovalsData memory data = BatchMintRemovalsData({
      projectId: 5_555_555_555,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50,
      list: false
    });
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      _asSingletonRemovalIdArray(_removalId),
      data
    );
    assertEq(
      _removal.cumulativeBalanceOfBatch(
        _asSingletonAddressArray(_namedAccounts.supplier)
      ),
      _asSingletonUintArray(1)
    );
  }
}

contract Removal__beforeTokenTransfer is NonUpgradableRemovalMock {
  // todo test the rest of the cases
  function test() external {
    super._beforeTokenTransfer(
      _namedAccounts.admin,
      _namedAccounts.admin,
      _namedAccounts.admin,
      _asSingletonUintArray(1),
      _asSingletonUintArray(1),
      ""
    );
    // todo assert?
  }

  function test_paused_reverts() external {
    super._pause();
    vm.expectRevert("Pausable: paused");
    super._beforeTokenTransfer(
      _namedAccounts.admin,
      _namedAccounts.admin,
      _namedAccounts.admin,
      _asSingletonUintArray(1),
      _asSingletonUintArray(1),
      ""
    );
  }
}
