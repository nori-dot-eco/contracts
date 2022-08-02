/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";
import "@/test/helpers/removal.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
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
    _removal.safeBatchTransferFrom({
      from: _namedAccounts.supplier,
      to: address(_market),
      ids: new uint256[](1).fill(_removalIds[0]),
      amounts: new uint256[](1).fill(_amountPerRemoval),
      data: ""
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
    _assertCorrectStates();
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
    vm.prank(_namedAccounts.supplier);
    _removal.safeBatchTransferFrom({
      from: _namedAccounts.supplier,
      to: address(_market),
      ids: new uint256[](1).fill(_removalIds[0]),
      amounts: new uint256[](1).fill(_amountPerRemoval),
      data: ""
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
      bytes32(uint256(251)), // sets the _removal storage slot to the market contract to enable mock calls
      bytes32(uint256(uint160(address(this))))
    );
  }

  function test_returnsTrueWhenMsgSenderEqualsOwner() external {
    assertEq(_isAuthorizedWithdrawal({owner: _msgSender()}), true);
  }

  function test_returnsTrueWhenMsgSenderHasDefaultAdminRole() external {
    _grantRole({role: DEFAULT_ADMIN_ROLE, account: _msgSender()});
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
      bytes32(uint256(251)), // sets the _removal storage slot to the market contract to enable mock calls
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
      activeSupply: 1 ether
    });
  }

  function test_supplyAfterPurchaseIsZero() external view {
    _validatePrioritySupply({
      certificateAmount: 1 ether,
      activeSupply: 1 ether
    });
  }
}

contract Market__validatePrioritySupply_buyerIsAllowlistedAndAmountExceedsPriorityRestrictedThreshold is
  NonUpgradeableMarket
{
  function setUp() external {
    _grantRole({role: DEFAULT_ADMIN_ROLE, account: _msgSender()});
    vm.prank(_msgSender());
    this.setPriorityRestrictedThreshold({threshold: 0.5 ether});
    _grantRole({role: ALLOWLIST_ROLE, account: _namedAccounts.deployer});
  }

  function test() external view {
    _validatePrioritySupply({
      certificateAmount: 1 ether,
      activeSupply: 1 ether
    });
  }
}

contract Market__validatePrioritySupply_reverts_LowSupplyAllowlistRequired is
  NonUpgradeableMarket
{
  function setUp() external {
    _grantRole({role: DEFAULT_ADMIN_ROLE, account: _msgSender()});
    vm.prank(_msgSender());
    this.setPriorityRestrictedThreshold({threshold: 1 ether});
  }

  function test() external {
    vm.expectRevert(LowSupplyAllowlistRequired.selector);
    _validatePrioritySupply({
      certificateAmount: 1 ether,
      activeSupply: 1 ether
    });
  }
}

contract Market__listForSale is NonUpgradeableMarket, UpgradeableRemoval {
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

  function test() external {
    _listForSale({id: REMOVAL_ID_FIXTURE});
  }

  function test__list1VintageFor1Supplier() external {
    _listForSale({id: REMOVAL_ID_FIXTURE});
    address supplier = RemovalIdLib.supplierAddress(REMOVAL_ID_FIXTURE);
    uint256 earliestYear = _activeSupply[supplier].earliestYear;
    assertEq(earliestYear, REMOVAL_DATA_FIXTURE.vintage);
    assertEq(_activeSupply[supplier].latestYear, REMOVAL_DATA_FIXTURE.vintage);
    EnumerableSetUpgradeable.UintSet storage queueByVintage = _activeSupply[
      supplier
    ].queueByVintage[earliestYear];
    assertEq(queueByVintage.length(), 1);
    assertEq(queueByVintage.at(0), REMOVAL_ID_FIXTURE);
    assertEq(
      _suppliersInRoundRobinOrder[supplier].nextSupplierAddress,
      supplier
    );
    assertEq(
      _suppliersInRoundRobinOrder[supplier].previousSupplierAddress,
      supplier
    );
  }

  function test__list2VintagesFor1SupplierFor1SubIdentifier() external {
    UnpackedRemovalIdV0 memory secondRemovalsData = REMOVAL_DATA_FIXTURE;
    secondRemovalsData.vintage = REMOVAL_DATA_FIXTURE.vintage + 1;
    uint256 secondRemovalsId = RemovalIdLib.createRemovalId(secondRemovalsData);
    _listForSale({id: REMOVAL_ID_FIXTURE});
    _listForSale({id: secondRemovalsId});
    uint256 earliestYear = REMOVAL_DATA_FIXTURE.vintage;
    uint256 latestYear = secondRemovalsData.vintage;
    address supplier = RemovalIdLib.supplierAddress(secondRemovalsId);
    EnumerableSetUpgradeable.UintSet storage queueByVintage = _activeSupply[
      supplier
    ].queueByVintage[latestYear];
    assertEq(_activeSupply[supplier].earliestYear, earliestYear);
    assertEq(_activeSupply[supplier].latestYear, latestYear);
    assertEq(queueByVintage.length(), 1);
    assertEq(queueByVintage.at(0), secondRemovalsId);
    assertEq(
      _suppliersInRoundRobinOrder[supplier].nextSupplierAddress,
      supplier
    );
    assertEq(
      _suppliersInRoundRobinOrder[supplier].previousSupplierAddress,
      supplier
    );
  }

  function test__lis2VintagesFor1SupplierFor2SubIdentifiers() external {
    UnpackedRemovalIdV0 memory secondRemovalsData = REMOVAL_DATA_FIXTURE;
    secondRemovalsData.subIdentifier = REMOVAL_DATA_FIXTURE.subIdentifier + 1;
    uint256 secondRemovalsId = RemovalIdLib.createRemovalId(secondRemovalsData);
    _listForSale({id: REMOVAL_ID_FIXTURE});
    _listForSale({id: secondRemovalsId});
    uint256 earliestYear = REMOVAL_DATA_FIXTURE.vintage;
    uint256 latestYear = secondRemovalsData.vintage;
    EnumerableSetUpgradeable.UintSet storage queueByVintage = _activeSupply[
      _namedAccounts.supplier
    ].queueByVintage[latestYear];
    assertEq(_activeSupply[_namedAccounts.supplier].earliestYear, earliestYear);
    assertEq(_activeSupply[_namedAccounts.supplier].latestYear, latestYear);
    assertEq(queueByVintage.length(), 2);
    assertEq(queueByVintage.at(0), REMOVAL_ID_FIXTURE);
    assertEq(queueByVintage.at(1), secondRemovalsId);
    assertEq(
      _suppliersInRoundRobinOrder[_namedAccounts.supplier].nextSupplierAddress,
      _namedAccounts.supplier
    );
    assertEq(
      _suppliersInRoundRobinOrder[_namedAccounts.supplier]
        .previousSupplierAddress,
      _namedAccounts.supplier
    );
  }

  function test__list1VintageFor2Suppliers() external {
    UnpackedRemovalIdV0 memory secondRemovalsData = REMOVAL_DATA_FIXTURE;
    secondRemovalsData.supplierAddress = _namedAccounts.supplier2;
    uint256 secondRemovalsId = RemovalIdLib.createRemovalId(secondRemovalsData);
    _listForSale({id: REMOVAL_ID_FIXTURE});
    _listForSale({id: secondRemovalsId});
    uint256 earliestYear = REMOVAL_DATA_FIXTURE.vintage;
    uint256 latestYear = REMOVAL_DATA_FIXTURE.vintage;
    EnumerableSetUpgradeable.UintSet storage queueByVintage = _activeSupply[
      _namedAccounts.supplier
    ].queueByVintage[earliestYear];
    EnumerableSetUpgradeable.UintSet storage queueByVintage2 = _activeSupply[
      _namedAccounts.supplier2
    ].queueByVintage[earliestYear];
    assertEq(_activeSupply[_namedAccounts.supplier].earliestYear, earliestYear);
    assertEq(_activeSupply[_namedAccounts.supplier].latestYear, latestYear);
    assertEq(
      _activeSupply[_namedAccounts.supplier2].earliestYear,
      earliestYear
    );
    assertEq(_activeSupply[_namedAccounts.supplier2].latestYear, latestYear);
    assertEq(queueByVintage.length(), 1);
    assertEq(queueByVintage2.length(), 1);
    assertEq(queueByVintage.at(0), REMOVAL_ID_FIXTURE);
    assertEq(queueByVintage2.at(0), secondRemovalsId);
    assertEq(
      _suppliersInRoundRobinOrder[_namedAccounts.supplier].nextSupplierAddress,
      _namedAccounts.supplier2
    );
    assertEq(
      _suppliersInRoundRobinOrder[_namedAccounts.supplier]
        .previousSupplierAddress,
      _namedAccounts.supplier2
    );
    assertEq(
      _suppliersInRoundRobinOrder[_namedAccounts.supplier2].nextSupplierAddress,
      _namedAccounts.supplier
    );
    assertEq(
      _suppliersInRoundRobinOrder[_namedAccounts.supplier2]
        .previousSupplierAddress,
      _namedAccounts.supplier
    );
  }
}

contract Market_onERC1155Received is UpgradeableMarket {
  function test() external {
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

contract Market_onERC1155BatchReceived is UpgradeableMarket {
  function test() external {
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

contract Market__validateSuppliersSupply is
  NonUpgradeableMarket,
  UpgradeableRemoval
{
  function test() external pure {
    _validateSuppliersSupply({activeSupplyOfSupplier: 1 ether});
  }

  function test_reverts_OutOfStock() external {
    vm.expectRevert(OutOfStock.selector);
    _validateSuppliersSupply({activeSupplyOfSupplier: 0});
  }
}
