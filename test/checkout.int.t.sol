/* solhint-disable contract-name-camelcase, func-name-mixedcase, not-rely-on-time */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";
import {UnpackedRemovalIdV0} from "@/contracts/RemovalUtils.sol";

abstract contract Checkout is UpgradeableMarket, SeedableMock, RemovalSeeded {
  uint256 internal _removalId;
  uint256 internal _certificateTokenId;

  function _seed() internal override(UpgradableRemovalMock, SeedableMock) {} // todo maybe making this required is bad

  function _seed(uint32 subIdentifier) internal returns (uint256) {
    // todo paramaterize better
    UnpackedRemovalIdV0 memory removalData = UnpackedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "AA",
      subdivision: "ZZ",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: subIdentifier
    });
    BatchMintRemovalsData memory batchMintData = BatchMintRemovalsData({
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50,
      list: true
    });
    _removalId = RemovalUtils.createRemovalIdFromStruct(removalData);
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1 ether),
      _asSingletonUintArray(_removalId), // todo encode ID or test won't work
      batchMintData
    );
    return _removalId;
  }

  function _assertExpectedBalances(
    address owner,
    uint256 amount,
    bool ownsRemovalTokenId,
    uint256 count
  ) internal {
    assertEq(
      _removal.tokensOfOwner(owner),
      ownsRemovalTokenId
        ? _certificate.removalsOfCertificate(0)
        : new uint256[](amount)
    );
    assertEq(_removal.cumulativeBalanceOf(owner), amount);
    assertEq(_removal.numberOfTokensOwnedByAddress(owner), count);
  }
}

contract Checkout_buyingFromOneRemoval is Checkout {
  function setUp() external {
    _seed(99_039_930);
  }

  function test() external {
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 amount = _market.getCheckoutTotal(1 ether);
    uint256 certificateAmount = _market.certificateAmountFromPurchaseTotal(
      amount
    );
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(amount));
    // todo refactor so pre-assertions and setup to live in this contracts setUp function (improves gas reporting)
    assertEq(_removal.cumulativeBalanceOf(address(_market)), 1 ether);
    assertEq(_removal.numberOfTokensOwnedByAddress(address(_market)), 1);
    _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    _assertExpectedBalances(address(_certificate), 0, false, 0);
    assertEq(_certificate.balanceOfRemoval(_certificateTokenId, _removalId), 0);
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
    // _assertExpectedBalances(address(_market), 0, false, 0);
    // _assertExpectedBalances(_namedAccounts.supplier, 0, false, 0);
    // _assertExpectedBalances(address(_certificate), certificateAmount, true, 1);
    // assertEq(
    //   _certificate.balanceOfRemoval(_certificateTokenId, _removalId),
    //   certificateAmount
    // );
    assertEq(_certificate.ownerOf(_certificateTokenId), owner);
  }
}

contract Checkout_buyingFromTenRemovals is Checkout {
  uint256[] private _removalIds;
  uint256 private _expectedCertificateAmount;
  uint256 private _purchaseAmount;
  address private _owner;
  SignedPermit private _signedPermit;

  function setUp() external {
    _removalIds.push(_seed(1_234_567_890));
    _removalIds.push(_seed(1_234_567_891));
    _removalIds.push(_seed(1_234_567_892));
    _removalIds.push(_seed(1_234_567_893));
    _removalIds.push(_seed(1_234_567_894));
    _removalIds.push(_seed(1_234_567_895));
    _removalIds.push(_seed(1_234_567_896));
    _removalIds.push(_seed(1_234_567_897));
    _removalIds.push(_seed(1_234_567_898));
    _removalIds.push(_seed(1_234_567_899));
    _purchaseAmount = _market.getCheckoutTotal(10 ether);
    _expectedCertificateAmount = _market.certificateAmountFromPurchaseTotal(
      _purchaseAmount
    );
    assertEq(_removal.tokensOfOwner(address(_market)), _removalIds);
    assertEq(_removal.cumulativeBalanceOf(address(_market)), 10 ether);
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
    _assertExpectedBalances(
      address(_certificate),
      _expectedCertificateAmount,
      true,
      10
    );
    assertEq(
      _certificate.balanceOfRemoval(_certificateTokenId, _removalIds[0]),
      _expectedCertificateAmount / _removalIds.length
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), _owner);
  }
}
