/* solhint-disable contract-name-camelcase, func-name-mixedcase, not-rely-on-time */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";
import {UnpackedRemovalIdV0} from "@/contracts/RemovalUtils.sol";

abstract contract Checkout is UpgradeableMarket, SeedableMock, RemovalSeeded {
  uint256 internal _removalTokenId;
  uint256 internal _certificateTokenId;

  function _seed() internal override(UpgradableRemovalMock, SeedableMock) {
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
      list: true
    });
    _removalTokenId = RemovalUtils.createRemovalIdFromStruct(removalId);
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1e18),
      _asSingletonUintArray(_removalTokenId), // todo encode ID or test won't work
      data
    );
  }
}

contract Checkout_buyingFromOneRemoval is Checkout {
  function test() external {
    uint256 ownerPrivateKey = 0xA11CE;
    address owner = vm.addr(ownerPrivateKey);
    uint256 fee = (1 ether * _market.getNoriFee()) / 100;
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
    assertEq(
      _certificate.childBalance(
        _certificateTokenId,
        address(_removal),
        _removalTokenId
      ),
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
    _assertRemovalBalance(address(_market), 0, false);
    _assertRemovalBalance(_namedAccounts.supplier, 0, false);
    _assertRemovalBalance(address(_certificate), certificateAmount, true);
    assertEq(
      _certificate.childBalance(
        _certificateTokenId,
        address(_removal),
        _removalTokenId
      ),
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
        ? _asSingletonUintArray(_removalTokenId)
        : new uint256[](amount)
    );
    assertEq(_removal.cumulativeBalanceOf(owner), amount);
    assertEq(
      _removal.numberOfTokensOwnedByAddress(owner),
      ownsRemovalTokenId ? 1 : 0
    );
  }
}
