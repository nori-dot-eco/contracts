/* solhint-disable contract-name-camelcase, func-name-mixedcase, reason-string */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/market.sol";
import {ForbiddenTransfer} from "@/contracts/Errors.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";

using UInt256ArrayLib for uint256[];
using AddressArrayLib for address[];

// todo fuzz RemovalIdLib
// todo test that checks Removal.consign can happen using multi call with mix-match project IDs

contract Removal_retire_revertsIfRemovalBalanceSumDifferentFromCertificateAmount is
  UpgradeableMarket
{
  /*//////////////////////////////////////////////////////////////
                                INPUTS
    //////////////////////////////////////////////////////////////*/
  uint256 constant NUMBER_OF_SUPPLIERS = 2;
  uint256 constant AMOUNT_PER_REMOVAL = 1 ether; // cannot be changed as it is not a parameter of `_seedRemovals`
  uint32 constant NUMBER_OF_REMOVALS_PER_SUPPLIER = 5;
  uint256 constant EXPECTED_CERTIFICATE_ID = 0;
  uint256 constant NUMBER_OF_REMOVALS =
    NUMBER_OF_SUPPLIERS * NUMBER_OF_REMOVALS_PER_SUPPLIER;
  uint256 constant CERTIFICATE_AMOUNT = NUMBER_OF_REMOVALS * 1.5 ether; // != sum of removal balances!

  /*//////////////////////////////////////////////////////////////
                DYNAMIC ARGUMENTS (BUILT FROM INPUTS)
    //////////////////////////////////////////////////////////////*/
  uint256[] amountsForAllSuppliers;
  uint256[] idsForAllSuppliers;
  uint256[] amountsPerSupplier;
  address[] suppliers;

  function setUp() external {
    // todo reuse setup in Removal_retire_gasLimit
    _removal.grantRole({
      role: _removal.CONSIGNOR_ROLE(),
      account: _namedAccounts.admin
    });
    amountsForAllSuppliers = new uint256[](NUMBER_OF_REMOVALS).fill(
      AMOUNT_PER_REMOVAL
    );
    idsForAllSuppliers = new uint256[](NUMBER_OF_REMOVALS);
    suppliers = new address[](NUMBER_OF_SUPPLIERS);
    for (uint256 i = 0; i < NUMBER_OF_SUPPLIERS; ++i) {
      suppliers[i] = account({
        name: string.concat("legacySupplier", StringsUpgradeable.toString(i))
      });
    }
    uint256 index = 0;
    for (uint256 i = 0; i < suppliers.length; ++i) {
      uint256[] memory idsForSupplier = _seedRemovals({
        consignor: _namedAccounts.admin,
        count: NUMBER_OF_REMOVALS_PER_SUPPLIER,
        supplier: suppliers[i],
        uniqueVintages: true
      });
      for (uint256 j = 0; j < idsForSupplier.length; ++j) {
        idsForAllSuppliers[index] = idsForSupplier[j];
        ++index;
      }
    }
  }

  function test() external {
    vm.prank(_namedAccounts.admin);
    vm.expectRevert("Incorrect supply allocation");
    _removal.retire({
      ids: idsForAllSuppliers,
      amounts: amountsForAllSuppliers,
      certificateRecipient: _namedAccounts.buyer,
      certificateAmount: CERTIFICATE_AMOUNT
    });
  }
}

contract Removal_consign_revertsForSoldRemovals is UpgradeableMarket {
  uint256[] private _removalIds;

  function test() external {
    uint256 amount = 0.5 ether;
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false
    });
    assertEq(_removal.getMarketBalance(), 0);
    _removal.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[0],
      amount: amount
    });
    assertEq(_removal.getMarketBalance(), amount);
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 checkoutTotal = _market.calculateCheckoutTotal(amount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(checkoutTotal));
    SignedPermit memory signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      checkoutTotal,
      1 days,
      _bpNori
    );
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), owner);
    vm.prank(owner);
    _market.swap(
      owner,
      amount,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    assertEq(_removal.getMarketBalance(), 0);

    // sold Removal is now locked in a Certificate
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), amount);

    // should not be able to re-list the sold Removal
    vm.expectRevert(
      abi.encodeWithSelector(
        RemovalAlreadySoldOrConsigned.selector,
        _removalIds[0]
      )
    );
    _removal.consign({
      from: address(_certificate),
      id: _removalIds[0],
      amount: amount
    });
  }
}

contract Removal_retire is UpgradeableMarket {
  /*//////////////////////////////////////////////////////////////
                                INPUTS
    //////////////////////////////////////////////////////////////*/
  uint256 constant NUMBER_OF_SUPPLIERS = 2;
  uint256 constant AMOUNT_PER_REMOVAL = 1 ether; // cannot be changed as it is not a parameter of `_seedRemovals`
  uint32 constant NUMBER_OF_REMOVALS_PER_SUPPLIER = 5;
  uint256 constant EXPECTED_CERTIFICATE_ID = 0;
  uint256 constant NUMBER_OF_REMOVALS =
    NUMBER_OF_SUPPLIERS * NUMBER_OF_REMOVALS_PER_SUPPLIER;
  uint256 constant CERTIFICATE_AMOUNT = NUMBER_OF_REMOVALS * AMOUNT_PER_REMOVAL;

  /*//////////////////////////////////////////////////////////////
                DYNAMIC ARGUMENTS (BUILT FROM INPUTS)
    //////////////////////////////////////////////////////////////*/
  uint256[] amountsForAllSuppliers;
  uint256[] idsForAllSuppliers;
  uint256[] amountsPerSupplier;
  address[] suppliers;

  function setUp() external {
    // todo reuse setup in Removal_retire_gasLimit
    _removal.grantRole({
      role: _removal.CONSIGNOR_ROLE(),
      account: _namedAccounts.admin
    });
    amountsForAllSuppliers = new uint256[](NUMBER_OF_REMOVALS).fill(
      AMOUNT_PER_REMOVAL
    );
    idsForAllSuppliers = new uint256[](NUMBER_OF_REMOVALS);
    suppliers = new address[](NUMBER_OF_SUPPLIERS);
    for (uint256 i = 0; i < NUMBER_OF_SUPPLIERS; ++i) {
      suppliers[i] = account({
        name: string.concat("legacySupplier", StringsUpgradeable.toString(i))
      });
    }
    uint256 index = 0;
    for (uint256 i = 0; i < suppliers.length; ++i) {
      uint256[] memory idsForSupplier = _seedRemovals({
        consignor: _namedAccounts.admin,
        count: NUMBER_OF_REMOVALS_PER_SUPPLIER,
        supplier: suppliers[i],
        uniqueVintages: true
      });
      for (uint256 j = 0; j < idsForSupplier.length; ++j) {
        idsForAllSuppliers[index] = idsForSupplier[j];
        ++index;
      }
    }
  }

  event Retire(
    address indexed certificateRecipient,
    uint256 indexed certificateAmount,
    uint256 indexed certificateId,
    uint256[] removalIds,
    uint256[] removalAmounts
  );

  function test() external {
    vm.prank(_namedAccounts.admin);
    vm.recordLogs();
    _removal.retire({
      ids: idsForAllSuppliers,
      amounts: amountsForAllSuppliers,
      certificateRecipient: _namedAccounts.buyer,
      certificateAmount: CERTIFICATE_AMOUNT
    });
    assertEq(
      _certificate.ownerOf({tokenId: EXPECTED_CERTIFICATE_ID}),
      _namedAccounts.buyer
    );
    assertEq(
      _certificate.getPurchaseAmount({certificateId: EXPECTED_CERTIFICATE_ID}),
      CERTIFICATE_AMOUNT
    );
    Vm.Log[] memory entries = vm.getRecordedLogs();
    assertEq(entries.length, 4);
    assertEq(
      entries[0].topics[0],
      keccak256("Retire(address,uint256,uint256,uint256[],uint256[])") // todo if we move contract events to interfaces we can use IRemoval.Retire.selector instead
    );
    assertEq(entries[0].topics.length, 4);
    assertEq(
      entries[0].topics[1],
      bytes32(uint256(uint160(_namedAccounts.buyer)))
    );
    assertEq(entries[0].topics[2], bytes32(CERTIFICATE_AMOUNT));
    assertEq(entries[0].topics[3], bytes32(EXPECTED_CERTIFICATE_ID));
    (uint256[] memory decodedIds, uint256[] memory decodedAmounts) = abi.decode(
      entries[0].data,
      (uint256[], uint256[])
    );
    assertEq(decodedAmounts, amountsForAllSuppliers);
    assertEq(decodedIds, idsForAllSuppliers);
  }
}

contract Removal_retire_gasLimit is UpgradeableMarket {
  /*//////////////////////////////////////////////////////////////
                                INPUTS
    //////////////////////////////////////////////////////////////*/
  uint256 constant NUMBER_OF_SUPPLIERS = 7;
  uint256 constant AMOUNT_PER_REMOVAL = 1 ether; // cannot be changed as it is not a parameter of `_seedRemovals`
  uint32 constant NUMBER_OF_REMOVALS_PER_SUPPLIER = 28;
  uint256 constant EXPECTED_CERTIFICATE_ID = 0;
  uint256 constant NUMBER_OF_REMOVALS =
    NUMBER_OF_SUPPLIERS * NUMBER_OF_REMOVALS_PER_SUPPLIER;
  uint256 constant CERTIFICATE_AMOUNT = NUMBER_OF_REMOVALS * AMOUNT_PER_REMOVAL;

  /*//////////////////////////////////////////////////////////////
                DYNAMIC ARGUMENTS (BUILT FROM INPUTS)
    //////////////////////////////////////////////////////////////*/
  uint256[] amountsForAllSuppliers;
  uint256[] idsForAllSuppliers;
  uint256[] amountsPerSupplier;
  address[] suppliers;

  function setUp() external {
    _removal.grantRole({
      role: _removal.CONSIGNOR_ROLE(),
      account: _namedAccounts.admin
    });
    amountsForAllSuppliers = new uint256[](NUMBER_OF_REMOVALS).fill(
      AMOUNT_PER_REMOVAL
    );
    idsForAllSuppliers = new uint256[](NUMBER_OF_REMOVALS);
    suppliers = new address[](NUMBER_OF_SUPPLIERS);
    for (uint256 i = 0; i < NUMBER_OF_SUPPLIERS; ++i) {
      suppliers[i] = account({
        name: string.concat("legacySupplier", StringsUpgradeable.toString(i))
      });
    }
    uint256 index = 0;
    for (uint256 i = 0; i < suppliers.length; ++i) {
      uint256[] memory idsForSupplier = _seedRemovals({
        consignor: _namedAccounts.admin,
        count: NUMBER_OF_REMOVALS_PER_SUPPLIER,
        supplier: suppliers[i],
        uniqueVintages: true
      });
      for (uint256 j = 0; j < idsForSupplier.length; ++j) {
        idsForAllSuppliers[index] = idsForSupplier[j];
        ++index;
      }
    }
  }

  function test() external {
    vm.prank(_namedAccounts.admin);
    uint256 initialGas = gasleft();
    _removal.retire({
      ids: idsForAllSuppliers,
      amounts: amountsForAllSuppliers,
      certificateRecipient: _namedAccounts.buyer,
      certificateAmount: CERTIFICATE_AMOUNT
    });
    uint256 gasUsed = initialGas - gasleft();
    assertLt(gasUsed, 30_000_000, "Migration required more than 30m gas");
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
      to: _namedAccounts.supplier2, // not the supplier encoded in the removal ID
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
    vm.expectRevert(abi.encodeWithSelector(ForbiddenTransfer.selector));
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

contract Removal_release_listed_isRemovedFromMarket is UpgradeableMarket {
  uint256 private constant _REMOVAL_AMOUNT = 1 ether;

  function test() external {
    _removal.mintBatch({
      to: _marketAddress,
      amounts: _asSingletonUintArray(_REMOVAL_AMOUNT),
      removals: _REMOVAL_FIXTURES,
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, REMOVAL_ID_FIXTURE),
      0
    );
    assertEq(
      _removal.balanceOf(address(_market), REMOVAL_ID_FIXTURE),
      _REMOVAL_AMOUNT
    );

    // Expect the Removal to be listed on the Market
    assertEq(
      _market.getRemovalIdsForSupplier(_namedAccounts.supplier).length,
      1
    );

    _removal.release(REMOVAL_ID_FIXTURE, _REMOVAL_AMOUNT);
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, REMOVAL_ID_FIXTURE),
      0
    );
    assertEq(_removal.balanceOf(address(_market), REMOVAL_ID_FIXTURE), 0);

    // Expect the Removal to be pulled from the Market
    assertEq(
      _market.getRemovalIdsForSupplier(_namedAccounts.supplier).length,
      0,
      "Listing not removed from Market"
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
    uint256 certificateAmount = 1 ether;
    uint256 checkoutTotal = _market.calculateCheckoutTotal(certificateAmount); // todo replace other test usage of _market.calculateNoriFee
    vm.prank(_namedAccounts.admin); // todo investigate why this is the only time we need to prank the admin
    _bpNori.deposit(owner, abi.encode(checkoutTotal));
    SignedPermit memory signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      checkoutTotal,
      1 days,
      _bpNori
    );
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), owner);
    vm.prank(owner);
    _market.swap(
      owner,
      certificateAmount,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      1 ether
    );
    vm.prank(owner);
    _certificate.burn(0);
  }

  function test() external {
    _removal.release(_removalIds[0], 1 ether);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
    assertEq(_removal.totalSupply(_removalIds[0]), 0);
    assertEq(_removal.exists(_removalIds[0]), false);
  }

  function testDecrementsCertificateDiscrepancy() external {
    assertEq(_certificate.getNrtDeficit(), 0);
    _removal.release(_removalIds[0], 1 ether);
    assertEq(_certificate.getNrtDeficit(), 1 ether);
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
    uint256 certificateAmount = 1 ether;
    uint256 checkoutTotal = _market.calculateCheckoutTotal(certificateAmount); // todo replace other test usage of _market.calculateNoriFee
    vm.prank(_namedAccounts.admin); // todo investigate why this is the only time we need to prank the admin
    _bpNori.deposit(owner, abi.encode(checkoutTotal));
    SignedPermit memory signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      checkoutTotal,
      1 days,
      _bpNori
    );
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), owner);
    vm.prank(owner);
    _market.swap(
      owner,
      certificateAmount,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      1 ether
    );
  }

  function test() external {
    _removal.release(_removalIds[0], 1 ether);
    assertEq(_removal.balanceOf(address(_certificate), _removalIds[0]), 0);
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
      uint256 certificateAmount = 1 ether;
      uint256 checkoutTotal = _market.calculateCheckoutTotal(certificateAmount); // todo replace other test usage of _market.calculateNoriFee
      SignedPermit memory signedPermit = _signatureUtils.generatePermit(
        ownerPrivateKey,
        address(_market),
        checkoutTotal,
        1 days,
        _bpNori
      );
      _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), owner);
      vm.prank(owner);
      _market.swap(
        owner,
        certificateAmount,
        signedPermit.permit.deadline,
        signedPermit.v,
        signedPermit.r,
        signedPermit.s
      );
    }
    assertEq(
      _removal.balanceOf(address(_certificate), REMOVAL_ID_FIXTURE),
      100 ether
    );
  }

  function test() external {
    _removal.release(REMOVAL_ID_FIXTURE, 100 ether);
    assertEq(_removal.balanceOf(address(_certificate), REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.balanceOf(address(_certificate), REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.totalSupply(REMOVAL_ID_FIXTURE), 0);
    assertEq(_removal.exists(REMOVAL_ID_FIXTURE), false);
  }
}

contract Removal_release_listed is UpgradeableMarket {
  uint256 private constant _REMOVAL_AMOUNT = 1 ether;

  function test() external {
    vm.expectEmit(false, false, false, false); // todo
    emit TransferBatch(
      address(0),
      address(0),
      address(_namedAccounts.supplier),
      _asSingletonUintArray(REMOVAL_ID_FIXTURE),
      _asSingletonUintArray(_REMOVAL_AMOUNT)
    );
    _removal.mintBatch({
      to: _marketAddress,
      amounts: _asSingletonUintArray(_REMOVAL_AMOUNT),
      removals: _REMOVAL_FIXTURES,
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
    assertEq(
      _removal.balanceOf(_namedAccounts.supplier, REMOVAL_ID_FIXTURE),
      0
    );
    assertEq(
      _removal.balanceOf(address(_market), REMOVAL_ID_FIXTURE),
      _REMOVAL_AMOUNT
    );
    _removal.release(REMOVAL_ID_FIXTURE, _REMOVAL_AMOUNT);
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
  uint256[] private _expectedInitialBalances = [
    0.5 ether,
    0.25 ether,
    0.25 ether
  ];
  uint256[] private _expectedReleasedBalances = [
    _expectedInitialBalances[0],
    _expectedInitialBalances[1],
    _expectedInitialBalances[_expectedInitialBalances.length - 1] -
      _expectedBalances[_expectedBalances.length - 1]
  ];
  bytes32 constant TRANSFER_SINGLE_EVENT_SELECTOR =
    keccak256("TransferSingle(address,address,address,uint256,uint256)");
  bytes32 constant REMOVAL_RELEASED_EVENT_SELECTOR =
    keccak256("ReleaseRemoval(uint256,address,uint256)");
  bytes32 constant SUPPLIER_REMOVED_EVENT_SELECTOR =
    keccak256("RemoveSupplier(address,address,address)");
  bytes32[] expectedReleaseEventSelectors = [
    TRANSFER_SINGLE_EVENT_SELECTOR,
    REMOVAL_RELEASED_EVENT_SELECTOR,
    TRANSFER_SINGLE_EVENT_SELECTOR,
    SUPPLIER_REMOVED_EVENT_SELECTOR,
    REMOVAL_RELEASED_EVENT_SELECTOR,
    TRANSFER_SINGLE_EVENT_SELECTOR,
    REMOVAL_RELEASED_EVENT_SELECTOR
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
    uint256 certificateAmount = 0.25 ether;
    uint256 checkoutTotal = _market.calculateCheckoutTotal(certificateAmount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(checkoutTotal));
    SignedPermit memory signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      checkoutTotal,
      1 days,
      _bpNori
    );
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), owner);
    vm.prank(owner);
    _market.swap(
      owner,
      certificateAmount,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    assertEq(
      _removal.balanceOfBatch(
        _expectedOwners,
        new uint256[](_expectedOwners.length).fill(_removalIds[0])
      ),
      _expectedInitialBalances
    );
    vm.recordLogs();
  }

  /**
   * @dev Assert that the `TransferSingle` and `ReleaseRemoval` events are emitted in alternation with the
   * correct arguments (e.g., every second call to each event respectively iterates through `_expectedOwners` and
   * `_expectedReleasedBalances`)
   */
  function validateReleaseEvents() private {
    Vm.Log[] memory entries = vm.getRecordedLogs();
    assertEq(entries.length, expectedReleaseEventSelectors.length);
    uint8 pairCount = 0;
    for (uint256 i = 0; i < entries.length; ++i) {
      assertEq(entries[i].topics[0], expectedReleaseEventSelectors[i]);
      if (entries[i].topics[0] == REMOVAL_RELEASED_EVENT_SELECTOR) {
        assertEq(entries[i].topics[1], bytes32(_removalIds[0]));
        assertEq(
          entries[i].topics[2],
          bytes32(uint256(uint160(_expectedOwners[pairCount])))
        );
        assertEq(
          abi.decode(entries[i].data, (uint256)),
          _expectedReleasedBalances[pairCount]
        );
        pairCount++;
      } else if (entries[i].topics[0] == TRANSFER_SINGLE_EVENT_SELECTOR) {
        assertEq(
          entries[i].topics[1],
          bytes32(uint256(uint160(address(this))))
        );
        assertEq(
          entries[i].topics[2],
          bytes32(uint256(uint160(_expectedOwners[pairCount])))
        );
        assertEq(entries[i].topics[3], bytes32(uint256(uint160(address(0)))));
        (uint256 id, uint256 value) = abi.decode(
          entries[i].data,
          (uint256, uint256)
        );
        assertEq(id, _removalIds[0]);
        assertEq(value, _expectedReleasedBalances[pairCount]);
      } else if (entries[i].topics[0] == SUPPLIER_REMOVED_EVENT_SELECTOR) {
        assertEq(
          entries[i].topics[1],
          bytes32(uint256(uint160(_namedAccounts.supplier)))
        );
        assertEq(
          entries[i].topics[2],
          bytes32(uint256(uint160(_namedAccounts.supplier)))
        );
        assertEq(
          entries[i].topics[3],
          bytes32(uint256(uint160(_namedAccounts.supplier)))
        );
      }
    }
  }

  function test() external {
    _removal.release(_removalIds[0], 0.9 ether);
    validateReleaseEvents();
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
    uint256 certificateAmount = 0.5 ether;
    uint256 checkoutTotal = _market.calculateCheckoutTotal(certificateAmount);
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
      _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), owner);
      vm.prank(owner);
      _market.swap(
        owner,
        certificateAmount,
        signedPermit.permit.deadline,
        signedPermit.v,
        signedPermit.r,
        signedPermit.s
      );
    }
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      1 ether
    );
    assertEq(_certificate.totalMinted(), 2);
  }

  function test() external {
    _removal.release(_removalIds[0], 0.9 ether);
    assertEq(_removal.totalSupply(_removalIds[0]), 0.1 ether);
    assertEq(
      _removal.balanceOf(address(_certificate), _removalIds[0]),
      0.1 ether
    );
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
    _market.grantRole(_market.SWAP_ALLOWLIST_ROLE(), owner);
    vm.prank(owner);
    _market.swap(
      owner,
      amountToSell,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    assertEq(_removal.getMarketBalance(), amountToList - amountToSell);
    _market.withdraw({removalId: _removalIds[0], to: _namedAccounts.supplier});
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
      _asSingletonUintArray(1 ether),
      ""
    );
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

contract Removal_consignorBatchTransfer is UpgradeableMarket {
  uint256[] private _removalIds;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 2,
      list: false
    });
  }

  function test() external {
    _removal.grantRole({
      role: _removal.CONSIGNOR_ROLE(),
      account: _namedAccounts.admin
    });
    assert(_removal.hasRole(_removal.CONSIGNOR_ROLE(), _namedAccounts.admin));
    vm.prank(_namedAccounts.admin);
    _removal.consignorBatchTransfer({
      from: _namedAccounts.supplier,
      to: _namedAccounts.admin,
      ids: _removalIds,
      amounts: new uint256[](2).fill(1 ether)
    });
    assertEq(_removal.balanceOf(_namedAccounts.admin, _removalIds[0]), 1 ether);
    assertEq(_removal.balanceOf(_namedAccounts.admin, _removalIds[1]), 1 ether);
  }

  function test_reverts_whenSenderIsNotConsignor() external {
    assert(!_removal.hasRole(_removal.CONSIGNOR_ROLE(), _namedAccounts.admin));
    vm.expectRevert(
      bytes(
        string.concat(
          "AccessControl: account 0x05127efcd2fc6a781bfed49188da1081670b22d8 is missing role ",
          "0xa269776b75ac4c5fa422bb11bec3ed3cee626848d07687372583174b209261fb"
        )
      )
    );
    vm.prank(_namedAccounts.admin);
    _removal.consignorBatchTransfer({
      from: _namedAccounts.supplier,
      to: _namedAccounts.admin,
      ids: _removalIds,
      amounts: new uint256[](2).fill(1 ether)
    });
  }

  function test_reverts_whenReceiverIsNotConsignor() external {
    _removal.grantRole({
      role: _removal.CONSIGNOR_ROLE(),
      account: _namedAccounts.admin
    });
    assert(_removal.hasRole(_removal.CONSIGNOR_ROLE(), _namedAccounts.admin));
    vm.expectRevert(ForbiddenTransfer.selector);
    vm.prank(_namedAccounts.admin);
    _removal.consignorBatchTransfer({
      from: _namedAccounts.supplier,
      to: _namedAccounts.supplier2,
      ids: _removalIds,
      amounts: new uint256[](2).fill(1 ether)
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

contract Removal__isValidTransferAmount is NonUpgradeableRemoval {
  address private constant _MOCK_MARKET_ADDRESS = address(1);
  address private constant _MOCK_CERTIFICATE_ADDRESS = address(2);

  function setUp() external {
    vm.prank(_namedAccounts.deployer);
    this.registerContractAddresses({
      market: Market(_MOCK_MARKET_ADDRESS),
      certificate: Certificate(_MOCK_CERTIFICATE_ADDRESS)
    });
  }

  function testFuzz_ReturnTrue_SmallestGranularity() external {
    assertEq(
      _isValidTransferAmount({amount: 1e14, to: _namedAccounts.supplier}),
      true
    );
  }

  function testFuzz_ReturnTrue_MultiplesOf1e14(uint256 amount) external {
    amount = 1e14 * bound({x: amount, min: 1e14, max: 1e63});
    vm.assume(amount % 1e14 == 0);
    assertEq(
      _isValidTransferAmount({amount: amount, to: _namedAccounts.supplier}),
      true
    );
  }

  function test_ReturnTrue_AmountIsZeroAndToIsNeitherTheMarketNorCertificate()
    external
  {
    assertEq(
      _isValidTransferAmount({amount: 0, to: _namedAccounts.supplier}),
      true
    );
  }

  function test_ReturnFalse_AmountIsZeroAndToIsTheMarket() external {
    assertEq(
      _isValidTransferAmount({amount: 0, to: _MOCK_MARKET_ADDRESS}),
      false
    );
  }

  function test_ReturnFalse_AmountIsZeroAndToIsTheCertificate() external {
    assertEq(
      _isValidTransferAmount({amount: 0, to: _MOCK_CERTIFICATE_ADDRESS}),
      false
    );
  }

  function test_ReturnFalse_AmountIsTooGranularAndToIsTheCertificate()
    external
  {
    assertEq(
      _isValidTransferAmount({amount: 1, to: _MOCK_CERTIFICATE_ADDRESS}),
      false
    );
  }

  function test_ReturnFalse_AmountIsTooGranularAndToIsTheMarket() external {
    assertEq(
      _isValidTransferAmount({amount: 1, to: _MOCK_MARKET_ADDRESS}),
      false
    );
  }

  function test_ReturnFalse_AmountIsTooGranular() external {
    assertEq(
      _isValidTransferAmount({amount: 1e13, to: _namedAccounts.supplier}),
      false
    );
  }

  function testFuzz_ReturnFalse_NonMultiplesOf1e14(uint256 amount) external {
    amount = bound({x: amount, min: 1, max: type(uint256).max - 1});
    vm.assume(amount % 1e14 != 0);
    assertEq(
      _isValidTransferAmount({amount: amount, to: _namedAccounts.supplier}),
      false
    );
  }
}
