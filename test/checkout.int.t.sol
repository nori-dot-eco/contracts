/* solhint-disable contract-name-camelcase, func-name-mixedcase, not-rely-on-time */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/fifo-market.sol";
import {UnpackedRemovalIdV0} from "@/contracts/RemovalUtils.sol";

abstract contract Checkout is
  UpgradeableFIFOMarket,
  SeedableMock,
  RemovalSeeded
{
  uint256 internal _tokenId;

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
    _tokenId = RemovalUtils.createRemovalIdFromStruct(removalId);
    _removal.mintBatch(
      _namedAccounts.supplier,
      _asSingletonUintArray(1),
      _asSingletonUintArray(_tokenId), // todo encode ID or test won't work
      data
    );
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(_namedAccounts.buyer, abi.encode(100 ether));
  }
}

contract Checkout_buyingFromOneRemoval is Checkout {
  function test() external {
    _assertRemovalBalance(address(_market), 1, true);
    _assertRemovalBalance(_namedAccounts.supplier, 0, false);
    _assertRemovalBalance(address(_certificate), 0, false);
    vm.prank(_namedAccounts.buyer);
    _bpNori.transfer(address(_market), 1); // todo temporary work around to avoid erc20 permit
    vm.prank(_namedAccounts.buyer);
    _market.swap(
      _namedAccounts.buyer,
      1,
      block.timestamp + 1 weeks,
      uint8(0),
      bytes32(""),
      bytes32("")
    );
    _assertRemovalBalance(address(_market), 0, false);
    _assertRemovalBalance(_namedAccounts.supplier, 0, false);
    _assertRemovalBalance(address(_certificate), 1, true);
    assertEq(
      _certificate.childBalance(_tokenId, address(_removal), _tokenId),
      1
    );
  }

  function _assertRemovalBalance(
    address owner,
    uint256 amount,
    bool ownsTokenId
  ) private {
    assertEq(
      _removal.tokensOfOwner(owner),
      ownsTokenId ? _asSingletonUintArray(_tokenId) : new uint256[](amount)
    );
    assertEq(_removal.cumulativeBalanceOf(owner), amount);
    assertEq(_removal.numberOfTokensOwnedByAddress(owner), amount);
  }
}
