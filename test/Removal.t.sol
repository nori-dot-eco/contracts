/* solhint-disable contract-name-camelcase, func-name-mixedcase, reason-string */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";

// todo fuzz RemovalUtils

contract Removal_mintBatch is UpgradeableRemoval {
  function test() external {
    _removal.mintBatch({
      to: _namedAccounts.supplier,
      amounts: _asSingletonUintArray(1 ether),
      ids: _asSingletonUintArray(REMOVAL_ID_FIXTURE),
      data: BatchMintRemovalsData({
        projectId: 1,
        scheduleStartTime: 0,
        holdbackPercentage: 0,
        list: false
      })
    });
  }
}

contract Removal_release is UpgradeableRemoval {
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
    _removal.release(_namedAccounts.supplier, REMOVAL_ID_FIXTURE, 1);
  }
}

contract Removal_release_unlisted is UpgradeableRemoval {
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
      _asSingletonUintArray(REMOVAL_ID_FIXTURE),
      _asSingletonUintArray(1)
    );
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      _asSingletonUintArray(REMOVAL_ID_FIXTURE),
      data
    );
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, REMOVAL_ID_FIXTURE),
      1
    );
    _removal.release(_namedAccounts.supplier, REMOVAL_ID_FIXTURE, 1);
    // todo events
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, REMOVAL_ID_FIXTURE),
      0
    );
  }
}

/**
 * @dev Tests for when a removal is released when it has already been sold, retired, and used as part of the balance
 * of a certificate and then subsequently burned by the owner of the certificate.
 */
contract Removal_release_retired_burned is UpgradeableMarket {
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
      _asSingletonUintArray(REMOVAL_ID_FIXTURE),
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
    assertEq(_certificate.balanceOfRemoval(0, REMOVAL_ID_FIXTURE), 1 ether);
    //todo
    //         vm.prank(owner);
    // _certificate.burn()
  }

  function test() external {
    _removal.release(address(_certificate), REMOVAL_ID_FIXTURE, 1 ether);
    assertEq(_removal.balanceOf(address(_certificate), REMOVAL_ID_FIXTURE), 0);
    assertEq(_certificate.balanceOfRemoval(0, REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.totalSupply(REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.exists(REMOVAL_ID_FIXTURE), false);
  }
}

/**
 * @dev Tests for when a removal is released when it has already been sold, retired, and used as part of the balance
 * of a certificate
 * // todo consider moving these to release.int.t.sol since they rely on several contracts
 */
contract Removal_release_retired is UpgradeableMarket {
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
      _asSingletonUintArray(REMOVAL_ID_FIXTURE),
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
    assertEq(_certificate.balanceOfRemoval(0, REMOVAL_ID_FIXTURE), 1 ether);
  }

  function test() external {
    _removal.release(address(_certificate), REMOVAL_ID_FIXTURE, 1 ether);
    assertEq(_removal.balanceOf(address(_certificate), REMOVAL_ID_FIXTURE), 0);
    assertEq(_certificate.balanceOfRemoval(0, REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.totalSupply(REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.exists(REMOVAL_ID_FIXTURE), false);
  }
}

/**
 * @dev Tests for when a removal is released when it has already been sold, retired, and used as part of the balance
 * of multiple certificates.
 */
contract Removal_release_retired_oneHundredCertificates is UpgradeableMarket {
  function setUp() external {
    BatchMintRemovalsData memory data = BatchMintRemovalsData({
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50,
      list: true
    });
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(100 ether),
      _asSingletonUintArray(REMOVAL_ID_FIXTURE),
      data
    );
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey); // todo checkout helper function that accepts pk
    uint256 cumulativeCheckoutTotal = _market.getCheckoutTotal(100 ether);
    vm.prank(_namedAccounts.admin); // todo investigate why this is the only time we need to prank the admin
    _bpNori.deposit(owner, abi.encode(cumulativeCheckoutTotal));
    for (uint256 i = 0; i < 100; i++) {
      uint256 checkoutTotal = _market.getCheckoutTotal(1 ether); // todo replace other test usage of _market.getNoriFee
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
      assertEq(_certificate.balanceOfRemoval(0, REMOVAL_ID_FIXTURE), 1 ether);
    }
  }

  function test() external {
    _removal.release(address(_certificate), REMOVAL_ID_FIXTURE, 100 ether);
    assertEq(_removal.balanceOf(address(_certificate), REMOVAL_ID_FIXTURE), 0);
    assertEq(_certificate.balanceOfRemoval(0, REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.totalSupply(REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.exists(REMOVAL_ID_FIXTURE), false);
  }
}

contract Removal_release_listed is UpgradeableMarket {
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
      _asSingletonUintArray(REMOVAL_ID_FIXTURE),
      _asSingletonUintArray(1)
    );
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      _asSingletonUintArray(REMOVAL_ID_FIXTURE),
      data
    );
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, REMOVAL_ID_FIXTURE),
      0
    );
    assertEq(_removal.balanceOf(address(_market), REMOVAL_ID_FIXTURE), 1);
    _removal.release(address(_market), REMOVAL_ID_FIXTURE, 1);
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, REMOVAL_ID_FIXTURE),
      0
    );
    assertEq(_removal.balanceOf(address(_market), REMOVAL_ID_FIXTURE), 0);
    // todo test events
  }
}

contract Removal_cummulativeBalanceOfBatch is UpgradeableRemoval {
  function test() external {
    BatchMintRemovalsData memory data = BatchMintRemovalsData({
      projectId: 5_555_555_555,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50,
      list: false
    });
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      _asSingletonUintArray(REMOVAL_ID_FIXTURE),
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

contract Removal__beforeTokenTransfer is NonUpgradableRemoval {
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
