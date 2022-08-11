/* solhint-disable contract-name-camelcase, func-name-mixedcase, var-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";

contract RemovalQueue_getTotalBalanceFromRemovalQueue is NonUpgradeableMarket {
  using RemovalsByYearLib for RemovalsByYear;
  using AddressArrayLib for address[];
  using UInt256ArrayLib for uint256[];

  NonUpgradeableRemoval private _removal;

  constructor() {
    _removal = new NonUpgradeableRemoval();
    vm.store(
      address(_removal),
      bytes32(uint256(401)), // sets the Removal._market storage slot to this contract to enable mock calls
      bytes32(uint256(uint160(address(this))))
    );
    vm.store(
      address(this),
      bytes32(uint256(304)), // sets the markets _restrictedNORI storage slot to this contract to enable mock calls
      bytes32(uint256(uint160(address(this))))
    );
    vm.store(
      address(this),
      bytes32(uint256(301)), // sets the markets _removal storage slot to allow receiving 1155
      bytes32(uint256(uint160(address(_removal))))
    );
  }

  function setUp() external {
    vm.mockCall(
      address(this),
      abi.encodeWithSelector(RestrictedNORI.scheduleExists.selector),
      abi.encode(true)
    );
    _removal.seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: true,
      uniqueVintages: false
    });
    _removal.seedRemovals({
      to: _namedAccounts.supplier2,
      count: 100,
      list: true,
      uniqueVintages: false
    });
    _removal.seedRemovals({
      to: _namedAccounts.supplier3,
      count: 100,
      list: true,
      uniqueVintages: true
    });
  }

  function getTotalBalance(RemovalsByYear storage collection)
    internal
    view
    returns (uint256 totalBalance)
  {
    uint256 latestYear = collection.latestYear;
    for (uint256 year = collection.earliestYear; year <= latestYear; ++year) {
      EnumerableSetUpgradeable.UintSet storage removalIdSet = collection
        .yearToRemovals[year];
      uint256[] memory removalIds = collection.getAllRemovalIds();
      totalBalance += _removal
        .balanceOfBatch(
          new address[](removalIds.length).fill(address(this)),
          removalIds
        )
        .sum();
    }
  }

  function test() external {
    assertEq(getTotalBalance(_listedSupply[_namedAccounts.supplier]), 1 ether);
  }

  function test_100xRemovalsOfTheSameVintage() external {
    assertEq(
      getTotalBalance(_listedSupply[_namedAccounts.supplier2]),
      100 ether
    );
  }

  function test_100xRemovalsOfTheDifferentVintages() external {
    assertEq(
      getTotalBalance(_listedSupply[_namedAccounts.supplier3]),
      100 ether
    );
  }
}

contract RemovalQueue_insertRemovalByVintage is NonUpgradeableMarket {
  using RemovalsByYearLib for RemovalsByYear;
  using RemovalIdLib for uint256;

  NonUpgradeableRemoval private _removal;
  uint256[] private _removalIds;

  constructor() {
    _removal = new NonUpgradeableRemoval();
    vm.store(
      address(_removal),
      bytes32(uint256(401)), // sets the Removal._market storage slot to this contract to enable mock calls
      bytes32(uint256(uint160(address(this))))
    );
    vm.store(
      address(this),
      bytes32(uint256(304)), // sets the markets _restrictedNORI storage slot to this contract to enable mock calls
      bytes32(uint256(uint160(address(this))))
    );
  }

  function setUp() external {
    vm.mockCall(
      address(this),
      abi.encodeWithSelector(RestrictedNORI.scheduleExists.selector),
      abi.encode(true)
    );
    _removalIds = _removal.seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false,
      uniqueVintages: false
    });
  }

  function test_insertRemovalOnce() external {
    RemovalsByYear storage collection = _listedSupply[_namedAccounts.supplier];
    uint256 removalId = _removalIds[0];
    collection.insert(removalId);
    assertEq(collection.getCountForYear(removalId.vintage()), 1);
  }

  function test_insertRemovalTwice() external {
    RemovalsByYear storage collection = _listedSupply[_namedAccounts.supplier];
    uint256 removalId = _removalIds[0];
    collection.insert(removalId);
    collection.insert(removalId);
    assertEq(collection.getCountForYear(removalId.vintage()), 1);
  }
}
