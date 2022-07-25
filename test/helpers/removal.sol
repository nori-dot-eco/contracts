/* solhint-disable contract-name-camelcase, func-name-mixedcase, var-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/test/helpers/test.sol";
import "@/contracts/Removal.sol";
import "@/contracts/ArrayLib.sol";

abstract contract UpgradeableRemoval is Upgradeable {
  using ArrayLib for uint256[];
  using AddressArrayLib for address[];

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

  function _seedRemoval(address to, uint32 count)
    internal
    returns (uint256[] memory)
  {
    uint256[] memory _removalIds = new uint256[](count);
    for (uint32 i = 0; i < count; i++) {
      UnpackedRemovalIdV0 memory removalData = UnpackedRemovalIdV0({
        idVersion: 0,
        methodology: 1,
        methodologyVersion: 0,
        vintage: 2018,
        country: "AA",
        subdivision: "ZZ",
        supplierAddress: to,
        subIdentifier: count + i
      });
      _removalIds[i] = _removal.createRemovalId(removalData);
    }
    BatchMintRemovalsData memory batchMintData = BatchMintRemovalsData({
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50,
      list: true
    });
    _removal.mintBatch(
      to,
      new uint256[](count).fill(1 ether),
      _removalIds,
      batchMintData
    );
    return _removalIds;
  }
}

abstract contract NonUpgradableRemoval is Removal, Global {}
