// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.17;

import "forge-std/Script.sol";
import "../contracts/BridgedPolygonNORI.sol";
import "../contracts/Market.sol";

/**
 * Example script demonstrating a purchase interaction with Nori's Market contract.
 *
 * Contextual information is bound in using environment variables, i.e. for Mumbai
 *
 * export MARKET_ADDRESS="0x61A9d9A34Dbc3a1accD55D684A2bF0e0D394201f"
 * export BP_NORI_ADDRESS="0xB3fe45C08137dD6adACb2918D899e0C0dBB036C8"
 * export BUYER_PRIVATE_KEY="<0x00>"
 * export RECIPIENT_ADDRESS="<0x00>"
 * export MUMBAI_RPC_URL="https://..."
 *
 * forge script script/BuyNRT.s.sol:BuyNRT --rpc-url "$MUMBAI_RPC_URL" --private-keys "$BUYER_PRIVATE_KEY" --broadcast -vvvv
 */

struct Permit {
  address owner;
  address spender;
  uint256 value;
  uint256 nonce;
  uint256 deadline;
}

contract BuyNRT is Script {
  /**
   * @dev This hash is the result of
   * `keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")`.
   */
  bytes32 public constant PERMIT_TYPEHASH =
    0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

  BridgedPolygonNORI private _bridgedPolygonNORI;
  Market private _market;

  function run() external {
    uint256 buyerPrivateKey = vm.envUint("BUYER_PRIVATE_KEY");
    address buyerAddress = vm.addr(buyerPrivateKey);

    vm.startBroadcast(buyerAddress);

    address bpNoriAddress = vm.envAddress("BP_NORI_ADDRESS");
    _bridgedPolygonNORI = BridgedPolygonNORI(bpNoriAddress);

    address marketAddress = vm.envAddress("MARKET_ADDRESS");
    _market = Market(marketAddress);

    // recipientAddress is where the certificate is minted to.  It will often be
    // the same as buyerAddress (who pays NORI) but is not required to be.
    address recipientAddress = vm.envAddress("RECIPIENT_ADDRESS");
    // Buy 10  NRTs
    uint256 NRT_PURCHASE_QUANTITY = 10.0 ether;

    Permit memory permit = Permit({
      owner: buyerAddress,
      spender: marketAddress,
      value: NRT_PURCHASE_QUANTITY,
      nonce: _bridgedPolygonNORI.nonces(buyerAddress),
      deadline: block.timestamp + 1 days
    });
    bytes32 digest = _getTypedDataHash(
      permit,
      _bridgedPolygonNORI.DOMAIN_SEPARATOR()
    );
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(buyerPrivateKey, digest);

    _market.swapByPermit(
      recipientAddress,
      permit.value,
      permit.deadline,
      v,
      r,
      s
    );

    vm.stopBroadcast();
  }

  /**
   * @dev computes the hash of the fully encoded EIP-712 message for the domain, which can be used to recover the
   * signer.
   */
  function _getTypedDataHash(Permit memory permit, bytes32 domainSeparator)
    internal
    view
    returns (bytes32)
  {
    return
      keccak256(
        abi.encodePacked("\x19\x01", domainSeparator, _getStructHash(permit))
      );
  }

  /**
   * @dev Computes the hash of a permit.
   */
  function _getStructHash(Permit memory permit)
    internal
    pure
    returns (bytes32)
  {
    return
      keccak256(
        abi.encode(
          PERMIT_TYPEHASH,
          permit.owner,
          permit.spender,
          permit.value,
          permit.nonce,
          permit.deadline
        )
      );
  }
}
