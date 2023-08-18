/* solhint-disable contract-name-camelcase, func-name-mixedcase, var-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import "@/test/helpers/test.sol";
import "@/contracts/Removal.sol";
import "@/contracts/ArrayLib.sol";

using UInt256ArrayLib for uint256[];
using AddressArrayLib for address[];

abstract contract UpgradeableRemoval is Upgradeable {
  DecodedRemovalIdV0[] _REMOVAL_FIXTURES;

  address internal _marketAddress;

  /**
   * @dev REMOVAL_ID_FIXTURE is the result of:
   * RemovalIdLib.createRemovalId(DecodedRemovalIdV0({
   *   idVersion: 0,
   *   methodology: 1,
   *   methodologyVersion: 0,
   *   vintage: 2018,
   *   country: "US",
   *   subdivision: "IA",
   *   supplierAddress: _namedAccounts.supplier,
   *   subIdentifier: 99_039_930
   * }))
   */
  uint256 public constant REMOVAL_ID_FIXTURE =
    28323967194635191374224967253542818032149542492774326996283828950022961850;

  DecodedRemovalIdV0 public REMOVAL_DATA_FIXTURE =
    DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "US",
      subdivision: "IA",
      supplierAddress: _namedAccounts.supplier,
      subIdentifier: 99_039_930
    });

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
    _REMOVAL_FIXTURES.push(
      DecodedRemovalIdV0({
        idVersion: 0,
        methodology: 1,
        methodologyVersion: 0,
        vintage: 2018,
        country: "US",
        subdivision: "IA",
        supplierAddress: _namedAccounts.supplier,
        subIdentifier: 99_039_930
      })
    );
  }

  function _deployRemoval() internal returns (Removal) {
    _removalImplementation = new Removal();
    vm.label(address(_removalImplementation), "Removal Implementation");
    bytes memory initializer = abi.encodeWithSelector(
      _removalImplementation.initialize.selector,
      "https://registry.test.nori.com/removals"
    );
    Removal removalProxy = Removal(
      _deployProxy(address(_removalImplementation), initializer)
    );
    vm.label(address(removalProxy), "Removal Proxy");
    return removalProxy;
  }

  function _seedRemovals(
    address to,
    uint32 count,
    bool list
  ) internal returns (uint256[] memory) {
    uint256[] memory _removalIds = new uint256[](count);
    DecodedRemovalIdV0[] memory removals = new DecodedRemovalIdV0[](count);
    for (uint32 i = 0; i < count; i++) {
      DecodedRemovalIdV0 memory removalData = DecodedRemovalIdV0({
        idVersion: 0,
        methodology: 1,
        methodologyVersion: 0,
        vintage: 2018,
        country: "AA",
        subdivision: "ZZ",
        supplierAddress: to,
        subIdentifier: count + i
      });
      removals[i] = removalData;
      _removalIds[i] = RemovalIdLib.createRemovalId(removalData);
    }
    _removal.mintBatch({
      to: list ? _marketAddress : to,
      amounts: new uint256[](count).fill(1 ether),
      removals: removals,
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
    return _removalIds;
  }

  function _seedRemovals(
    address to,
    uint32 count,
    bool list,
    uint8 holdbackPercentage
  ) internal returns (uint256[] memory) {
    uint256[] memory _removalIds = new uint256[](count);
    DecodedRemovalIdV0[] memory removals = new DecodedRemovalIdV0[](count);
    for (uint32 i = 0; i < count; i++) {
      DecodedRemovalIdV0 memory removalData = DecodedRemovalIdV0({
        idVersion: 0,
        methodology: 1,
        methodologyVersion: 0,
        vintage: 2018,
        country: "AA",
        subdivision: "ZZ",
        supplierAddress: to,
        subIdentifier: count + i
      });
      removals[i] = removalData;
      _removalIds[i] = RemovalIdLib.createRemovalId(removalData);
    }
    _removal.mintBatch({
      to: list ? _marketAddress : to,
      amounts: new uint256[](count).fill(1 ether),
      removals: removals,
      projectId: 1_234_567_890,
      scheduleStartTime: block.timestamp,
      holdbackPercentage: holdbackPercentage
    });
    return _removalIds;
  }

  function _seedRemovals(
    address to,
    uint32 count,
    bool list,
    bool uniqueVintages
  ) internal returns (uint256[] memory) {
    DecodedRemovalIdV0[] memory _removals = new DecodedRemovalIdV0[](count);
    uint256[] memory _removalIds = new uint256[](count);
    for (uint32 i = 0; i < count; i++) {
      _removals[i] = DecodedRemovalIdV0({
        idVersion: 0,
        methodology: 1,
        methodologyVersion: 0,
        vintage: uniqueVintages ? 2018 + uint16(i) : 2018,
        country: "AA",
        subdivision: "ZZ",
        supplierAddress: to,
        subIdentifier: count + i
      });
      _removalIds[i] = RemovalIdLib.createRemovalId(_removals[i]);
    }
    _removal.mintBatch(
      list ? _marketAddress : to,
      new uint256[](count).fill(1 ether),
      _removals,
      1_234_567_890,
      block.timestamp,
      50
    );
    return _removalIds;
  }

  function _seedRemovals(
    address consignor,
    uint32 count,
    address supplier,
    bool uniqueVintages
  ) internal returns (uint256[] memory) {
    DecodedRemovalIdV0[] memory _removals = new DecodedRemovalIdV0[](count);
    uint256[] memory _removalIds = new uint256[](count);
    for (uint32 i = 0; i < count; i++) {
      _removals[i] = DecodedRemovalIdV0({
        idVersion: 0,
        methodology: 1,
        methodologyVersion: 0,
        vintage: uniqueVintages ? 2018 + uint16(i) : 2018,
        country: "AA",
        subdivision: "ZZ",
        supplierAddress: supplier,
        subIdentifier: count + i
      });
      _removalIds[i] = RemovalIdLib.createRemovalId(_removals[i]);
    }
    _removal.mintBatch(
      consignor,
      new uint256[](count).fill(1 ether),
      _removals,
      1_234_567_890,
      block.timestamp,
      50
    );
    return _removalIds;
  }

  function _seedRemovalSpecificAmount(
    address mintTo,
    address supplier,
    uint32 subIdentifier,
    uint256 removalAmount
  ) internal returns (uint256[] memory) {
    DecodedRemovalIdV0[] memory _removals = new DecodedRemovalIdV0[](1);
    uint256[] memory _removalIds = new uint256[](1);
    _removals[0] = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: 2018,
      country: "AA",
      subdivision: "ZZ",
      supplierAddress: supplier,
      subIdentifier: subIdentifier
    });
    _removalIds[0] = RemovalIdLib.createRemovalId(_removals[0]);
    _removal.mintBatch(
      mintTo,
      new uint256[](1).fill(removalAmount),
      _removals,
      1_234_567_890,
      block.timestamp,
      50
    );
    return _removalIds;
  }

  function _seedAndListRemoval(
    address supplier,
    uint256 amount, // in ether
    uint16 vintage
  ) internal returns (uint256) {
    DecodedRemovalIdV0 memory removalData = DecodedRemovalIdV0({
      idVersion: 0,
      methodology: 1,
      methodologyVersion: 0,
      vintage: vintage,
      country: "AA",
      subdivision: "ZZ",
      supplierAddress: supplier,
      subIdentifier: uint32(uint256(keccak256(abi.encodePacked(gasleft())))) // pseudo-random subIdentifier for uniqueness of ids
    });
    uint256 removalId = RemovalIdLib.createRemovalId(removalData);
    DecodedRemovalIdV0[] memory removalsData = new DecodedRemovalIdV0[](1);
    removalsData[0] = removalData;
    _removal.mintBatch({
      to: _marketAddress, // list on market
      amounts: new uint256[](1).fill(amount),
      removals: removalsData,
      projectId: 1_234_567_890, // projectId
      scheduleStartTime: block.timestamp,
      holdbackPercentage: 50
    });
    return removalId;
  }

  function _cumulativeBalanceOfRemovalsForOwner(
    address owner,
    uint256[] memory ids
  ) internal view returns (uint256) {
    return
      _removal
        .balanceOfBatch(new address[](ids.length).fill(address(owner)), ids)
        .sum();
  }
}

contract NonUpgradeableRemoval is Removal, Global {
  constructor() {
    vm.label(address(this), "NonUpgradeableRemoval");
    _grantRole({role: DEFAULT_ADMIN_ROLE, account: msg.sender});
    _grantRole({role: CONSIGNOR_ROLE, account: address(this)});
  }

  function _seedRemovals(
    address to,
    uint32 count,
    bool list,
    bool uniqueVintages
  ) internal returns (uint256[] memory) {
    DecodedRemovalIdV0[] memory _removals = new DecodedRemovalIdV0[](count);
    uint256[] memory _removalIds = new uint256[](count);
    for (uint32 i = 0; i < count; i++) {
      _removals[i] = DecodedRemovalIdV0({
        idVersion: 0,
        methodology: 1,
        methodologyVersion: 0,
        vintage: uniqueVintages ? 2018 + uint16(i) : 2018,
        country: "AA",
        subdivision: "ZZ",
        supplierAddress: to,
        subIdentifier: count + i
      });
      _removalIds[i] = RemovalIdLib.createRemovalId(_removals[i]);
    }
    this.mintBatch(
      list ? address(_market) : to,
      new uint256[](count).fill(1 ether),
      _removals,
      1_234_567_890,
      block.timestamp,
      50
    );
    return _removalIds;
  }

  /** todo de-duplicate with UpgradeableRemoval._seedRemovals */
  function seedRemovals(
    address to,
    uint32 count,
    bool list,
    bool uniqueVintages
  ) external returns (uint256[] memory) {
    return
      _seedRemovals({
        to: to,
        count: count,
        list: list,
        uniqueVintages: uniqueVintages
      });
  }
}
