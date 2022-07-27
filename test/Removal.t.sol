/* solhint-disable contract-name-camelcase, func-name-mixedcase, reason-string */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";
import {BatchMintRemovalsData, RemovalAmountZero} from "@/contracts/Removal.sol";

using UInt256ArrayLib for uint256[];
using AddressArrayLib for address[];

// todo fuzz RemovalIdLib

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
    _removal.release(REMOVAL_ID_FIXTURE, 1);
  }
}

contract Removal_release_unlisted is UpgradeableMarket {
  function setUp() external {
    BatchMintRemovalsData memory data = BatchMintRemovalsData({
      projectId: 1_234_567_890,
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
      _removal.balanceOf(_namedAccounts.supplier, REMOVAL_ID_FIXTURE),
      1,
      "Expected supplier to own the removal"
    );
  }

  function test() external {
    _removal.release(REMOVAL_ID_FIXTURE, 1);
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, REMOVAL_ID_FIXTURE),
      0,
      "Expected the removal to be burned"
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
    vm.prank(owner);
    _certificate.burn(0);
  }

  function test() external {
    _removal.release(REMOVAL_ID_FIXTURE, 1 ether);
    assertEq(_removal.balanceOf(address(_certificate), REMOVAL_ID_FIXTURE), 0);
    assertEq(_certificate.balanceOfRemoval(0, REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.totalSupply(REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.exists(REMOVAL_ID_FIXTURE), false);
  }
}

/**
 * @dev Tests for when a removal is released when it has already been sold, retired, and used as part of the balance
 * of a certificate
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
    _removal.release(REMOVAL_ID_FIXTURE, 1 ether);
    assertEq(_removal.balanceOf(address(_certificate), REMOVAL_ID_FIXTURE), 0);
    assertEq(_certificate.balanceOfRemoval(0, REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.totalSupply(REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.exists(REMOVAL_ID_FIXTURE), false);
  }
}

/**
 * @dev Tests for when a removal is released when it has already been sold, retired, and used as part of the balance
 * of 100 certificates.
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
    uint256 ownerPrivateKey = 0xA11CE; // todo use named accounts
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
    _removal.release(REMOVAL_ID_FIXTURE, 100 ether);
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
    _removal.release(REMOVAL_ID_FIXTURE, 1);
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, REMOVAL_ID_FIXTURE),
      0
    );
    assertEq(_removal.balanceOf(address(_market), REMOVAL_ID_FIXTURE), 0);
    // todo test events
  }
}

contract Removal_release_unlisted_listed_and_retired is UpgradeableMarket {
  uint256[] private _removalIds;
  address[] private _expectedOwners;
  uint256[] private _expectedBalances = [
    uint256(0),
    uint256(0),
    uint256(0.1 ether)
  ];

  function setUp() external {
    _expectedOwners = [
      _namedAccounts.supplier,
      address(_market),
      address(_certificate)
    ];
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false
    });
    _removal.safeBatchTransferFrom({
      from: _namedAccounts.supplier,
      to: address(_market),
      ids: new uint256[](1).fill(_removalIds[0]),
      amounts: new uint256[](1).fill(0.5 ether),
      data: ""
    });
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, _removalIds[0]),
      0.5 ether
    );
    assertEq(_removal.balanceOf(address(_market), _removalIds[0]), 0.5 ether);
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 checkoutTotal = _market.getCheckoutTotal(0.25 ether);
    vm.prank(_namedAccounts.admin);
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
    assertEq(_certificate.balanceOfRemoval(0, _removalIds[0]), 0.25 ether);
  }

  function test() external {
    _removal.release(_removalIds[0], 0.9 ether);
    assertEq(
      _removal.balanceOfBatch(
        _expectedOwners,
        new uint256[](3).fill(_removalIds[0])
      ),
      _expectedBalances
    );
  }
}

contract Removal_multicall is UpgradeableRemoval {
  /** @dev Asserts that we can get a cumulative balance for a list of removals owned by an account using multicall */
  function test_balanceOfBatch() external {
    uint256[] memory ids = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 2,
      list: false
    });
    bytes[] memory balanceOfBatchCalls = new bytes[](ids.length);
    for (uint256 i = 0; i < ids.length; ++i) {
      balanceOfBatchCalls[i] = abi.encodeWithSelector(
        _removal.balanceOfBatch.selector,
        new address[](1).fill(_namedAccounts.supplier),
        new uint256[](1).fill(ids[i])
      );
    }
    bytes[] memory results = _removal.multicall(balanceOfBatchCalls);
    uint256 total = 0;
    for (uint256 i = 0; i < results.length; ++i) {
      total += abi.decode(results[i], (uint256[])).sum();
    }
    assertEq(total, 2 ether);
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

  function test_paused_reverts_Paused() external {
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

  function test_zeroValueTransfer_reverts_RemovalAmountZero() external {
    vm.expectRevert(abi.encodeWithSelector(RemovalAmountZero.selector, 1));
    super._beforeTokenTransfer(
      _namedAccounts.admin,
      _namedAccounts.admin,
      vm.addr(1),
      _asSingletonUintArray(1),
      _asSingletonUintArray(0),
      ""
    );
  }
}
