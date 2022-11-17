/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/market.sol";
import "@/test/helpers/removal.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@/contracts/ArrayLib.sol";
import "@/contracts/Removal.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";

using UInt256ArrayLib for uint256[];
using AddressArrayLib for address[];
using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;

abstract contract MarketBalanceTestHelper is UpgradeableMarket {
  uint256[] internal _removalIds;
  address[] internal _suppliers;
  uint256[] internal _expectedRemovalBalances;
  uint256 internal _expectedMarketSupply;
  uint256 internal _amountPerRemoval = 1 ether;
  uint256 internal _expectedPriorityRestrictedThreshold;
  EnumerableMapUpgradeable.AddressToUintMap internal _expectedTokenCount;

  function _assertCorrectStates() internal {
    assertEq(
      _removal.balanceOfBatch(_suppliers, _removalIds),
      _expectedRemovalBalances,
      "Expected _removal.balanceOfBatch(_suppliers, _removalIds) to equal _expectedRemovalBalances"
    );
    assertEq(
      _availableMarketSupply(_removalIds),
      _expectedMarketSupply,
      "Expected availableSupply to equal _expectedMarketSupply"
    );
    assertEq(
      _market.priorityRestrictedThreshold(),
      _expectedPriorityRestrictedThreshold,
      "Expected availableSupply to equal _expectedMarketSupply"
    );
    for (uint256 i; i < _expectedTokenCount.length(); ++i) {
      (address owner, uint256 count) = _expectedTokenCount.at(i);
      assertEq(
        _removal.numberOfTokensOwnedByAddress(owner),
        count,
        string.concat(
          "Expected number of tokens owned by ",
          StringsUpgradeable.toHexString(owner),
          " to equal _expectedNumberOfTokensForMarket"
        )
      );
    }
  }
}

contract ERC1155Recipient {
  constructor() {}

  function onERC1155Received(
    address,
    address from,
    uint256,
    uint256,
    bytes calldata
  ) external returns (bytes4) {
    if (from == address(0)) {
      revert("Griefing attack!!!");
    }
  }
}

contract Market_swap_rNori_mint_failure is UpgradeableMarket {
  address owner;
  uint256 holdbackPercentage = 10;
  uint256 checkoutTotal;
  uint256 rNoriToMint;
  SignedPermit signedPermit;
  uint256 removalId;
  ERC1155Recipient recipient = new ERC1155Recipient();

  event RestrictedNORIMintFailed(
    uint256 indexed amount,
    uint256 indexed removalId
  );

  function setUp() external {
    DecodedRemovalIdV0[] memory removals = new DecodedRemovalIdV0[](1);
    removals[0] = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: address(recipient), // will not accept 1155 tokens - revert on mint
      subIdentifier: _REMOVAL_FIXTURES[0].subIdentifier
    });

    removalId = RemovalIdLib.createRemovalId(removals[0]);

    _removal.mintBatch(
      address(_market),
      new uint256[](1).fill(2 ether),
      removals,
      1_234_567_890,
      block.timestamp,
      uint8(holdbackPercentage)
    );

    uint256 ownerPrivateKey = 0xA11CE;
    owner = vm.addr(ownerPrivateKey);
    checkoutTotal = _market.calculateCheckoutTotal(1 ether);
    rNoriToMint = (1 ether * holdbackPercentage) / 100;
    vm.prank(_namedAccounts.admin);
    _bpNori.deposit(owner, abi.encode(checkoutTotal));

    signedPermit = _signatureUtils.generatePermit(
      ownerPrivateKey,
      address(_market),
      checkoutTotal,
      1 days,
      _bpNori
    );
  }

  function test() external {
    vm.prank(owner);
    vm.expectEmit(true, true, false, false);
    emit RestrictedNORIMintFailed(rNoriToMint, removalId);
    _market.swap(
      owner,
      checkoutTotal,
      signedPermit.permit.deadline,
      signedPermit.v,
      signedPermit.r,
      signedPermit.s
    );
  }
}

contract Market_setNoriFeePercentage_revertsInvalidPercentage is
  UpgradeableMarket
{
  function test() external {
    vm.expectRevert(InvalidNoriFeePercentage.selector);
    _market.setNoriFeePercentage(150);
  }
}

contract Market_setPriorityRestrictedThreshold is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), 1);
    _assertCorrectStates();
  }

  function test() external {
    _expectedPriorityRestrictedThreshold = 0.5 ether;
    _market.setPriorityRestrictedThreshold(
      _expectedPriorityRestrictedThreshold
    );
    _expectedMarketSupply =
      (_amountPerRemoval * _removalIds.length) -
      _expectedPriorityRestrictedThreshold;
    _assertCorrectStates();
  }

  function test_zeroAvailable() external {
    _expectedPriorityRestrictedThreshold =
      _amountPerRemoval *
      _removalIds.length;
    _market.setPriorityRestrictedThreshold(
      _expectedPriorityRestrictedThreshold
    );
    _expectedMarketSupply = 0;
    _assertCorrectStates();
  }
}

contract Market_withdraw_as_supplier is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), 1);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval];
    _expectedMarketSupply = 0;
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), 0);
    _assertCorrectStates();
  }
}

contract Market_withdraw_as_operator is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false
    });
    _removal.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[0],
      amount: _amountPerRemoval
    });
    vm.prank(_namedAccounts.supplier);
    _removal.setApprovalForAll(_namedAccounts.supplier2, true);
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), 1);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier2);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval];
    _expectedMarketSupply = 0;
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), 0);
    _assertCorrectStates(); // todo accept expected states as args instead
  }
}

contract Market_withdraw_as_DEFAULT_ADMIN_ROLE is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), 1);
    _assertCorrectStates();
  }

  function test() external {
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval];
    _expectedMarketSupply = 0;
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), 0);
    _assertCorrectStates();
  }
}

contract Market_withdraw_reverts is MarketBalanceTestHelper {
  function setUp() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    _suppliers = new address[](1).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier2);
    vm.expectRevert(UnauthorizedWithdrawal.selector);
    _market.withdraw(_removalIds[0]);
    _assertCorrectStates();
  }
}

contract Market_withdraw_1x3_center is MarketBalanceTestHelper {
  function setUp() external {
    _suppliers = new address[](3).fill(_namedAccounts.supplier);
    _expectedRemovalBalances = [0, 0, 0];
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 3,
      list: true
    });
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[1]);
    _expectedRemovalBalances = [0, _amountPerRemoval, 0];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }
}

/** @dev Test withdraw from the front of the market when the market has 1 removal across two suppliers */
contract Market_withdraw_2x1_front is MarketBalanceTestHelper {
  function setUp() external {
    _suppliers = [_namedAccounts.supplier, _namedAccounts.supplier2];
    _removalIds = [
      _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true})[0],
      _seedRemovals({to: _namedAccounts.supplier2, count: 1, list: true})[0]
    ];
    _expectedRemovalBalances = [0, 0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval, 0];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }
}

/** @dev Test withdraw from the front of the market when the market has 1 removal across two suppliers, then relists */
contract Market_withdraw_2x1_front_relist is MarketBalanceTestHelper {
  function _assertListedState() internal {
    _expectedRemovalBalances = [0, 0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function setUp() external {
    _suppliers = [_namedAccounts.supplier, _namedAccounts.supplier2];
    _removalIds = [
      _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true})[0],
      _seedRemovals({to: _namedAccounts.supplier2, count: 1, list: true})[0]
    ];
    _assertListedState();
    vm.prank(_namedAccounts.supplier);
    _market.withdraw(_removalIds[0]);
    _expectedRemovalBalances = [_amountPerRemoval, 0];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }

  function test() external {
    _removal.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[0],
      amount: _amountPerRemoval
    });
    _assertListedState();
  }
}

/** @dev Test withdraw from the back of the market when the market has 1 removal across two suppliers */
contract Market_withdraw_2x1_back is MarketBalanceTestHelper {
  function setUp() external {
    _suppliers = [_namedAccounts.supplier, _namedAccounts.supplier2];
    _removalIds = [
      _seedRemovals({to: _namedAccounts.supplier, count: 1, list: true})[0],
      _seedRemovals({to: _namedAccounts.supplier2, count: 1, list: true})[0]
    ];
    _expectedRemovalBalances = [0, 0];
    _expectedMarketSupply = _amountPerRemoval * _removalIds.length;
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(_namedAccounts.supplier2, 0);
    _expectedTokenCount.set(address(_market), _removalIds.length);
    _assertCorrectStates();
  }

  function test() external {
    vm.prank(_namedAccounts.supplier2);
    _market.withdraw(_removalIds[1]);
    _expectedRemovalBalances = [0, _amountPerRemoval];
    _expectedMarketSupply = _amountPerRemoval * (_removalIds.length - 1);
    _expectedTokenCount.set(_namedAccounts.supplier, 0);
    _expectedTokenCount.set(_namedAccounts.supplier2, 1);
    _expectedTokenCount.set(address(_market), _removalIds.length - 1);
    _assertCorrectStates();
  }
}

contract Market_ALLOWLIST_ROLE is UpgradeableMarket {
  function test() external {
    assertEq(_market.ALLOWLIST_ROLE(), keccak256("ALLOWLIST_ROLE"));
  }
}

contract Market__isAuthorizedWithdrawal_true is NonUpgradeableMarket {
  function setUp() external {
    vm.store(
      address(this),
      bytes32(uint256(301)), // sets the _removal storage slot to the market contract to enable mock calls
      bytes32(uint256(uint160(address(this))))
    );
  }

  function test_returnsTrueWhenMsgSenderEqualsOwner() external {
    assertEq(_isAuthorizedWithdrawal({owner: _msgSender()}), true);
  }

  function test_returnsTrueWhenMsgSenderHasDefaultAdminRole() external {
    _grantRole({role: MARKET_ADMIN_ROLE, account: _msgSender()});
    assertEq(_isAuthorizedWithdrawal({owner: _namedAccounts.supplier}), true);
  }

  function test_returnsTrueWhenMsgSenderIsApprovedForAll() external {
    vm.mockCall(
      address(this),
      abi.encodeWithSelector(IERC1155Upgradeable.isApprovedForAll.selector),
      abi.encode(true)
    );
    assertEq(_isAuthorizedWithdrawal({owner: address(0)}), true);
  }
}

contract Market__isAuthorizedWithdrawal_false is NonUpgradeableMarket {
  function setUp() external {
    vm.store(
      address(this),
      bytes32(uint256(301)), // sets the _removal storage slot to the market contract to enable mock calls
      bytes32(uint256(uint160(address(this))))
    );
    vm.mockCall(
      address(this),
      abi.encodeWithSelector(IERC1155Upgradeable.isApprovedForAll.selector),
      abi.encode(false)
    );
  }

  function test_returnsFalseWhenAllConditionsAreFalse() external {
    assertEq(_isAuthorizedWithdrawal({owner: _namedAccounts.supplier}), false);
  }
}

contract Market__validatePrioritySupply is NonUpgradeableMarket {
  function test_supplyAfterPurchaseIsLessThanPriorityRestrictedThreshold()
    external
    view
  {
    _validatePrioritySupply({
      certificateAmount: 0.5 ether,
      availableSupply: 1 ether
    });
  }

  function test_supplyAfterPurchaseIsZero() external view {
    _validatePrioritySupply({
      certificateAmount: 1 ether,
      availableSupply: 1 ether
    });
  }
}

contract Market__validatePrioritySupply_buyerIsAllowlistedAndAmountExceedsPriorityRestrictedThreshold is
  NonUpgradeableMarket
{
  function setUp() external {
    _grantRole({role: MARKET_ADMIN_ROLE, account: _msgSender()});
    vm.prank(_msgSender());
    this.setPriorityRestrictedThreshold({threshold: 0.5 ether});
    _grantRole({role: ALLOWLIST_ROLE, account: _namedAccounts.deployer});
  }

  function test() external view {
    _validatePrioritySupply({
      certificateAmount: 1 ether,
      availableSupply: 1 ether
    });
  }
}

contract Market__validatePrioritySupply_reverts_LowSupplyAllowlistRequired is
  NonUpgradeableMarket
{
  function setUp() external {
    _grantRole({role: MARKET_ADMIN_ROLE, account: _msgSender()});
    vm.prank(_msgSender());
    this.setPriorityRestrictedThreshold({threshold: 1 ether});
  }

  function test() external {
    vm.expectRevert(LowSupplyAllowlistRequired.selector);
    _validatePrioritySupply({
      certificateAmount: 1 ether,
      availableSupply: 1 ether
    });
  }
}

contract Market__addActiveRemoval is NonUpgradeableMarket, UpgradeableRemoval {
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  function test() external {
    _addActiveRemoval({removalId: REMOVAL_ID_FIXTURE});
  }

  function test__list1VintageFor1Supplier() external {
    _addActiveRemoval({removalId: REMOVAL_ID_FIXTURE});
    address supplier = RemovalIdLib.supplierAddress(REMOVAL_ID_FIXTURE);
    uint256 earliestYear = _listedSupply[supplier].earliestYear;
    assertEq(earliestYear, REMOVAL_DATA_FIXTURE.vintage);
    assertEq(_listedSupply[supplier].latestYear, REMOVAL_DATA_FIXTURE.vintage);
    EnumerableSetUpgradeable.UintSet storage yearToRemovals = _listedSupply[
      supplier
    ].yearToRemovals[earliestYear];
    assertEq(yearToRemovals.length(), 1);
    assertEq(yearToRemovals.at(0), REMOVAL_ID_FIXTURE);
    assertEq(_suppliers[supplier].next, supplier);
    assertEq(_suppliers[supplier].previous, supplier);
  }

  function test__list2VintagesFor1SupplierFor1SubIdentifier() external {
    DecodedRemovalIdV0 memory secondRemovalsData = REMOVAL_DATA_FIXTURE;
    secondRemovalsData.vintage = REMOVAL_DATA_FIXTURE.vintage + 1;
    uint256 secondRemovalsId = RemovalIdLib.createRemovalId(secondRemovalsData);
    _addActiveRemoval({removalId: REMOVAL_ID_FIXTURE});
    _addActiveRemoval({removalId: secondRemovalsId});
    uint256 earliestYear = REMOVAL_DATA_FIXTURE.vintage;
    uint256 latestYear = secondRemovalsData.vintage;
    address supplier = RemovalIdLib.supplierAddress(secondRemovalsId);
    EnumerableSetUpgradeable.UintSet storage yearToRemovals = _listedSupply[
      supplier
    ].yearToRemovals[latestYear];
    assertEq(_listedSupply[supplier].earliestYear, earliestYear);
    assertEq(_listedSupply[supplier].latestYear, latestYear);
    assertEq(yearToRemovals.length(), 1);
    assertEq(yearToRemovals.at(0), secondRemovalsId);
    assertEq(_suppliers[supplier].next, supplier);
    assertEq(_suppliers[supplier].previous, supplier);
  }

  function test__lis2VintagesFor1SupplierFor2SubIdentifiers() external {
    DecodedRemovalIdV0 memory secondRemovalsData = REMOVAL_DATA_FIXTURE;
    secondRemovalsData.subIdentifier = REMOVAL_DATA_FIXTURE.subIdentifier + 1;
    uint256 secondRemovalsId = RemovalIdLib.createRemovalId(secondRemovalsData);
    _addActiveRemoval({removalId: REMOVAL_ID_FIXTURE});
    _addActiveRemoval({removalId: secondRemovalsId});
    uint256 earliestYear = REMOVAL_DATA_FIXTURE.vintage;
    uint256 latestYear = secondRemovalsData.vintage;
    EnumerableSetUpgradeable.UintSet storage yearToRemovals = _listedSupply[
      _namedAccounts.supplier
    ].yearToRemovals[latestYear];
    assertEq(_listedSupply[_namedAccounts.supplier].earliestYear, earliestYear);
    assertEq(_listedSupply[_namedAccounts.supplier].latestYear, latestYear);
    assertEq(yearToRemovals.length(), 2);
    assertEq(yearToRemovals.at(0), REMOVAL_ID_FIXTURE);
    assertEq(yearToRemovals.at(1), secondRemovalsId);
    assertEq(_suppliers[_namedAccounts.supplier].next, _namedAccounts.supplier);
    assertEq(
      _suppliers[_namedAccounts.supplier].previous,
      _namedAccounts.supplier
    );
  }

  function test__list1VintageFor2Suppliers() external {
    DecodedRemovalIdV0 memory secondRemovalsData = REMOVAL_DATA_FIXTURE;
    secondRemovalsData.supplierAddress = _namedAccounts.supplier2;
    uint256 secondRemovalsId = RemovalIdLib.createRemovalId(secondRemovalsData);
    _addActiveRemoval({removalId: REMOVAL_ID_FIXTURE});
    _addActiveRemoval({removalId: secondRemovalsId});
    uint256 earliestYear = REMOVAL_DATA_FIXTURE.vintage;
    uint256 latestYear = REMOVAL_DATA_FIXTURE.vintage;
    EnumerableSetUpgradeable.UintSet storage yearToRemovals = _listedSupply[
      _namedAccounts.supplier
    ].yearToRemovals[earliestYear];
    EnumerableSetUpgradeable.UintSet storage queueByVintage2 = _listedSupply[
      _namedAccounts.supplier2
    ].yearToRemovals[earliestYear];
    assertEq(_listedSupply[_namedAccounts.supplier].earliestYear, earliestYear);
    assertEq(_listedSupply[_namedAccounts.supplier].latestYear, latestYear);
    assertEq(
      _listedSupply[_namedAccounts.supplier2].earliestYear,
      earliestYear
    );
    assertEq(_listedSupply[_namedAccounts.supplier2].latestYear, latestYear);
    assertEq(yearToRemovals.length(), 1);
    assertEq(queueByVintage2.length(), 1);
    assertEq(yearToRemovals.at(0), REMOVAL_ID_FIXTURE);
    assertEq(queueByVintage2.at(0), secondRemovalsId);
    assertEq(
      _suppliers[_namedAccounts.supplier].next,
      _namedAccounts.supplier2
    );
    assertEq(
      _suppliers[_namedAccounts.supplier].previous,
      _namedAccounts.supplier2
    );
    assertEq(
      _suppliers[_namedAccounts.supplier2].next,
      _namedAccounts.supplier
    );
    assertEq(
      _suppliers[_namedAccounts.supplier2].previous,
      _namedAccounts.supplier
    );
  }
}

contract Market_onERC1155Received is UpgradeableMarket {
  function test() external {
    vm.prank(address(_removal));
    assertEq(
      _market.onERC1155Received(
        address(0),
        address(0),
        REMOVAL_ID_FIXTURE,
        uint256(1),
        ""
      ),
      IERC1155ReceiverUpgradeable.onERC1155Received.selector
    );
  }
}

contract Market_onERC1155Received_reverts_SenderNotRemovalContract is
  UpgradeableMarket
{
  NonUpgradeableRemoval private _unregisteredRemovalDuplicate;
  uint256[] private _removalIds;

  function setUp() external {
    _unregisteredRemovalDuplicate = new NonUpgradeableRemoval();
    _unregisteredRemovalDuplicate.grantRole(
      _unregisteredRemovalDuplicate.CONSIGNOR_ROLE(),
      address(this)
    );
    _marketAddress = address(_market);
    _unregisteredRemovalDuplicate.registerContractAddresses(
      Market(_market),
      Certificate(_certificate)
    );
    _rNori.registerContractAddresses(
      IERC20WithPermit(address(_bpNori)),
      Removal(_unregisteredRemovalDuplicate)
    );
    _rNori.grantRole(
      _rNori.SCHEDULE_CREATOR_ROLE(),
      address(_unregisteredRemovalDuplicate)
    );
    _removalIds = _unregisteredRemovalDuplicate.seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false,
      uniqueVintages: false
    });
  }

  function test() external {
    vm.expectRevert("Market: Sender not Removal");
    _unregisteredRemovalDuplicate.consign({
      from: _namedAccounts.supplier,
      id: _removalIds[0],
      amount: 1 ether
    });
  }
}

contract Market_onERC1155BatchReceived is UpgradeableMarket {
  function test() external {
    vm.prank(address(_removal));
    assertEq(
      _market.onERC1155BatchReceived(
        address(0),
        address(0),
        new uint256[](1).fill(REMOVAL_ID_FIXTURE),
        new uint256[](1).fill(1),
        ""
      ),
      IERC1155ReceiverUpgradeable.onERC1155BatchReceived.selector
    );
  }
}

contract Market_onERC1155BatchReceived_reverts_SenderNotRemovalContract is
  UpgradeableMarket
{
  NonUpgradeableRemoval private _unregisteredRemovalDuplicate;
  uint256[] private _removalIds;

  function setUp() external {
    _unregisteredRemovalDuplicate = new NonUpgradeableRemoval();
    _unregisteredRemovalDuplicate.grantRole(
      _unregisteredRemovalDuplicate.CONSIGNOR_ROLE(),
      address(this)
    );
    _marketAddress = address(_market);
    _unregisteredRemovalDuplicate.registerContractAddresses(
      Market(_market),
      Certificate(_certificate)
    );
    _rNori.registerContractAddresses(
      IERC20WithPermit(address(_bpNori)),
      Removal(_unregisteredRemovalDuplicate)
    );
    _rNori.grantRole(
      _rNori.SCHEDULE_CREATOR_ROLE(),
      address(_unregisteredRemovalDuplicate)
    );
  }

  function test() external {
    vm.expectRevert("Market: Sender not Removal");
    _removalIds = _unregisteredRemovalDuplicate.seedRemovals({
      to: address(_market),
      count: 2,
      list: false,
      uniqueVintages: false
    });
  }
}

contract Market__validateSupply is NonUpgradeableMarket, UpgradeableRemoval {
  function test() external pure {
    _validateSupply({certificateAmount: 1 ether, availableSupply: 1 ether});
  }

  function test_reverts_OutOfSupply() external {
    vm.expectRevert(InsufficientSupply.selector);
    _validateSupply({certificateAmount: 1 ether, availableSupply: 0.9 ether});
  }
}

contract Market__multicall_initialize_reverts is UpgradeableMarket {
  function test() external {
    bytes[] memory multicallArg = new bytes[](1);
    multicallArg[0] = (
      abi.encodeWithSelector(
        _market.initialize.selector,
        _removal,
        _bpNori,
        _certificate,
        _rNori,
        _namedAccounts.admin,
        15
      )
    );
    vm.expectRevert("Initializable: contract is already initialized");
    _market.multicall(multicallArg);
  }
}

contract Market__multicall_empty_bytes_reverts is UpgradeableMarket {
  function test() external {
    bytes[] memory multicallArg = new bytes[](1);
    vm.expectRevert("Address: low-level delegate call failed");
    _market.multicall(multicallArg);
  }
}

contract Market_getActiveSuppliers is UpgradeableMarket {
  uint256[] private _removalIds;

  function test_no_suppliers() external {
    assertEq(_market.getActiveSuppliers(), new address[](0));
  }

  function test_1_supplier() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    assertEq(
      _market.getActiveSuppliers(),
      new address[](1).fill(_namedAccounts.supplier)
    );
  }

  function test_3_suppliers() external {
    address[] memory expectedSuppliers = new address[](3);
    expectedSuppliers[0] = _namedAccounts.supplier;
    expectedSuppliers[1] = _namedAccounts.supplier2;
    expectedSuppliers[2] = _namedAccounts.supplier3;

    for (uint256 i = 0; i < expectedSuppliers.length; i++) {
      uint256[] memory localRemovalIds = _seedRemovals({
        to: expectedSuppliers[i],
        count: 1,
        list: true
      });
      _removalIds.push(localRemovalIds[0]);
    }
    assertEq(_market.getActiveSuppliers(), expectedSuppliers);
  }
}

contract Market_getRemovalIdsForSupplier is UpgradeableMarket {
  uint256[] private _removalIds;

  function test_no_removals() external {
    assertEq(
      _market.getRemovalIdsForSupplier(_namedAccounts.supplier),
      _removalIds
    );
  }

  function test_1_removal() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true
    });
    assertEq(
      _market.getRemovalIdsForSupplier(_namedAccounts.supplier),
      _removalIds
    );
  }

  function test_3_removals() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 3,
      list: true
    });
    assertEq(
      _market.getRemovalIdsForSupplier(_namedAccounts.supplier),
      _removalIds
    );
  }

  function test_3_removals_different_vintages() external {
    _removalIds = _seedRemovals({
      to: _namedAccounts.supplier,
      count: 3,
      list: true,
      uniqueVintages: true
    });
    assertEq(
      _market.getRemovalIdsForSupplier(_namedAccounts.supplier),
      _removalIds
    );
  }
}
