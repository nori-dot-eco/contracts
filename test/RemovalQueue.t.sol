/* solhint-disable contract-name-camelcase, func-name-mixedcase, var-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/market.sol";

contract RemovalQueue_getTotalBalanceFromRemovalQueue is NonUpgradeableMarket {
  using RemovalQueue for RemovalQueueByVintage;

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
      bytes32(uint256(254)), // sets the markets _restrictedNori storage slot to this contract to enable mock calls
      bytes32(uint256(uint160(address(this))))
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
    assertEq(
      _activeSupply[_namedAccounts.supplier].getTotalBalanceFromRemovalQueue(
        _removal
      ),
      1 ether
    );
  }

  function test_100xRemovalsOfTheSameVintage() external {
    assertEq(
      _activeSupply[_namedAccounts.supplier2].getTotalBalanceFromRemovalQueue(
        _removal
      ),
      100 ether
    );
  }

  function test_100xRemovalsOfTheDifferentVintages() external {
    assertEq(
      _activeSupply[_namedAccounts.supplier3].getTotalBalanceFromRemovalQueue(
        _removal
      ),
      100 ether
    );
  }
}
