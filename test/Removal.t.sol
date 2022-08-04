/* solhint-disable contract-name-camelcase, func-name-mixedcase, reason-string */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";
import {InvalidTokenTransfer} from "@/contracts/Errors.sol";

using UInt256ArrayLib for uint256[];
using AddressArrayLib for address[];

// todo fuzz RemovalIdLib

contract Removal_mintBatch is UpgradeableMarket {
  function test() external {
    _seedRemovals({to: _namedAccounts.supplier, count: 1, list: false});
  }
}

contract Removal_mintBatch_list is UpgradeableMarket {
  function test() external {
    _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true});
  }
}

/** @dev Tests that a supplier can be listed in the queue twice with two sequential calls to `mintBatch` */
contract Removal_mintBatch_list_sequential is UpgradeableMarket {
  function test() external {
    _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true});
    UnpackedRemovalIdV0[] memory ids = new UnpackedRemovalIdV0[](1);
    ids[0] = UnpackedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier + 1
    });
    _removal.mintBatch({
      to: address(_market),
      amounts: new uint256[](1).fill(1 ether),
      removals: ids,
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
  }
}

contract Removal_mintBatch_reverts_mint_to_wrong_address is UpgradeableMarket {
  function test() external {
    UnpackedRemovalIdV0[] memory ids = new UnpackedRemovalIdV0[](1);
    ids[0] = UnpackedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier + 1
    });
    vm.expectRevert(ForbiddenTransfer.selector);
    _removal.mintBatch({
      to: _namedAccounts.supplier2, // not the supplier encoded in the removal id
      amounts: new uint256[](1).fill(1 ether),
      removals: ids,
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
  }
}

contract Removal_getProjectId is UpgradeableMarket {
  uint256[] private _removalIds;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false
    });
  }

  function test() external {
    assertEq(_removal.getProjectId(_removalIds[0]), 1234567890);
  }
}

contract Removal__createRemovalDataBatch is NonUpgradeableRemoval {
  /** @dev allows using the `calldata` type for the `removalIds` param as this function is external  */

  function createRemovalDataBatch(
    UnpackedRemovalIdV0[] calldata removals,
    uint256 projectId
  ) external {
    _createRemovalDataBatch({removals: removals, projectId: projectId});
  }

  function test() external {
    UnpackedRemovalIdV0[] memory removals = new UnpackedRemovalIdV0[](1);
    removals[0] = UnpackedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });
    this.createRemovalDataBatch({removals: removals, projectId: 1});
  }

  function test_reverts_InvalidData2() external {
    UnpackedRemovalIdV0[] memory removals = new UnpackedRemovalIdV0[](1);
    removals[0] = UnpackedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });
    this.createRemovalDataBatch({removals: removals, projectId: 1});
    vm.expectRevert(InvalidData.selector);
    this.createRemovalDataBatch({removals: removals, projectId: 1});
  }
}

contract Removal__createRemovalData is NonUpgradeableRemoval {
  function test() external {
    _createRemovalData({removalId: 1, projectId: 1});
  }

  function test_reverts_InvalidData() external {
    _createRemovalData({removalId: 1, projectId: 1});
    vm.expectRevert(InvalidData.selector);
    _createRemovalData({removalId: 1, projectId: 1});
  }
}

contract Removal__validateRemoval is NonUpgradeableRemoval {
  function setUp() external {
    _createRemovalData({removalId: 1, projectId: 1});
  }

  function test() external view {
    _validateRemoval({id: 2});
  }

  function test_reverts_InvalidData() external {
    vm.expectRevert(InvalidData.selector);
    _validateRemoval({id: 1});
  }
}

contract Removal_batchGetHoldbackPercentages_singleId is UpgradeableMarket {
  uint256[] private _removalIds;
  uint8[] private _holdbackPercentages;

  function setUp() external {
    UnpackedRemovalIdV0[] memory removalBatch = new UnpackedRemovalIdV0[](1);
    removalBatch[0] = REMOVAL_DATA_FIXTURE;
    _removal.mintBatch({
      to: _namedAccounts.supplier,
      amounts: _asSingletonUintArray(1),
      removals: removalBatch,
      scheduleStartTime: block.timestamp,
      projectId: 1_234_567_890,
      holdbackPercentage: 50
    });
    _removalIds = [REMOVAL_ID_FIXTURE];
    _holdbackPercentages = [50];
  }

  function test() external {
    assertEq(
      _holdbackPercentages,
      _removal.batchGetHoldbackPercentages({ids: _removalIds})
    );
  }
}

contract Removal_batchGetHoldbackPercentages_multipleIds is UpgradeableMarket {
  uint8 private constant _secondHoldbackPercentage = 10;
  uint8 private constant _firstHoldbackPercentage = 50;
  uint256[] private _removalIds;
  uint8[] private _holdbackPercentages;
  uint256 private _secondRemovalId;

  function setUp() external {
    UnpackedRemovalIdV0[]
      memory firstRemovalBatchFixture = new UnpackedRemovalIdV0[](1);
    firstRemovalBatchFixture[0] = REMOVAL_DATA_FIXTURE;
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      firstRemovalBatchFixture,
      1_234_567_890,
      block.timestamp,
      _firstHoldbackPercentage
    );
    UnpackedRemovalIdV0[]
      memory secondRemovalBatchFixture = new UnpackedRemovalIdV0[](1);
    secondRemovalBatchFixture[0] = REMOVAL_DATA_FIXTURE;
    secondRemovalBatchFixture[0].subIdentifier =
      REMOVAL_DATA_FIXTURE.subIdentifier +
      1;
    _secondRemovalId = RemovalIdLib.createRemovalId(
      secondRemovalBatchFixture[0]
    );
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      secondRemovalBatchFixture,
      1_234_567_891,
      block.timestamp,
      _secondHoldbackPercentage
    );
    _removalIds = [REMOVAL_ID_FIXTURE, _secondRemovalId];
    _holdbackPercentages = [
      _firstHoldbackPercentage,
      _secondHoldbackPercentage
    ];
  }

  function test() external {
    assertEq(
      _removal.batchGetHoldbackPercentages({ids: _removalIds}),
      _holdbackPercentages
    );
  }
}

contract Removal_release_reverts_AccessControl is UpgradeableMarket {
  // todo idea: the only one who can burn is nori and therefore this can be tested as part of _beforeTokenTransfer
  function test() external {
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
  uint256[] private _removalIds;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false
    });
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, _removalIds[0]),
      1 ether,
      "Expected supplier to own the removal"
    );
  }

  function test() external {
    _removal.release(_removalIds[0], 1 ether);
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, _removalIds[0]),
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
  uint256[] private _removalIds;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
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
    assertEq(_certificate.balanceOfRemoval(0, _removalIds[0]), 1 ether);
    vm.prank(owner);
    _certificate.burn(0);
  }

  function test() external {
    _removal.release(_removalIds[0], 1 ether);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    assertEq(_certificate.balanceOfRemoval(0, _removalIds[0]), 0);
    assertEq(_removal.totalSupply(_removalIds[0]), 0);
    assertEq(_removal.exists(_removalIds[0]), false);
  }
}

/**
 * @dev Tests for when a removal is released when it has already been sold, retired, and used as part of the balance
 * of a certificate
 */
contract Removal_release_retired is UpgradeableMarket {
  uint256[] private _removalIds;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
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
    assertEq(_certificate.balanceOfRemoval(0, _removalIds[0]), 1 ether);
  }

  function test() external {
    _removal.release(_removalIds[0], 1 ether);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    assertEq(_certificate.balanceOfRemoval(0, _removalIds[0]), 0);
    assertEq(_removal.totalSupply(_removalIds[0]), 0);
    assertEq(_removal.exists(_removalIds[0]), false);
  }
}

/**
 * @dev Tests for when a removal is released when it has already been sold, retired, and used as part of the balance
 * of 100 certificates.
 */
contract Removal_release_retired_oneHundredCertificates is UpgradeableMarket {
  function setUp() external {
    _removal.mintBatch({
      to: address(_market),
      amounts: new uint256[](1).fill(100 ether),
      removals: _REMOVAL_FIXTURES,
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
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
    vm.expectEmit(false, false, false, false); // todo
    emit TransferBatch(
      address(0),
      address(0),
      address(_namedAccounts.supplier),
      _asSingletonUintArray(REMOVAL_ID_FIXTURE),
      _asSingletonUintArray(1)
    );
    _removal.mintBatch({
      to: _marketAddress,
      amounts: _asSingletonUintArray(1),
      removals: _REMOVAL_FIXTURES,
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
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
    _removal.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[0],
      amount: 0.5 ether
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

/** @dev A test that asserts the ability to release a removal retired across 2 certificates */
contract Removal_release_retired_2x is UpgradeableMarket {
  uint256[] private _removalIds;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    assertEq(_removal.balanceOf(_namedAccounts.supplier, _removalIds[0]), 0);
    assertEq(_removal.balanceOf(address(_market), _removalIds[0]), 1 ether);
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 checkoutTotal = _market.getCheckoutTotal(0.5 ether);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(checkoutTotal * 2));
    for (uint256 i = 0; i < 2; i++) {
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
    }
    assertEq(_certificate.balanceOfRemoval(0, _removalIds[0]), 0.5 ether);
    assertEq(_certificate.balanceOfRemoval(1, _removalIds[0]), 0.5 ether);
  }

  function test() external {
    _removal.release(_removalIds[0], 0.9 ether);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      0.1 ether
    );
    assertEq(_certificate.balanceOfRemoval(0, _removalIds[0]), 0);
    assertEq(_certificate.balanceOfRemoval(1, _removalIds[0]), 0.1 ether);
  }
}

contract Removal_release_partial_listed is UpgradeableMarket {
  uint256[] private _removalIds;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    assertEq(_removal.balanceOf(_namedAccounts.supplier, _removalIds[0]), 0);
    assertEq(_removal.balanceOf(address(_market), _removalIds[0]), 1 ether);
  }

  function test() external {
    _removal.release(_removalIds[0], 0.5 ether);
    assertEq(_removal.balanceOf(address(_market), _removalIds[0]), 0.5 ether);
  }
}

contract Removal_multicall is UpgradeableMarket {
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

contract Removal_getMarketBalance is UpgradeableMarket {
  uint256[] private _removalIds;

  function test() external {
    uint256 amountToList = 0.5 ether;
    uint256 amountToSell = 0.2 ether;
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false
    });
    assertEq(_removal.getMarketBalance(), 0);
    _removal.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[0],
      amount: amountToList
    });
    assertEq(_removal.getMarketBalance(), amountToList);
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 checkoutTotal = _market.getCheckoutTotal(amountToSell);
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
    assertEq(_removal.getMarketBalance(), amountToList - amountToSell);
    _market.withdraw(_removalIds[0]);
    assertEq(_removal.getMarketBalance(), 0);
  }
}

contract Removal__beforeTokenTransfer is NonUpgradeableRemoval {
  uint256 private _removalId;

  function setUp() external {
    _removalId = RemovalIdLib.createRemovalId(
      UnpackedRemovalIdV0({
        idVersion: 0,
        methodology: 1,
        methodologyVersion: 0,
        vintage: 2018,
        country: "US",
        subdivision: "IA",
        supplierAddress: _namedAccounts.supplier,
        subIdentifier: 99_039_930
      })
    );
  }

  // todo test the rest of the cases
  function test() external {
    super._beforeTokenTransfer(
      _namedAccounts.admin,
      _namedAccounts.admin,
      _namedAccounts.supplier,
      new uint256[](1).fill(_removalId),
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

  function test_zeroValueTransferToMarket_reverts_InvalidTokenTransfer()
    external
  {
    vm.expectRevert(abi.encodeWithSelector(InvalidTokenTransfer.selector, 1));
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

contract Removal_safeTransferFrom_reverts_ForbiddenTransfer is
  UpgradeableMarket
{
  uint256[] private _removalIds;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false
    });
  }

  function test() external {
    vm.expectRevert(ForbiddenTransfer.selector);
    vm.prank(_namedAccounts.supplier);
    _removal.safeTransferFrom({
      from: _namedAccounts.supplier,
      to: _namedAccounts.supplier2,
      id: _removalIds[0],
      amount: 1 ether,
      data: ""
    });
  }
}

contract Removal_safeBatchTransferFrom_reverts_ForbiddenTransfer is
  UpgradeableMarket
{
  uint256[] private _removalIds;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 2,
      list: false
    });
  }

  function test() external {
    vm.expectRevert(ForbiddenTransfer.selector);
    vm.prank(_namedAccounts.supplier);
    _removal.safeBatchTransferFrom({
      from: _namedAccounts.supplier,
      to: _namedAccounts.supplier2,
      ids: _removalIds,
      amounts: new uint256[](2).fill(1 ether),
      data: ""
    });
  }
}
