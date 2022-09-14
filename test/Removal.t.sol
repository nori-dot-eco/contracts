/* solhint-disable contract-name-camelcase, func-name-mixedcase, reason-string */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";
import {InvalidTokenTransfer} from "@/contracts/Errors.sol";

using UInt256ArrayLib for uint256[];
using AddressArrayLib for address[];

// todo fuzz RemovalIdLib
// todo test that checks Removal.consign can happen using multi call with mix-match project ids

contract Removal_migrate is UpgradeableMarket {
  uint256 constant NUMBER_OF_SUPPLIERS = 3;
  uint256 constant AMOUNT_PER_REMOVAL = 1 ether;
  uint32 constant NUMBER_OF_REMOVALS_PER_SUPPLIER = 1;
  uint256 constant EXPECTED_CERTIFICATE_ID = 0;

  function test() external {
    _removal.registerContractAddresses({
      market: _market,
      certificate: _certificate
    });
    _removal.grantRole({
      role: _removal.CONSIGNOR_ROLE(),
      account: _namedAccounts.admin
    });
    uint256[][] memory amountsForAllSuppliers = new uint256[][](
      NUMBER_OF_SUPPLIERS
    );
    uint256[][] memory idsForAllSuppliers = new uint256[][](
      NUMBER_OF_SUPPLIERS
    );
    address[] memory suppliers = new address[](NUMBER_OF_SUPPLIERS);
    uint256 numberOfRemovals = NUMBER_OF_SUPPLIERS *
      NUMBER_OF_REMOVALS_PER_SUPPLIER;
    uint256[] memory amountsPerSupplier = new uint256[](
      NUMBER_OF_REMOVALS_PER_SUPPLIER
    ).fill(AMOUNT_PER_REMOVAL);
    uint256 certificateAmount = numberOfRemovals * AMOUNT_PER_REMOVAL;
    for (uint256 i = 0; i < idsForAllSuppliers.length; ++i) {
      amountsForAllSuppliers[i] = amountsPerSupplier;
      address supplier = i == 0 ? _namedAccounts.supplier : i == 1
        ? _namedAccounts.supplier2
        : _namedAccounts.supplier3;
      idsForAllSuppliers[i] = _seedRemovals({
        to: supplier,
        count: NUMBER_OF_REMOVALS_PER_SUPPLIER,
        list: false
      });
      suppliers[i] = supplier;
    }
    vm.recordLogs();
    vm.prank(_namedAccounts.admin);
    _removal.migrate({
      owners: suppliers,
      ids: idsForAllSuppliers,
      amounts: amountsForAllSuppliers,
      certificateRecipient: _namedAccounts.buyer,
      certificateAmount: certificateAmount
    });
    Vm.Log[] memory entries = vm.getRecordedLogs();
    assertEq(entries.length, 7);
    assertEq(
      entries[3].topics[0],
      keccak256("Migration(address,uint256,uint256,uint256[],uint256[])")
    );
    assertEq(entries[3].topics.length, 4);
    assertEq(
      entries[3].topics[1],
      bytes32(uint256(uint160(_namedAccounts.buyer)))
    );
    assertEq(entries[3].topics[2], bytes32(certificateAmount));
    assertEq(entries[3].topics[3], bytes32(EXPECTED_CERTIFICATE_ID));
    uint256[] memory flattenedAmounts = new uint256[](numberOfRemovals);
    uint256[] memory flattenedIds = new uint256[](numberOfRemovals);
    for (uint256 i = 0; i < numberOfRemovals; ++i) {
      for (uint256 j = 0; j < NUMBER_OF_REMOVALS_PER_SUPPLIER; ++j) {
        flattenedAmounts[i] = AMOUNT_PER_REMOVAL;
        flattenedIds[i] = idsForAllSuppliers[i][j];
      }
    }
    (uint256[] memory decodedIds, uint256[] memory decodedAmounts) = abi.decode(
      entries[3].data,
      (uint256[], uint256[])
    );
    assertEq(decodedIds, flattenedIds);
    assertEq(decodedAmounts, flattenedAmounts);
    Certificate.Balance[] memory removalBalancesOfCertificate = _certificate
      .removalsOfCertificate({certificateId: EXPECTED_CERTIFICATE_ID});
    assertEq(
      _certificate.ownerOf({tokenId: EXPECTED_CERTIFICATE_ID}),
      _namedAccounts.buyer
    );
    assertEq(
      _certificate.purchaseAmount({certificateId: EXPECTED_CERTIFICATE_ID}),
      certificateAmount
    );
    for (uint256 i = 0; i < NUMBER_OF_SUPPLIERS; ++i) {
      assertEq(
        _certificate.balanceOfRemoval({
          certificateTokenId: EXPECTED_CERTIFICATE_ID,
          removalTokenId: flattenedIds[i]
        }),
        AMOUNT_PER_REMOVAL
      );
      assertEq(removalBalancesOfCertificate[i].id, idsForAllSuppliers[i][0]);
      assertEq(removalBalancesOfCertificate[i].amount, AMOUNT_PER_REMOVAL);
      Certificate.Balance[] memory certificatesOfRemoval = _certificate
        .certificatesOfRemoval({removalId: flattenedIds[i]});
      assertEq(certificatesOfRemoval.length, 1);
      assertEq(certificatesOfRemoval[0].amount, AMOUNT_PER_REMOVAL);
      assertEq(certificatesOfRemoval[0].id, EXPECTED_CERTIFICATE_ID);
    }
    assertEq(_certificate.totalMinted(), EXPECTED_CERTIFICATE_ID + 1);
  }
}

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

contract Removal_mintBatch_multiple is UpgradeableMarket {
  function test_2() external {
    _seedRemovals({to: _namedAccounts.supplier, count: 2, list: true});
  }

  function test_4() external {
    _seedRemovals({to: _namedAccounts.supplier, count: 4, list: true});
  }

  function test_8() external {
    _seedRemovals({to: _namedAccounts.supplier, count: 8, list: true});
  }

  function test_16() external {
    _seedRemovals({to: _namedAccounts.supplier, count: 16, list: true});
  }

  function test_32() external {
    _seedRemovals({to: _namedAccounts.supplier, count: 32, list: true});
  }
}

/** @dev Tests that a supplier can be listed in the queue twice with two sequential calls to `mintBatch` */
contract Removal_mintBatch_list_sequential is UpgradeableMarket {
  function test() external {
    _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true});
    DecodedRemovalIdV0[] memory ids = new DecodedRemovalIdV0[](1);
    ids[0] = DecodedRemovalIdV0({
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
    DecodedRemovalIdV0[] memory ids = new DecodedRemovalIdV0[](1);
    ids[0] = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier
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

contract Removal_mintBatch_zero_amount_removal is UpgradeableMarket {
  function test() external {
    DecodedRemovalIdV0[] memory ids = new DecodedRemovalIdV0[](1);
    ids[0] = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier
    });
    _removal.mintBatch({
      to: _namedAccounts.supplier,
      amounts: new uint256[](1).fill(0 ether),
      removals: ids,
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
  }
}

contract Removal_mintBatch_zero_amount_removal_to_market_reverts is
  UpgradeableMarket
{
  function test() external {
    DecodedRemovalIdV0[] memory ids = new DecodedRemovalIdV0[](1);
    ids[0] = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier
    });
    uint256 removalId = RemovalIdLib.createRemovalId(ids[0]);
    vm.expectRevert(
      abi.encodeWithSelector(InvalidTokenTransfer.selector, removalId)
    );
    _removal.mintBatch({
      to: address(_market),
      amounts: new uint256[](1).fill(0 ether),
      removals: ids,
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
  }
}

contract Removal_addBalance is UpgradeableMarket {
  uint256[] _removalIds;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false
    });
  }

  function test() external {
    uint256 removalId = _removalIds[0];
    _removal.addBalance({
      to: _namedAccounts.supplier,
      amounts: new uint256[](1).fill(2 ether),
      ids: new uint256[](1).fill(removalId)
    });
    assertEq(_removal.balanceOf(_namedAccounts.supplier, removalId), 3 ether);
  }
}

contract Removal_addBalance_reverts_RemovalNotYetMinted is UpgradeableMarket {
  function test() external {
    uint256 unmintedTokenId = RemovalIdLib.createRemovalId({
      removal: DecodedRemovalIdV0({
        idVersion: 0,
        methodology: 1,
        methodologyVersion: 0,
        vintage: 2018,
        country: "US",
        subdivision: "IA",
        supplierAddress: _namedAccounts.supplier,
        subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier + 1
      })
    });
    vm.expectRevert(
      abi.encodeWithSelector(RemovalNotYetMinted.selector, unmintedTokenId)
    );
    _removal.addBalance({
      to: _namedAccounts.supplier,
      amounts: new uint256[](1).fill(1 ether),
      ids: new uint256[](1).fill(unmintedTokenId)
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
    DecodedRemovalIdV0[] calldata removals,
    uint256 projectId
  ) external {
    _createRemovals({removals: removals, projectId: projectId});
  }

  function test() external {
    DecodedRemovalIdV0[] memory removals = new DecodedRemovalIdV0[](1);
    removals[0] = DecodedRemovalIdV0({
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
    DecodedRemovalIdV0[] memory removals = new DecodedRemovalIdV0[](1);
    removals[0] = DecodedRemovalIdV0({
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
    _createRemoval({id: 1, projectId: 1});
  }

  function test_reverts_InvalidData() external {
    _createRemoval({id: 1, projectId: 1});
    vm.expectRevert(InvalidData.selector);
    _createRemoval({id: 1, projectId: 1});
  }
}

contract Removal__validateRemoval is NonUpgradeableRemoval {
  function setUp() external {
    _createRemoval({id: 1, projectId: 1});
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
  uint8[] private _retrievedHoldbackPercentages;

  function setUp() external {
    DecodedRemovalIdV0[] memory removalBatch = new DecodedRemovalIdV0[](1);
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
    uint256 numberOfRemovalIds = _removalIds.length;
    bytes[] memory getHoldbackPercentageCalls = new bytes[](numberOfRemovalIds);
    for (uint256 i = 0; i < numberOfRemovalIds; i++) {
      getHoldbackPercentageCalls[i] = abi.encodeWithSelector(
        _removal.getHoldbackPercentage.selector,
        _removalIds[i]
      );
    }
    bytes[] memory results = _removal.multicall(getHoldbackPercentageCalls);
    for (uint256 i = 0; i < numberOfRemovalIds; i++) {
      _retrievedHoldbackPercentages.push(uint8(uint256(bytes32(results[i]))));
    }
  }

  function test() external {
    assertEq(_holdbackPercentages, _retrievedHoldbackPercentages);
  }
}

contract Removal_batchGetHoldbackPercentages_multipleIds is UpgradeableMarket {
  uint8 private constant _secondHoldbackPercentage = 10;
  uint8 private constant _firstHoldbackPercentage = 50;
  uint256[] private _removalIds;
  uint8[] private _holdbackPercentages;
  uint256 private _secondRemovalId;
  uint8[] private _retrievedHoldbackPercentages;

  function setUp() external {
    DecodedRemovalIdV0[]
      memory firstRemovalBatchFixture = new DecodedRemovalIdV0[](1);
    firstRemovalBatchFixture[0] = REMOVAL_DATA_FIXTURE;
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      firstRemovalBatchFixture,
      1_234_567_890,
      block.timestamp,
      _firstHoldbackPercentage
    );
    DecodedRemovalIdV0[]
      memory secondRemovalBatchFixture = new DecodedRemovalIdV0[](1);
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
    uint256 numberOfRemovalIds = _removalIds.length;
    bytes[] memory getHoldbackPercentageCalls = new bytes[](numberOfRemovalIds);
    for (uint256 i = 0; i < numberOfRemovalIds; i++) {
      getHoldbackPercentageCalls[i] = abi.encodeWithSelector(
        _removal.getHoldbackPercentage.selector,
        _removalIds[i]
      );
    }
    bytes[] memory results = _removal.multicall(getHoldbackPercentageCalls);
    for (uint256 i = 0; i < numberOfRemovalIds; i++) {
      _retrievedHoldbackPercentages.push(uint8(uint256(bytes32(results[i]))));
    }
  }

  function test() external {
    assertEq(_holdbackPercentages, _retrievedHoldbackPercentages);
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
    uint256 checkoutTotal = _market.calculateCheckoutTotal(1 ether); // todo replace other test usage of _market.calculateNoriFee
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
    uint256 checkoutTotal = _market.calculateCheckoutTotal(1 ether); // todo replace other test usage of _market.calculateNoriFee
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
    uint256 cumulativeCheckoutTotal = _market.calculateCheckoutTotal(100 ether);
    vm.prank(_namedAccounts.admin); // todo investigate why this is the only time we need to prank the admin
    _bpNori.deposit(owner, abi.encode(cumulativeCheckoutTotal));
    for (uint256 i = 0; i < 100; i++) {
      uint256 checkoutTotal = _market.calculateCheckoutTotal(1 ether); // todo replace other test usage of _market.calculateNoriFee
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
    uint256 checkoutTotal = _market.calculateCheckoutTotal(0.25 ether);
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
    uint256 checkoutTotal = _market.calculateCheckoutTotal(0.5 ether);
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
    uint256 checkoutTotal = _market.calculateCheckoutTotal(amountToSell);
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
      DecodedRemovalIdV0({
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

contract Removal_safeTransferFrom_reverts_when_paused is UpgradeableMarket {
  uint256[] private _removalIds;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false
    });
    _removal.pause();
  }

  function test() external {
    vm.expectRevert("Pausable: paused");
    _removal.safeTransferFrom({
      from: _namedAccounts.supplier,
      to: address(_market),
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

contract Removal_grantRole is UpgradeableMarket {
  function setUp() external {
    _removal.pause();
  }

  function test_reverts_when_paused() external {
    bytes32 adminRole = _removal.DEFAULT_ADMIN_ROLE();
    vm.expectRevert("Pausable: paused");
    _removal.grantRole(adminRole, _namedAccounts.supplier);
  }
}

contract Removal_renounceRole is UpgradeableMarket {
  function setUp() external {
    _removal.pause();
  }

  function test_reverts_when_paused() external {
    bytes32 adminRole = _removal.DEFAULT_ADMIN_ROLE();
    vm.expectRevert("Pausable: paused");
    _removal.renounceRole(adminRole, address(this));
  }
}

contract Removal_revokeRole is UpgradeableMarket {
  bytes32 private adminRole;

  function setUp() external {
    adminRole = _removal.DEFAULT_ADMIN_ROLE();
    _removal.grantRole(adminRole, _namedAccounts.supplier);
    _removal.pause();
  }

  function test_reverts_when_paused() external {
    vm.expectRevert("Pausable: paused");
    _removal.revokeRole(adminRole, _namedAccounts.supplier);
  }
}

contract Removal_getOwnedTokenIds is UpgradeableMarket {
  uint256[] private _removalIds;

  function test_no_tokens() external {
    assertEq(
      _removal.getOwnedTokenIds(_namedAccounts.supplier),
      new uint256[](0)
    );
  }

  function test_multiple_tokens_with_transfer() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 3,
      list: false
    });
    assertEq(_removal.getOwnedTokenIds(_namedAccounts.supplier), _removalIds);
    // list one token
    _removal.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[0],
      amount: 1 ether
    });
    uint256[] memory expectedSupplierIds = _removalIds.slice(1, 3);
    uint256[] memory retrievedSupplierTokens = _removal.getOwnedTokenIds(
      _namedAccounts.supplier
    );
    // ordering no longer guaranteed the same because of set usage, so compare with contains
    for (uint256 i = 0; i < expectedSupplierIds.length; i++) {
      assertContains(retrievedSupplierTokens, expectedSupplierIds[i]);
    }
    assertEq(
      _removal.getOwnedTokenIds(address(_market)),
      _removalIds.slice(0, 1)
    );
    // list the rest of the tokens
    _removal.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[1],
      amount: 1 ether
    });
    _removal.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[2],
      amount: 1 ether
    });
    // expect no tokens owned by supplier
    assertEq(
      _removal.getOwnedTokenIds(_namedAccounts.supplier),
      new uint256[](0)
    );
    uint256[] memory retrievedMarketTokens = _removal.getOwnedTokenIds(
      address(_market)
    );
    // all tokens belong to market
    // ordering no longer guaranteed the same because of set usage, so compare with contains
    for (uint256 i = 0; i < _removalIds.length; i++) {
      assertContains(retrievedMarketTokens, _removalIds[i]);
    }
  }
}
