# NORI token

## Formal Specifications

Incomplete

## Background

The NORI token is an implementation of the [ERC-777 Advanced Token Standard](https://eips.ethereum.org/EIPS/eip-777).

## Purpose

The NORI token is used to purchase Carbon Removal Certificates.

## Key features

Since the NORI token uses the ERC 777 standard it can be used in several fancy ways:

- contract introspection via [ERC-820](https://github.com/ethereum/EIPs/issues/820)

This feature allows us to register which contracts support which interfaces. As such, when you register a token to an address, you can lookup whether the receiving address supports the interface that function is trying to consume. If it does, it can "dial out" to the receiving address and have it execute a function from within its context (note this changes `msg.sender` from the tx sender to the token contract itself, so the receiving address things it was the token contract, and not the token owner, who is executing this "dialed" function).

Additionally you can use this to prevent tokens being sent to unknown addresses, or just decline token sending in certain scenarios.

An example of this being consumed is in the `authorizeOperator` function which in turn calls the `callOperator` function which in turn dials the `madeOperatorForTokens` function in the market contracts, which in turn calls the `buy` function in the market to initiate a CRC purchase.

Currently, it is through this key feature that we are "atomically swapping" one NORI token for one CRC in a CRC bundle listed for sale.

- you can pass encoded data to the `send` function and then to consume the token in a similar way that ether is consumed.

This is an extremely powerful way to think about transactions of tokens. For example, if I had a function in a contract called `FuturesExchange.sol` which has a function called `swapNoriForCRC`, then rather than creating an introspection call, or depositing the token into the FuturesExchange so that you can then invoke a second function to swap it, you would instead just:

`data = encodeCall(...data for swapNoriForCRC)`

`Nori.send(... data)`

Or, you could use it in to create a sale in some future alternative market:

```javascript
import { encodeCall } from '../helpers/utils';

const createSale = (id, from, value) =>
  encodeCall(
    'createSale',
    ['uint256', 'uint64', 'uint32', 'address', 'uint256', 'bytes'],
    [id, 1, 2, from, value, '']
  );

  // ...

  await crc.authorizeOperator(
          fifoCrcMarket.address,
          0,
          createSale(0, getNamedAccounts(web3).supplier0, 100),
          {
            from: getNamedAccounts(web3).supplier0,
          }
        );
```

and then in the market:

```solidity
function madeOperatorForCommodity(
  address, // operator,
  address, // from,
  address, // to,
  uint, // tokenId,
  uint256, // value,
  bytes, // userData,
  bytes operatorData
) public {
  if (preventCommodityOperator) {
    revert();
  }
  //shazam here:
  require(_executeCall(address(this), 0, operatorData));
}

function _executeCall(address to, uint256 value, bytes data) private returns (bool success) {
  assembly { // solium-disable-line security/no-inline-assembly
    success := call(gas, to, value, add(data, 0x20), mload(data), 0, 0)
  }
}
```

Further notes on this feature here:

- https://github.com/nori-dot-eco/contracts/pull/57/commits/b2db4287b074d8ebc70b3898050cc818ad679683
- https://github.com/nori-dot-eco/contracts/pull/57/commits/22411d6e4bf2c81ee325e07320b6eac8c8bf2d0c
- https://github.com/nori-dot-eco/contracts/pull/57
