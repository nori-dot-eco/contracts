/* solhint-disable contract-name-camelcase, func-name-mixedcase */
// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;
import {BridgedPolygonNORI} from "@/contracts/BridgedPolygonNORI.sol";
import {Global, Upgradeable} from "@/test/helpers/test.sol";
import {SignatureUtils} from "@/test/helpers/signature-utils.sol";

abstract contract UpgradeableBridgedPolygonNORI is Upgradeable {
  BridgedPolygonNORI internal _bpNori;
  SignatureUtils internal _bpNoriSignatureUtils;

  constructor() {
    _bpNori = _deployBridgedPolygonNORI();
    _bpNori.grantRole(_bpNori.DEPOSITOR_ROLE(), _namedAccounts.admin);
    _bpNoriSignatureUtils = new SignatureUtils();
  }

  function _deployBridgedPolygonNORI() internal returns (BridgedPolygonNORI) {
    BridgedPolygonNORI impl = new BridgedPolygonNORI();
    vm.label(address(impl), "BridgedPolygonNORI Implementation");
    address childChainManagerProxy = address(0); // todo deploy an actual polygon child chain manager using vm.etch
    bytes memory initializer = abi.encodeWithSelector(
      impl.initialize.selector,
      "initialize(address)",
      childChainManagerProxy
    );
    BridgedPolygonNORI proxy = BridgedPolygonNORI(
      _deployProxy(address(impl), initializer)
    );
    vm.label(address(proxy), "BridgedPolygonNORI Proxy");
    return proxy;
  }
}

// solhint-disable-next-line no-empty-blocks, this is a test
contract NonUpgradeableBridgedPolygonNORI is BridgedPolygonNORI, Global {

}
