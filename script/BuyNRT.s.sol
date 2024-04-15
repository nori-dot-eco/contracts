// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "forge-std/Script.sol";
import "@/contracts/IERC20WithPermit.sol";
import "@/test/helpers/signature-utils.sol";
import "@/contracts/Market.sol";

/**
 * @notice Example script demonstrating a purchase interaction with Nori's Market contract.
 *
 * Contextual information is bound in using environment variables, i.e. for Amoy:
 *
 * export PURCHASING_TOKEN_ADDRESS="0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97" # USDC
 * export NRTS=1
 * export MNEMONIC="..."
 * export RECIPIENT_ADDRESS="<0x00>"
 * export AMOY_RPC_URL="https://..."
 * export NETWORK_NAME="amoy"
 *
 * forge script script/BuyNRT.s.sol:BuyNRT --rpc-url="$NETWORK_NAME" --mnemonics="$MNEMONIC" --broadcast -vvvv
 */
contract BuyNRT is Script {
  SignatureUtils private immutable _signatureUtils = new SignatureUtils();

  Market private immutable _market =
    Market(
      vm.parseJsonAddress(
        vm.readFile(string.concat(vm.projectRoot(), "/contracts.json")),
        ".amoy.Market.proxyAddress"
      )
    );

  uint256 private immutable _nrts = vm.envUint("NRTS") * 1 ether;

  IERC20WithPermit private immutable _purchasingToken =
    IERC20WithPermit(vm.envAddress("PURCHASING_TOKEN_ADDRESS"));

  address private immutable _recipient = vm.envAddress("RECIPIENT_ADDRESS");

  function run() external {
    vm.startBroadcast();
    SignedPermit memory signedPermit = _signatureUtils.generatePermit({
      ownerPrivateKey: vm.deriveKey(vm.envString("MNEMONIC"), 0),
      spender: address(_market),
      amount: _market.calculateCheckoutTotal({amount: _nrts}),
      deadline: block.timestamp + 1 days,
      token: _purchasingToken
    });
    _market.swap({
      recipient: _recipient,
      amount: _nrts,
      deadline: signedPermit.permit.deadline,
      v: signedPermit.v,
      r: signedPermit.r,
      s: signedPermit.s
    });
    vm.stopBroadcast();
  }
}
