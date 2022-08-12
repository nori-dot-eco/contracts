/* solhint-disable contract-name-camelcase, func-name-mixedcase, not-rely-on-time */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";
import {DecodedRemovalIdV0} from "@/contracts/RemovalIdLib.sol";
import {AddressArrayLib, UInt256ArrayLib} from "@/contracts/ArrayLib.sol";

using AddressArrayLib for address[];
using UInt256ArrayLib for uint256[];

abstract contract Checkout is UpgradeableMarket {
  uint256[] internal _removalIds;
  uint256 internal _certificateTokenId;

  function _assertExpectedBalances(
    address owner,
    uint256 amount,
    bool ownsRemovalTokenId,
    uint256 count
  ) internal {
    assertEq(
      _removal.balanceOf({account: owner, id: _removalIds[0]}),
      ownsRemovalTokenId ? amount : 0
    );
    assertEq(_removal.numberOfTokensOwnedByAddress(owner), count);
  }
}

contract Checkout_buyingFromOneRemoval is Checkout {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
  }

  function test() external {
    // todo refactor so assertions
    // todo refactor so setup lives in this contracts setUp function (improves gas reporting)
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 amount = _market.calculateCheckoutTotal(1 ether);
    uint256 certificateAmount = _market
      .calculateCertificateAmountFromPurchaseTotal(amount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(amount));
    assertEq(_removal.getMarketBalance(), 1 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 1);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(
      _certificate.balanceOfRemoval(_certificateTokenId, _removalIds[0]),
      0
    );
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    SignedPermit memory signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      amount,
      1 days,
      _bpNori
    );
    vm.prank(owner);
    _market.swap(
      owner,
      amount,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), certificateAmount, true, 1);
    assertEq(
      _certificate.balanceOfRemoval(_certificateTokenId, _removalIds[0]),
      certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), owner);
  }
}

contract Checkout_buyingFromTenRemovals is Checkout {
  uint256 private _expectedCertificateAmount;
  uint256 private _purchaseAmount;
  address private _owner;
  SignedPermit private _signedPermit;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 10,
      list: true
    });
    _purchaseAmount = _market.calculateCheckoutTotal(10 ether);
    _expectedCertificateAmount = _market
      .calculateCertificateAmountFromPurchaseTotal(_purchaseAmount);
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_market)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the market to own the removals"
    );
    assertEq(_removal.getMarketBalance(), 10 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 10);
    assertEq(_expectedCertificateAmount, 10 ether);
    uint256 ownerPrivateKey = 0xA11CE;
    _owner = vm.addr(ownerPrivateKey);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(_purchaseAmount));
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    vm.prank(_owner);
    _signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      _purchaseAmount,
      1 days,
      _bpNori
    );
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(
      _certificate.balanceOfRemoval(_certificateTokenId, _removalIds[0]),
      0
    );
  }

  function test() external {
    vm.prank(_owner);
    _market.swap(
      _owner,
      _purchaseAmount,
      _signedPermit.permit.deadline,
      _signedPermit.v,
      _signedPermit.r,
      _signedPermit.s
    );
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_certificate)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the certificate to own the removals"
    );
    assertEq(
      _certificate.removalsOfCertificate(0).length,
      _removalIds.length,
      "Expected the number removals held by the certificate to be equal to the number of removal IDs"
    );
    for (uint256 i = 0; i < 10; i++) {
      assertContains(
        _removalIds,
        _certificate.removalsOfCertificate(0)[i].id,
        "Expected the certificate to hold the removal"
      );
    }
    assertEq(
      _certificate.balanceOfRemoval(_certificateTokenId, _removalIds[0]),
      _expectedCertificateAmount / _removalIds.length,
      "Removal balance is wrong"
    );
    assertEq(
      _certificate.ownerOf(_certificateTokenId),
      _owner,
      "The wrong owner has the certificate"
    );
  }
}

contract Checkout_buyingFromTenRemovals_singleSupplier is Checkout {
  uint256 private _expectedCertificateAmount;
  uint256 private _purchaseAmount;
  address private _owner;
  SignedPermit private _signedPermit;

  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 10,
      list: true
    });
    _purchaseAmount = _market.calculateCheckoutTotal(10 ether);
    _expectedCertificateAmount = _market
      .calculateCertificateAmountFromPurchaseTotal(_purchaseAmount);
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_market)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the market to own the removals"
    );
    assertEq(_removal.getMarketBalance(), 10 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 10);
    assertEq(_expectedCertificateAmount, 10 ether);
    uint256 ownerPrivateKey = 0xA11CE;
    _owner = vm.addr(ownerPrivateKey);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(_purchaseAmount));
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    vm.prank(_owner);
    _signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      _purchaseAmount,
      1 days,
      _bpNori
    );
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(
      _certificate.balanceOfRemoval(_certificateTokenId, _removalIds[0]),
      0
    );
  }

  function test() external {
    vm.prank(_owner);
    _market.swapFromSupplier({
      recipient: _owner,
      amount: _purchaseAmount,
      supplier: _namedAccounts.supplier,
      deadline: _signedPermit.permit.deadline,
      v: _signedPermit.v,
      r: _signedPermit.r,
      s: _signedPermit.s
    });
    _assertExpectedBalances(address(_market), 0, false, 0);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_certificate)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the certificate to own the removals"
    );
    assertEq(
      _certificate.removalsOfCertificate(0).length,
      _removalIds.length,
      "Expected the number removals held by the certificate to be equal to the number of removal IDs"
    );
    for (uint256 i = 0; i < 10; i++) {
      assertContains(
        _removalIds,
        _certificate.removalsOfCertificate(0)[i].id,
        "Expected the certificate to hold the removal"
      );
    }
    assertEq(
      _certificate.balanceOfRemoval(_certificateTokenId, _removalIds[0]),
      _expectedCertificateAmount / _removalIds.length,
      "Removal balance is wrong"
    );
    assertEq(
      _certificate.ownerOf(_certificateTokenId),
      _owner,
      "The wrong owner has the certificate"
    );
  }
}

contract Checkout_buyingFromTenSuppliers is Checkout {
  uint256 private _expectedCertificateAmount;
  uint256 private _purchaseAmount;
  address private _owner;
  SignedPermit private _signedPermit;

  function setUp() external {
    for (uint256 i = 0; i < 10; i++) {
      uint256[] memory localRemovalIds = _seedRemovals({
        to: vm.addr(i + 1), // unique, arbitrary supplier address for each removal (pk can't be 0)
        count: 1,
        list: true
      });
      _removalIds.push(localRemovalIds[0]);
    }
    _purchaseAmount = _market.calculateCheckoutTotal(10 ether);
    _expectedCertificateAmount = _market
      .calculateCertificateAmountFromPurchaseTotal(_purchaseAmount);
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_market)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the market to own the removals"
    );
    assertEq(_removal.getMarketBalance(), 10 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 10);
    assertEq(_expectedCertificateAmount, 10 ether);
    uint256 ownerPrivateKey = 0xA11CE;
    _owner = vm.addr(ownerPrivateKey);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_owner, abi.encode(_purchaseAmount));
    vm.expectRevert(IERC721AUpgradeable.OwnerQueryForNonexistentToken.selector);
    _certificate.ownerOf(_certificateTokenId);
    vm.prank(_owner);
    _signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      _purchaseAmount,
      1 days,
      _bpNori
    );
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(
      _certificate.balanceOfRemoval(_certificateTokenId, _removalIds[0]),
      0
    );
  }

  function test() external {
    vm.prank(_owner);
    _market.swap(
      _owner,
      _purchaseAmount,
      _signedPermit.permit.deadline,
      _signedPermit.v,
      _signedPermit.r,
      _signedPermit.s
    );
    _assertExpectedBalances(address(_market), 0, false, 0);
    // _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    assertEq(
      _removal.balanceOfBatch(
        new address[](_removalIds.length).fill(address(_certificate)),
        _removalIds
      ),
      new uint256[](_removalIds.length).fill(1 ether),
      "Expected the certificate to own the removals"
    );
    assertEq(
      _certificate.removalsOfCertificate(0).length,
      _removalIds.length,
      "Expected the number removals held by the certificate to be equal to the number of removal IDs"
    );
    for (uint256 i = 0; i < 10; i++) {
      assertContains(
        _removalIds,
        _certificate.removalsOfCertificate(0)[i].id,
        "Expected the certificate to hold the removal"
      );
    }
    assertEq(
      _certificate.balanceOfRemoval(_certificateTokenId, _removalIds[0]),
      _expectedCertificateAmount / _removalIds.length,
      "Removal balance is wrong"
    );
    assertEq(
      _certificate.ownerOf(_certificateTokenId),
      _owner,
      "The wrong owner has the certificate"
    );
  }
}
