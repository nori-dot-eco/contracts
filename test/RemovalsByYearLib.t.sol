/* solhint-disable contract-name-camelcase, func-name-mixedcase, var-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import {IERC20WithPermit} from "@/contracts/IERC20WithPermit.sol";
import {RestrictedNORI} from "@/contracts/RestrictedNORI.sol";
import {
  RemovalsByYearLib,
  RemovalsByYear
} from "@/contracts/RemovalsByYearLib.sol";
import {RemovalIdLib} from "@/contracts/RemovalIdLib.sol";
import {UInt256ArrayLib, AddressArrayLib} from "@/contracts/ArrayLib.sol";
import {
  NonUpgradeableMarket,
  NonUpgradeableNORIMarket
} from "@/test/helpers/market.sol";
import {
  UpgradeableRemoval,
  NonUpgradeableRemoval
} from "@/test/helpers/removal.sol";
import {
  NonUpgradeableBridgedPolygonNORI
} from "@/test/helpers/bridged-polygon-nori.sol";
import {console2} from "forge-std/console2.sol";

contract RemovalQueue__getTotalBalanceFromRemovalQueue is
  NonUpgradeableNORIMarket
{
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

  function test() external {
    assertEq(_getTotalBalance(_listedSupply[_namedAccounts.supplier]), 1 ether);
  }

  function test_100xRemovalsOfTheSameVintage() external {
    assertEq(
      _getTotalBalance(_listedSupply[_namedAccounts.supplier2]),
      100 ether
    );
  }

  function test_100xRemovalsOfTheDifferentVintages() external {
    assertEq(
      _getTotalBalance(_listedSupply[_namedAccounts.supplier3]),
      100 ether
    );
  }

  function _getTotalBalance(RemovalsByYear storage collection)
    internal
    view
    returns (uint256)
  {
    uint256[] memory removalIds = collection.getAllRemovalIds();
    return
      _removal
        .balanceOfBatch(
          new address[](removalIds.length).fill(address(this)),
          removalIds
        )
        .sum();
  }
}

contract RemovalQueue_insertRemovalByVintage is NonUpgradeableNORIMarket {
  using RemovalsByYearLib for RemovalsByYear;
  using RemovalIdLib for uint256;

  uint256[] private _removalIds;

  function setUp() external {
    _removalIds = NonUpgradeableRemoval(this.getRemovalAddress()).seedRemovals({
      to: _namedAccounts.supplier,
      count: 1,
      list: false,
      uniqueVintages: false
    });
  }

  function test_insertRemovalOnce() external {
    console2.log("test_insertRemovalOnce", this.getRemovalAddress());
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
