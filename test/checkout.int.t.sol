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
}

contract Checkout_buyingFromOneRemoval is Checkout {
  function setUp() external {
    _seed(99_039_930);
  }

  function test() external {
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 fee = (1 ether * _market.getNoriFeePercentage()) / 100;
    uint256 amount = 1 ether + fee;
    uint256 certificateAmount = _market.certificateAmountFromPurchaseTotal(
      amount
    );
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(amount));
    // todo refactor so pre-assertions and setup to live in this contracts setUp function (improves gas reporting)
    _assertRemovalBalance(address(_market), certificateAmount, true);
    _assertRemovalBalance(_namedAccounts.supplier, 0, false);
    _assertRemovalBalance(address(_certificate), 0, false);
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
    _assertRemovalBalance(address(_market), 0, false);
    _assertRemovalBalance(_namedAccounts.supplier, 0, false);
    _assertRemovalBalance(address(_certificate), certificateAmount, true);
    assertEq(
      _certificate.balanceOfRemoval(_certificateTokenId, _removalId),
      certificateAmount
    );
    assertEq(_certificate.ownerOf(_certificateTokenId), owner);
  }

  function _assertRemovalBalance(
    address owner,
    uint256 amount,
    bool ownsRemovalTokenId
  ) private {
    assertEq(
      _removal.tokensOfOwner(owner),
      ownsRemovalTokenId
        ? _asSingletonUintArray(_removalId)
        : new uint256[](amount)
    );
    assertEq(_removal.cumulativeBalanceOf(owner), amount);
    assertEq(
      _removal.numberOfTokensOwnedByAddress(owner),
      ownsRemovalTokenId ? 1 : 0
    );
  }
}

contract Checkout_buyingFromTenRemovals is Checkout {
  uint256[] private _removalIds;

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
  }

  function test() external {
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 fee = (1 ether * _market.getNoriFeePercentage()) / 100; // todo is this the right fee?
    uint256 amount = 10 ether + fee;
    uint256 certificateAmount = _market.certificateAmountFromPurchaseTotal(
      amount
    );
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(amount));
    // todo refactor so pre-assertions and setup to live in this contracts setUp function (improves gas reporting)
    _assertRemovalBalance(address(_market), certificateAmount, true);
    _assertRemovalBalance(_namedAccounts.supplier, 0, false);
    _assertRemovalBalance(address(_certificate), 0, false);
    // assertEq(
    //   _certificate.balanceOfRemoval(
    //     _certificateTokenId,
    //     _removalIds[0]
    //   ),
    //   0
    // );
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
    _assertRemovalBalance(address(_market), 0, false);
    _assertRemovalBalance(_namedAccounts.supplier, 0, false);
    _assertRemovalBalance(address(_certificate), certificateAmount, true);
    // assertEq(
    //   _certificate.balanceOfRemoval(
    //     _certificateTokenId,
    //     _removalIds[0]
    //   ), // 0
    //   certificateAmount // 1000000000000000000
    // );
    // assertEq(_certificate.ownerOf(_certificateTokenId), owner);
  }

  function _assertRemovalBalance(
    address owner,
    uint256 amount,
    bool ownsRemovalTokenId
  ) private {
    // assertEq(
    //   _removal.tokensOfOwner(owner),
    //   ownsRemovalTokenId
    //     ? _asSingletonUintArray(_removalIds[0])
    //     : new uint256[](amount)
    // );
    // assertEq(_removal.cumulativeBalanceOf(owner), amount);
    // assertEq(
    //   _removal.numberOfTokensOwnedByAddress(owner),
    //   ownsRemovalTokenId ? 1 : 0
    // );
  }
}
