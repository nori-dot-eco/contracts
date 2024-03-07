/* solhint-disable contract-name-camelcase, func-name-mixedcase, reason-string */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import {Global, Vm} from "@/test/helpers/test.sol";
import {
  EnumerableSetUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import {UpgradeableMarket} from "@/test/helpers/market.sol";
import {Certificate} from "@/contracts/Certificate.sol";
import {Removal} from "@/contracts/Removal.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {DecodedRemovalIdV0, RemovalIdLib} from "@/contracts/RemovalIdLib.sol";
import {AddressArrayLib, UInt256ArrayLib} from "@/contracts/ArrayLib.sol";
import {SignedPermit} from "@/test/helpers/signature-utils.sol";
import {console2} from "forge-std/console2.sol";

using AddressArrayLib for address[];
using UInt256ArrayLib for uint256[];

contract MarketHandler is UpgradeableMarket {
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  mapping(bytes32 => uint256) public numCalls;
  // Handler "ghost variables" used to track state across randomized calls.
  // These can be used while asserting invariants and also help govern the
  // behavior of the random calls to create more meaningful cases.
  EnumerableSetUpgradeable.UintSet allRemovalIds;
  EnumerableSetUpgradeable.UintSet unlistedRemovalIds;
  EnumerableSetUpgradeable.UintSet listedRemovalIds;
  EnumerableSetUpgradeable.UintSet soldRemovalIds;
  EnumerableSetUpgradeable.UintSet releasedIds;
  mapping(uint256 => uint256) releasedAmounts;

  // A bounded set of possible suppliers to use when minting removals
  address[] allSuppliers = [
    vm.addr(1),
    vm.addr(2),
    vm.addr(3),
    vm.addr(4),
    vm.addr(5),
    vm.addr(6)
  ];

  bytes32 constant CREATE_CERTIFICATE_EVENT_SELECTOR =
    keccak256(
      "CreateCertificate(address,address,uint256,uint256,uint256[],uint256[],address,uint256,uint256)"
    );
  bytes32 constant UPDATE_CERTIFICATE_EVENT_SELECTOR =
    keccak256(
      "UpdateCertificate(uint256,uint256[],uint256[],uint256[],uint256[],address,uint256)"
    );

  /**
   * @dev Mint a batch of removals incporporating randomness but minimizing reverts:
   * - the batch size is between 1 and 10
   * - the vintage is between 1990 and 2019
   * - the subIdentifier is between 0 and 100 million
   * - the supplier is chosen randomly from a predefined set of possible suppliers
   * - the amounts are chosen randomly between 0 and 1 ether-
   * - the projectId is between 1 and 1 billion
   * - the scheduleStartTime is between 1 and intMax minus 10 years (avoid overflow when calculating end time for schedules)
   * - the holdbackPercentage is between 0 and 100
   * - other ID fields are hardcoded
   */
  function mintRemovalBatchMinimizeReverts(uint256 fuzz) external {
    numCalls["mintRemovalMinimizeReverts"]++;
    uint256 batchSize = (fuzz % 10) + 1;
    DecodedRemovalIdV0[] memory removals = new DecodedRemovalIdV0[](batchSize);
    // TODO: occasionally mint directly to market?
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
      unlistedRemovalIds.add(RemovalIdLib.createRemovalId(removalIdData));
      allRemovalIds.add(RemovalIdLib.createRemovalId(removalIdData));
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

  /**
   * @dev Consign a random removal to the market from the set of removals that have
   * been minted but not yet listed.
   * - the amount is the full balance of the removal
   * - TODO consider adding a fuzz factor to the amount
   */
  function consignRandomRemovalToMarket(uint256 fuzz) external {
    numCalls["consignRandomRemovalToMarket"]++;
    uint256 countMintedRemovalIds = unlistedRemovalIds.length();
    uint256 removalId = unlistedRemovalIds.at(
      fuzz % unlistedRemovalIds.length()
    );
    address currentOwner = RemovalIdLib.supplierAddress(removalId);
    uint256 amount = _removal.balanceOf(currentOwner, removalId);
    _removal.consign({from: currentOwner, id: removalId, amount: amount});
    listedRemovalIds.add(removalId);
    unlistedRemovalIds.remove(removalId);
  }

  /**
   * @dev Make a random purchase from the market.
   * - The buyer is generated randomly but avoids collision with the market proxy admin which cannot make calls to the proxy.
   * - The amount is chosen randomly but is bounded by the market balance.
   * - Logs are recorded to perform ghost variable bookkeeping on the removals that have changed ownership.
   */
  function purchaseFromMarket(uint256 fuzz) external {
    numCalls["purchaseFromMarket"]++;
    uint256 buyerPrivateKey = (fuzz % 1000) + 101; // avoids collision with proxy admin! which is addr(100)
    address buyerAddress = vm.addr(buyerPrivateKey);
    uint256 amount = fuzz % _removal.getMarketBalance();
    uint256 purchaseAmount = _market.calculateCheckoutTotal(amount);
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
      recipient: buyerAddress,
      amount: purchaseAmount,
      deadline: signedPermit.permit.deadline,
      v: signedPermit.v,
      r: signedPermit.r,
      s: signedPermit.s
    });
    Vm.Log[] memory entries = vm.getRecordedLogs();
    for (uint256 i = 0; i < entries.length; ++i) {
      if (entries[i].topics[0] == CREATE_CERTIFICATE_EVENT_SELECTOR) {
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
  }

  /**
   * @dev Release a random amount of a random removal.
   * - The removal is chosen randomly from the set of all removals that have been minted and not yet released,
   * so the released removal may be unlisted, listed or sold.
   * - The amount is chosen randomly but is bounded by the total supply of that removal and non-zero.
   * - Ghost variable bookkeeping is performed on the removals that have been released, fully removing them
   *  from affected sets if the total supply is burned.
   */
  function releaseRandomRemoval(uint256 fuzz) external {
    numCalls["releaseRandomRemoval"]++;
    uint256 removalId = allRemovalIds.at(fuzz % allRemovalIds.length());
    uint256 totalSupply = _removal.totalSupply(removalId);
    if (!(totalSupply == 0)) {
      _removal.release({id: removalId, amount: (fuzz % totalSupply) + 1}); // release a random amount <= total supply
    }
    totalSupply = _removal.totalSupply(removalId);
    releasedIds.add(removalId);
    if (totalSupply == 0) {
      allRemovalIds.remove(removalId);
      soldRemovalIds.remove(removalId);
      listedRemovalIds.remove(removalId);
      unlistedRemovalIds.remove(removalId);
    }
  }

  /**
   * @dev Replace a random portion of the NRT deficit with a new purchase from the market.
   * - The amount is chosen randomly but is bounded by the NRT deficit and the market balance.
   * - Logs are recorded to perform bookkeeping on the removals that have changed ownership.
   */
  function replaceRandomPortionOfNrtDeficit(uint256 fuzz) external {
    numCalls["replaceRandomPortionOfNrtDeficit"]++;
    // avoid modulo by 0 if no deficit:
    if (_certificate.getNrtDeficit() > 0) {
      uint256 replaceAmount = (fuzz % _certificate.getNrtDeficit()) + 1; // avoid trying to replace more than deficit - we know this reverts
      // avoid trying to replace more than is available in the market - we know this reverts
      if (_removal.getMarketBalance() >= replaceAmount) {
        uint256 replacementCost = _market.calculateCheckoutTotalWithoutFee({
          amount: replaceAmount,
          priceMultiple: _market.getPriceMultiple()
        }); // incorporates price multiple!
        vm.startPrank(_namedAccounts.admin);
        _bpNori.deposit(_namedAccounts.admin, abi.encode(replacementCost));
        _bpNori.approve(address(_market), replacementCost);
        vm.stopPrank();
        vm.recordLogs();
        _market.replace({
          treasury: _namedAccounts.admin,
          certificateId: 0, // shouldn't matter which cert is specified -- this is just re-emitted in events
          totalAmountToReplace: replaceAmount,
          removalIdsBeingReplaced: new uint256[](1).fill(fuzz), // doesn't matter which ids being replaced -- re-emitted in events
          amountsBeingReplaced: new uint256[](1).fill(replaceAmount) // same with amounts, though these need to total to the totalAmountToReplace
        });
        Vm.Log[] memory entries = vm.getRecordedLogs();
        for (uint256 i = 0; i < entries.length; ++i) {
          if (entries[i].topics[0] == UPDATE_CERTIFICATE_EVENT_SELECTOR) {
            (
              uint256[] memory removalIds,
              uint256[] memory amounts,
              uint256[] memory removalIdsBeingReplaced,
              uint256[] memory amountsBeingReplaced,
              uint256 priceMultiple
            ) = abi.decode(
                entries[i].data,
                (uint256[], uint256[], uint256[], uint256[], uint256)
              );
            for (uint256 i = 0; i < removalIds.length; i++) {
              soldRemovalIds.add(removalIds[i]);
              if (_removal.balanceOf(address(_market), removalIds[i]) == 0)
                listedRemovalIds.remove(removalIds[i]);
            }
          }
        }
      }
    }
  }

  /**
   * @dev An end-to-end test of the market, including minting, listing, purchasing, releasing, and replacing.
   * Used to sanity check the behavior of each individual function in a controlled environment and simulate the
   * guarantee of each call being made multiple times.
   */
  function endToEnd(uint256 fuzz) external {
    numCalls["endToEnd"]++;
    // what about withdrawing removals from the market!? any other removal-moving functionality available to test?
    // what about burning certificates? (like the 721)
    // importantly -- what is an approach to meaningfully randomizing call sequences?

    // 1) mint and list some removals =====================================================
    this.mintRemovalBatchMinimizeReverts(fuzz);
    this.consignRandomRemovalToMarket(fuzz);

    // 2) purchase some removals from the market ==========================================
    this.purchaseFromMarket(fuzz);

    // 3) release some of these removals ==================================================
    this.releaseRandomRemoval(fuzz);

    // 4) replace some of these removals ==================================================
    this.replaceRandomPortionOfNrtDeficit(fuzz);
  }

  // Helper functions used for defining invariants:
  function getCountOfSoldRemovalIds() external view returns (uint256) {
    return soldRemovalIds.length();
  }

  function getSoldRemovalIdAtIndex(
    uint256 index
  ) external view returns (uint256) {
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

contract MarketInvariantTest is StdInvariant, Global {
  MarketHandler _marketHandler;
  Certificate internal _certificate;
  Removal internal _removal;

  function setUp() external {
    _marketHandler = new MarketHandler();
    _certificate = Certificate(_marketHandler.getCertificateAddress());
    _removal = Removal(_marketHandler.getRemovalAddress());
    targetContract(address(_marketHandler)); // only target the handler
  }

  function invariant_sumOfPurchaseAmounts() external {
    // the sum of purchase amounts for all certificate ids should equal the total balance
    // of the certificate contract, less any reported deficit that hasn't been replaced
    uint256 sumOfPurchaseAmounts = 0;
    for (uint256 i = 0; i < _certificate.totalMinted(); i++) {
      sumOfPurchaseAmounts += _certificate.getPurchaseAmount(i);
    }
    uint256 sumOfCertificateRemovalBalances = 0;
    for (uint256 i = 0; i < _marketHandler.getCountOfSoldRemovalIds(); i++) {
      uint256 removalId = _marketHandler.getSoldRemovalIdAtIndex(i);
      sumOfCertificateRemovalBalances += _removal.balanceOf(
        address(_certificate),
        removalId
      );
    }
    assertTrue(
      sumOfPurchaseAmounts ==
        sumOfCertificateRemovalBalances + _certificate.getNrtDeficit()
    );
  }

  // TODO define more invariants!
  // Invariant ideas:
  // - removal tokens should only be held by the specific subset of addresses that are allowed to hold them
  // - the nrtDeficit in the certificate contract should never exceed the number of NRTs that were released
  // - the active suppliers in the market should only come from the set of addresses used to mint removal batches
  // - all kinds of contract-specific invariants that could examine things like permissions and roles etc.
  //    (consider writing contract-specific handlers for this with minimal setup)

  /**
   * @dev Will report the number of times each function in the _marketHandler contract has been called.
   * Note that this is not a true invariant, but it is useful for debugging and monitoring.
   * It will only report the number of calls on the last run of the test, so it is only useful for a
   * general sense of the probability of each function being called.
   * Note that a reverted call will not be counted here but will increase the depth counter for that run.
   */
  function invariant_callSummary() external view {
    console2.log("\nCall Summary\n");
    console2.log(
      "mintRemovalMinimizeReverts         ",
      _marketHandler.numCalls("mintRemovalMinimizeReverts")
    );
    console2.log(
      "consignRandomRemovalToMarket       ",
      _marketHandler.numCalls("consignRandomRemovalToMarket")
    );
    console2.log(
      "purchaseFromMarket        ",
      _marketHandler.numCalls("purchaseFromMarket")
    );
    console2.log(
      "releaseRandomRemoval       ",
      _marketHandler.numCalls("releaseRandomRemoval")
    );
    console2.log(
      "replaceRandomPortionOfNrtDeficit   ",
      _marketHandler.numCalls("replaceRandomPortionOfNrtDeficit")
    );
    console2.log("endToEnd              ", _marketHandler.numCalls("endToEnd"));
  }
}
