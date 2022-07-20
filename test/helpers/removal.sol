/* solhint-disable contract-name-camelcase, func-name-mixedcase, var-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/Removal.sol";
import "@/test/helpers/test.sol";

abstract contract UpgradeableRemoval is Upgradeable {
  /**
   * @dev
   * UnpackedRemovalIdV0({
   *   idVersion: 0,
   *   methodology: 1,
   *   methodologyVersion: 0,
   *   vintage: 2018,
   *   country: "US",
   *   subdivision: "IA",
   *   supplierAddress: _namedAccounts.supplier,
   *   subIdentifier: 99_039_930
   * })
   *
   */
  uint256 public constant REMOVAL_ID_FIXTURE =
    28323967194635186208115198611987694236062136249434403320464507420610607802;

  Removal internal _removal;
  Removal internal _removalImplementation;

  event TransferBatch(
    address indexed operator,
    address indexed from,
    address indexed to,
    uint256[] ids,
    uint256[] values
  );

  constructor() {
    _removal = _deployRemoval();
  }

  function _deployRemoval() internal returns (Removal) {
    _removalImplementation = new Removal();
    bytes memory initializer = abi.encodeWithSelector(
      _removalImplementation.initialize.selector
    );
    return Removal(_deployProxy(address(_removalImplementation), initializer));
  }
}

abstract contract NonUpgradableRemoval is Removal, Global {}
