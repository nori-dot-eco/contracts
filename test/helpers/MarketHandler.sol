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

  EnumerableSetUpgradeable.UintSet mintedRemovalIds;
  EnumerableSetUpgradeable.UintSet listedRemovalIds;
  EnumerableSetUpgradeable.UintSet soldRemovalIds;
  EnumerableSetUpgradeable.UintSet releasedIds;
  mapping(uint256 => uint256) releasedAmounts;

  address[] allSuppliers = [
    vm.addr(1),
    vm.addr(2),
    vm.addr(3),
    vm.addr(4),
    vm.addr(5),
    vm.addr(6)
  ];

  bytes32 constant RECEIVE_REMOVAL_BATCH_EVENT_SELECTOR =
    keccak256(
      "CreateCertificate(address,address,uint256,uint256,uint256[],uint256[],address,uint256,uint256)"
    );

  function _mintRemovalBatchMinimizeReverts(uint256 fuzz) internal {
    numCalls["mintRemovalMinimizeReverts"]++;
    uint256 batchSize = (fuzz % 10) + 1;
    DecodedRemovalIdV0[] memory removals = new DecodedRemovalIdV0[](batchSize);

    address supplierAddress = allSuppliers[fuzz % allSuppliers.length];
    for (uint256 i = 0; i < batchSize; i++) {
      DecodedRemovalIdV0 memory removalIdData = DecodedRemovalIdV0({
        idVersion: 0,
        methodology: 1,
        methodologyVersion: 0,
        vintage: uint16((fuzz % 30) + 1990 + i),
        country: "US",
        subdivision: "IA",
        supplierAddress: supplierAddress,
        subIdentifier: uint32(fuzz % 100_000_000)
      });
      removals[i] = removalIdData;
      mintedRemovalIds.add(RemovalIdLib.createRemovalId(removalIdData));
    }
    // populate amounts array with random values between 0 and 1 ether:
    uint256[] memory amounts = new uint256[](batchSize);
    for (uint256 i = 0; i < batchSize; i++) {
      amounts[i] = uint256(keccak256(abi.encodePacked(fuzz, i))) % 1 ether;
    }
    _removal.mintBatch({
      to: supplierAddress,
      amounts: amounts,
      removals: removals,
      projectId: (fuzz % 1_000_000_000) + 1,
      scheduleStartTime: (fuzz % (type(uint256).max - 315_569_520)) + 1,
      holdbackPercentage: uint8(fuzz % 100)
    });
  }

  function _consignRandomRemovalToMarket(uint256 fuzz) internal {
    numCalls["consignRandomRemovalToMarket"]++;
    uint256 countMintedRemovalIds = mintedRemovalIds.length();
    uint256 removalId = mintedRemovalIds.at(fuzz % mintedRemovalIds.length());
    address currentOwner = RemovalIdLib.supplierAddress(removalId);
    uint256 amount = _removal.balanceOf(currentOwner, removalId);
    _removal.consign({from: currentOwner, id: removalId, amount: amount});
    listedRemovalIds.add(removalId);
    mintedRemovalIds.remove(removalId);
  }

  function _purchaseFromMarket(
    uint256 buyerPrivateKey,
    address recipient,
    uint256 certificateAmount
  ) internal {
    // bound(certificateAmount, 100, _removal.getMarketBalance()); // TODO is this gonna work to bound this value, using an expression?
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
    vm.recordLogs();
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
    Vm.Log[] memory entries = vm.getRecordedLogs();
    for (uint256 i = 0; i < entries.length; ++i) {
      if (entries[i].topics[0] == RECEIVE_REMOVAL_BATCH_EVENT_SELECTOR) {
        (
          address from,
          uint256 eventCertificateAmount,
          uint256[] memory removalIds,
          uint256[] memory removalAmounts,
          uint256 priceMultiple,
          uint256 noriFeePercentage
        ) = abi.decode(
            entries[i].data,
            (address, uint256, uint256[], uint256[], uint256, uint256)
          );
        for (uint256 i = 0; i < removalIds.length; i++) {
          soldRemovalIds.add(removalIds[i]);
          if (_removal.balanceOf(address(_market), removalIds[i]) == 0)
            listedRemovalIds.remove(removalIds[i]);
        }
      }
    }
    // TODO how do we know what removals were purchased?
  }

  function endToEnd(uint256 fuzz) external {
    // TODO you are here... in what way do we want to fuzz this?
    // how much explicit setup v.s. how much random setup?
    // how to incorporate releasing and replacing removals? i.e. how random to make these?
    // what do we need to keep track of to make sure we can perform release/replace intelligently?
    // what about withdrawing removals from the market!? any other removal-moving functionality available to test?
    // what about burning certificates? (like the 721)
    // importantly -- what is an approach to meaningfully randomizing call sequences?
    // Consider making endToEnd a failOnRevert = true, but otherwise externalizing the helper functions
    // and letting the fuzzing engine call them in random order.

    // 1) mint and list some removals =====================================================
    _mintRemovalBatchMinimizeReverts(fuzz);
    _consignRandomRemovalToMarket(fuzz);

    // 2) purchase some removals from the market ==========================================
    uint256 buyerPrivateKey = (fuzz % 1000) + 1;
    address buyerAddress = vm.addr(buyerPrivateKey);
    uint256 amount = fuzz % _removal.getMarketBalance();
    _purchaseFromMarket({
      buyerPrivateKey: buyerPrivateKey,
      recipient: buyerAddress,
      certificateAmount: amount
    });

    // 3) release some of these removals ==================================================
    // TODO you are here!
    // 1) release somewhat at random from unsold or sold removals
    // 2) release a meaningful amount that doesn't exceed the balance that can be released
    // btw -- what happens when we do attempt to release in excess of the actual balance of a removal?
    // 3) make sure bookkeeping is correct -- that's what's failing our invariant checks -- incorrect set upkeep

    // old code below:
    // uint256 releaseAmount = amount / 2; // this shouldn't work
    // uint256 randomRemovalId = soldRemovalIds.at(fuzz % soldRemovalIds.length()); // todo do we want to release from any removal not just sold?
    // _removal.release({id: randomRemovalId, amount: releaseAmount}); // release half the removal
    // releasedIds.add(randomRemovalId);
    // releasedAmounts[randomRemovalId] = releaseAmount;
    // todo do we need to update anything about the sold id accounting?

    // 4) replace some of these removals ==================================================
    if (!(_certificate.getNrtDeficit() == 0)) {
      // (won't ever run yet bc no release)
      // avoid modulo by 0
      uint256 replaceAmount = fuzz % _certificate.getNrtDeficit();
      if (!(_removal.getMarketBalance() < replaceAmount)) {
        uint256 replacementCost = _market.calculateCheckoutTotalWithoutFee(
          replaceAmount
        ); // incorporates price multiple!
        vm.startPrank(_namedAccounts.admin);
        _bpNori.deposit(_namedAccounts.admin, abi.encode(replacementCost));
        _bpNori.approve(address(_market), replacementCost);
        vm.stopPrank();
        console2.log("replaceAmount: ", replaceAmount);
        _market.replace({
          treasury: _namedAccounts.admin,
          certificateId: 0, // shouldn't matter which cert is specified -- this is just re-emitted in events
          totalAmountToReplace: replaceAmount,
          removalIdsBeingReplaced: new uint256[](1).fill(fuzz), // don't actually care about the removal id being replaced
          amountsBeingReplaced: new uint256[](1).fill(replaceAmount) // or the amount actually, but whatever
        });
        // TODO account for the replacement removal id(s) using same recorded logs event approach
        // soldRemovalIds.add(replacementRemovalId);
      }
    }
  }

  function getCountOfSoldRemovalIds() external view returns (uint256) {
    return soldRemovalIds.length();
  }

  function getSoldRemovalIdAtIndex(uint256 index)
    external
    view
    returns (uint256)
  {
    return soldRemovalIds.at(index);
  }

  function getRemovalAddress() external view returns (address) {
    return address(_removal);
  }

  function getMarketAddress() external view returns (address) {
    return address(_market);
  }

  function getCertificateAddress() external view returns (address) {
    return address(_certificate);
  }
}
