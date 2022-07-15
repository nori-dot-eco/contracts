/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/removal.sol";
import {BatchMintRemovalsData} from "@/contracts/Removal.sol";

contract Removal_mintBatch is UpgradableRemovalMock {
  function test() external {
    BatchMintRemovalsData memory data = BatchMintRemovalsData({
      projectId: 1,
      scheduleStartTime: 0,
      holdbackPercentage: 0,
      list: false
    });
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      _asSingletonUintArray(1),
      data
    );
  }
}

contract Removal_release is RemovalSeeded {
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
    _removal.release(_namedAccounts.supplier, 1, 1);
  }

  function test_unlisted() external {
    // todo build mint data helper function
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
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50,
      list: false
    });
    uint256 _tokenId = RemovalUtils.createRemovalIdFromStruct(removalId);
    vm.expectEmit(false, false, false, false);
    emit TransferBatch(
      address(0),
      address(0),
      address(_namedAccounts.supplier),
      _asSingletonUintArray(_tokenId),
      _asSingletonUintArray(1)
    );
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      _asSingletonUintArray(_tokenId), // todo encode ID or test won't work
      data
    );
    assertEq(_removal.balanceOf(_namedAccounts.supplier, _tokenId), 1);
  }
}

contract Removal_cummulativeBalanceOfBatch is RemovalSeeded {
  function test() external {
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
    uint256 _tokenId = RemovalUtils.createRemovalIdFromStruct(removalId);
    BatchMintRemovalsData memory data = BatchMintRemovalsData({
      projectId: 5_555_555_555,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50,
      list: false
    });
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      _asSingletonUintArray(_tokenId), // todo encode ID or test won't work
      data
    );
    assertEq(
      _removal.cumulativeBalanceOfBatch(
        _asSingletonAddressArray(_namedAccounts.supplier)
      ),
      _asSingletonUintArray(1)
    );
  }
  // todo test_listed
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

  function test_revert_paused() external {
    super._pause();
    vm.expectRevert("ERC1155Pausable: token transfer while paused");
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
