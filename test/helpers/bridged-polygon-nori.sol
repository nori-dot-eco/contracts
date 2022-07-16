/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.15;
import "@/contracts/BridgedPolygonNORI.sol";
import "@/test/helpers/test.sol";
import "@/test/helpers/signature-utils.sol";

abstract contract UpgradeableBridgedPolygonNORI is Upgradeable {
  BridgedPolygonNORI internal _bpNori;
  SignatureUtils internal _signatureUtils;

  constructor() {
    _bpNori = _deployBridgedPolygonNORI();
    _bpNori.grantRole(_bpNori.DEPOSITOR_ROLE(), _namedAccounts.admin);
    _signatureUtils = new SignatureUtils(_bpNori.DOMAIN_SEPARATOR());
  }

  function _deployBridgedPolygonNORI() internal returns (BridgedPolygonNORI) {
    BridgedPolygonNORI impl = new BridgedPolygonNORI();
    address childChainManagerProxy = address(0); // todo deploy an actual polygon child chain manager using vm.etch
    bytes memory initializer = abi.encodeWithSelector(
      impl.initialize.selector,
      "initialize(address)",
      childChainManagerProxy
    );
    return BridgedPolygonNORI(_deployProxy(address(impl), initializer));
  }
}

abstract contract NonUpgradableBridgedPolygonNORIMock is
  BridgedPolygonNORI,
  Global
{}

abstract contract UpgradableBridgedPolygonNORIMock is
  UpgradeableBridgedPolygonNORI
{}

abstract contract BridgedPolygonNORISeeded is
  UpgradableBridgedPolygonNORIMock,
  SeedableMock
{
  constructor() {
    _seed();
  }

  function _seed() internal override {}
}
