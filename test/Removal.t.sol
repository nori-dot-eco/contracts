/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/removal.sol";
import {BatchMintRemovalsData} from "@/contracts/Removal.sol";

contract Removal_mintBatch is UpgradableRemovalMock {
  function test_mintBatch() external {
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
    assertEq(_removal.balanceOf(_namedAccounts.supplier, 1), 1);
  }
}

contract Removal_release is RemovalSeeded {
  event TransferSingle(
    address indexed operator,
    address indexed from,
    address indexed to,
    uint256 id,
    uint256 value
  ); // todo can we get this from the contract itself?

  function test_release() external {
    vm.expectEmit(false, true, true, false);
    emit TransferSingle(
      _namedAccounts.supplier,
      _namedAccounts.supplier,
      address(0),
      1,
      1
    );
    _removal.release(_namedAccounts.supplier, 1, 1);
  }

  function test_removalIsNotListed_release() external {
    _removal.release(_namedAccounts.supplier, 1, 1);
    assertEq(_removal.balanceOf(_namedAccounts.supplier, 1), 0);
  }

  function test_revert_missingReleaserRole_release() external {
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
}

contract Removal_cummulativeBalanceOfBatch is RemovalSeeded {
  function test_cumulativeBalanceOfBatch() external {
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
  function test_beforeTokenTransfer() external {
    super._beforeTokenTransfer(
      _namedAccounts.admin,
      _namedAccounts.admin,
      _namedAccounts.admin,
      _asSingletonUintArray(1),
      _asSingletonUintArray(1),
      ""
    );
  }

  function test_revert_paused_beforeTokenTransfer() external {
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
