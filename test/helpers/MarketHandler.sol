/* solhint-disable contract-name-camelcase, func-name-mixedcase, not-rely-on-time */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/market.sol";
import "@/contracts/test/MockERC20Permit.sol";
import {StdUtils} from "forge-std/StdUtils.sol";
import {DecodedRemovalIdV0} from "@/contracts/RemovalIdLib.sol";
import {AddressArrayLib, UInt256ArrayLib} from "@/contracts/ArrayLib.sol";

using AddressArrayLib for address[];
using UInt256ArrayLib for uint256[];

contract MarketHandler is UpgradeableMarket, StdUtils {
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  mapping(bytes32 => uint256) public numCalls;

  EnumerableSetUpgradeable.UintSet mintedIds;
  EnumerableSetUpgradeable.UintSet listedIds;
  EnumerableSetUpgradeable.UintSet soldIds;
  EnumerableSetUpgradeable.UintSet releasedIds;
  mapping(uint256 => uint256) releasedAmounts;

  // struct MintBatchParams {
  //   address to;
  //   uint256[] amounts;
  //   uint256 projectId;
  //   uint256 scheduleStartTime;
  //   uint8 holdbackPercentage;
  // }

  // function mintRemovalMinimizeReverts(
  //   DecodedRemovalIdV0 memory removalIdData,
  //   MintBatchParams memory mintBatchParams,
  //   uint256 boundTest // seems to work YOU ARE HERE
  // ) external {
  //   numCalls["mintRemovalMinimizeReverts"]++;

  //   bound(boundTest, 0, 100);
  //   // bound(mintBatchParams.holdbackPercentage, 0, 100);
  //   // bound(
  //   //   mintBatchParams.scheduleStartTime,
  //   //   0,
  //   //   type(uint256).max - 315_569_520
  //   // ); // 10 years
  //   mintBatchParams.holdbackPercentage =
  //     mintBatchParams.holdbackPercentage %
  //     100;
  //   mintBatchParams.scheduleStartTime =
  //     (mintBatchParams.scheduleStartTime % (type(uint256).max - 315_569_520)) +
  //     1;
  //   // vm.assume(isCapitalized(removalIdData.country));
  //   // vm.assume(isCapitalized(removalIdData.subdivision));
  //   removalIdData.supplierAddress = vm.addr(87);
  //   removalIdData.idVersion = 0;
  //   removalIdData.country = "US";
  //   removalIdData.subdivision = "IA";
  //   removalIdData.methodology = 1;
  //   removalIdData.methodologyVersion = 0; // bypassing -- todo: use assume or correct cheatcode
  //   mintedRemovalIds.add(RemovalIdLib.createRemovalId(removalIdData));
  //   DecodedRemovalIdV0[] memory removals = new DecodedRemovalIdV0[](1);
  //   removals[0] = removalIdData;
  //   _removal.mintBatch({
  //     to: removalIdData.supplierAddress, // bypassing to and using the encoded supplier instead
  //     amounts: new uint256[](1).fill(1 ether),
  //     removals: removals,
  //     projectId: mintBatchParams.projectId,
  //     scheduleStartTime: mintBatchParams.scheduleStartTime,
  //     holdbackPercentage: mintBatchParams.holdbackPercentage
  //   });
  // }

  // function consignRandomRemovalToMarket() external {
  //   numCalls["consignRandomRemovalToMarket"]++;
  //   uint256 removalId = mintedRemovalIds.at(
  //     uint256(keccak256(abi.encodePacked(block.timestamp, block.number))) %
  //       mintedRemovalIds.length()
  //   );
  //   address currentOwner = RemovalIdLib.supplierAddress(removalId);
  //   uint256 amount = _removal.balanceOf(currentOwner, removalId);
  //   _removal.consign({from: currentOwner, id: removalId, amount: amount});
  // }

  function _purchaseFromMarket(
    uint256 buyerPrivateKey,
    address recipient,
    uint256 certificateAmount
  ) internal {
    numCalls["purchaseFromMarket"]++;
    address buyerAddress = vm.addr(buyerPrivateKey);
    uint256 purchaseAmount = _market.calculateCheckoutTotal(certificateAmount);
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(buyerAddress, abi.encode(purchaseAmount));
    SignedPermit memory signedPermit = _signatureUtils.generatePermit(
      buyerPrivateKey,
      address(_market),
      purchaseAmount,
      1 days,
      _bpNori
    );
    vm.prank(buyerAddress);
    _market.swap({
      recipient: recipient,
      permitOwner: buyerAddress,
      amount: purchaseAmount,
      deadline: signedPermit.permit.deadline,
      v: signedPermit.v,
      r: signedPermit.r,
      s: signedPermit.s
    });
  }

  function endToEnd() external {
    // TODO you are here... in what way do we want to fuzz this?
    // how much explicit setup v.s. how much random setup?
    // how to incorporate releasing and replacing removals? i.e. how random to make these?
    // what do we need to keep track of to make sure we can perform release/replace intelligently?
    // what about withdrawing removals from the market!? any other removal-moving functionality available to test?

    uint256 amount = 1 ether;
    // 1) mint some removals, update bookkeeping ==============================
    DecodedRemovalIdV0 memory removalIdData = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });
    uint256 originalRemovalId = RemovalIdLib.createRemovalId(removalIdData);
    DecodedRemovalIdV0[] memory removals = new DecodedRemovalIdV0[](1);
    removals[0] = removalIdData;
    _removal.mintBatch({
      to: removalIdData.supplierAddress, // bypassing to and using the encoded supplier instead
      amounts: new uint256[](1).fill(amount),
      removals: removals,
      projectId: 123456789,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
    mintedIds.add(originalRemovalId);
    // 2) consign some removals to the market, update bookkeeping ==============================
    _removal.consign({
      from: removalIdData.supplierAddress,
      id: originalRemovalId,
      amount: amount
    });
    mintedIds.remove(originalRemovalId);
    listedIds.add(originalRemovalId);

    // 2) purchase some removals from the market ==============================
    uint256 buyerPrivateKey = 123;
    address buyerAddress = vm.addr(buyerPrivateKey);
    _purchaseFromMarket({
      buyerPrivateKey: buyerPrivateKey,
      recipient: buyerAddress,
      certificateAmount: amount
    });
    listedIds.remove(originalRemovalId);
    soldIds.add(originalRemovalId);
    // TODO account for certificate ID

    // 3) release some of these removals ======================================
    uint256 releaseAmount = amount / 2;
    _removal.release({id: originalRemovalId, amount: releaseAmount}); // release half the removal
    releasedIds.add(originalRemovalId);
    releasedAmounts[originalRemovalId] = releaseAmount;
    // todo do we need to update anything about the sold id accounting?

    // 3.5) mint some more removals so that we can make a replacement:
    removalIdData = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2019, // unique from original one
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });
    uint256 replacementRemovalId = RemovalIdLib.createRemovalId(removalIdData);
    DecodedRemovalIdV0[] memory moreRemovals = new DecodedRemovalIdV0[](1);
    moreRemovals[0] = removalIdData;
    _removal.mintBatch({
      to: removalIdData.supplierAddress, // bypassing to and using the encoded supplier instead
      amounts: new uint256[](1).fill(amount),
      removals: moreRemovals,
      projectId: 11111111,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
    mintedIds.add(replacementRemovalId);
    // 2) consign some removals to the market, update bookkeeping ==============================
    _removal.consign({
      from: removalIdData.supplierAddress,
      id: replacementRemovalId,
      amount: amount
    });
    mintedIds.remove(replacementRemovalId);
    listedIds.add(replacementRemovalId);

    // 4) replace some of these removals ======================================

    uint256 replaceAmount = releaseAmount; // todo what happens when we replace partial amounts?
    uint256 replacementCost = _market.calculateCheckoutTotalWithoutFee(
      replaceAmount
    ); // don't forget to incorporate the price multiple!
    vm.startPrank(_namedAccounts.admin);
    _bpNori.deposit(_namedAccounts.admin, abi.encode(replacementCost));
    _bpNori.approve(address(_market), MAX_INT);
    vm.stopPrank();
    console2.log("replaceAmount: ", replaceAmount);
    _market.replace({
      treasury: _namedAccounts.admin,
      certificateId: 0,
      totalAmountToReplace: replaceAmount,
      removalIdsBeingReplaced: new uint256[](1).fill(replacementRemovalId),
      amountsBeingReplaced: new uint256[](1).fill(replaceAmount)
    });
    soldIds.add(replacementRemovalId);
    // we have no way of necessarily bookkeeping which removal was sold from the market? though we could
    // make the effort to access event logs here using the forge vm
  }

  function getCountOfSoldRemovalIds() external view returns (uint256) {
    return soldIds.length();
  }

  function getSoldRemovalIdAtIndex(uint256 index)
    external
    view
    returns (uint256)
  {
    return soldIds.at(index);
  }

  // function getCountOfMintedRemovalIds() external view returns (uint256) {
  //   return mintedRemovalIds.length();
  // }

  // function getRemovalIdAtIndex(uint256 index) external view returns (uint256) {
  //   return mintedRemovalIds.at(index);
  // }

  function getRemovalAddress() external view returns (address) {
    return address(_removal);
  }

  function getMarketAddress() external view returns (address) {
    return address(_market);
  }

  function getCertificateAddress() external view returns (address) {
    return address(_certificate);
  }

  /**
   * @notice Check whether the provided character bytes are capitalized.
   * @param characters the character bytes to check.
   * @return valid True if the provided character bytes are capitalized, false otherwise.
   */
  function isCapitalized(bytes2 characters) internal pure returns (bool valid) {
    assembly {
      let firstCharacter := byte(0, characters)
      let secondCharacter := byte(1, characters)
      valid := and(
        and(lt(firstCharacter, 0x5B), gt(firstCharacter, 0x40)),
        and(lt(secondCharacter, 0x5B), gt(secondCharacter, 0x40))
      )
    }
  }
}
