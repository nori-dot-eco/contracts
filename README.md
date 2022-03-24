# About

The Ethereum smart contracts that power [nori](https://nori.com)

---

## Supported Networks and their Contracts

### polygon

- BridgedPolygonNORI
- LockedNORI
- Certificate
- Removal
- FIFOMarket

### mumbai (polygon testnet)

- BridgedPolygonNORI
- LockedNORI
- Certificate
- Removal
- FIFOMarket

### mainnet (ethereum L1)

- NORI

### goerli (ethereum L1 testnet)

- NORI

### localhost (hardhat standalone)

- BridgedPolygonNORI
- LockedNORI
- Certificate
- Removal
- FIFOMarket
- NORI

NB: hardhat running locally in a separate process (see `Running and deploying to a local testnet`)

### hardhat (hardhat in-process)

Same contracts as _localhost_

You would rarely target this network from the CLI except when running tests because it starts a fresh in-process hardhat node that exists when the CLI command completes.

## Development

### Running and deploying to a local testnet

To start a local hardhat chain:

```
hardhat node
```

or optionally to mint BridgedPolygonNORI to the owner wallet when the node starts
(avoids complexities because we don't run a mock of the Polygon bridge locally)

```
MINT=true hardhat node
```

In both variations the `0_deploy_contracts` script is run so your node starts seeded with test wallets and all of our contracts deployed.

---

## Testing

Run tests using an in-process hardhat blockchain:

```
yarn test
```

### Reporting gas usage from tests

Note that gas reporting is disabled by default because it slows tests down significantly.

First, set `REPORT_GAS` and `COINMARKETCAP_API_KEY` environment variables.

Then, in a first terminal, run the following:

```
hardhat node --no-deploy
```

Finally, in a second terminal, run the following:

```
REPORT_GAS=true hardhat test --network localhost
```

---

## Hardhat Tasks

### Interact with contracts

https://hardhat.org/guides/create-task.html
Custom hardhat tasks have been implemented that allow for calling any function (read or write) on the existing contracts.

```
hardhat [contract name] --func [function name] [arguments] --network [network name]
```

Example: mints 1 NORI on mumbai to given address

```
hardhat NORI --func mint  "0x321af43416f670ce8b4ba214dfb87c4199e2a77f" 1000000000000000000 "0x" "0x" --network mumbai
```

### Generate docs

Generate docs using

```
hardhat docgen
```

---

## Contracts

### Upgradeability

Contracts in this repo use the [OpenZeppelin Upgrades Plugin](https://docs.openzeppelin.com/upgrades-plugins/1.x/) to manage upgradeability

---

## Additional tooling notes

### Standard test addresses

TODO: Add the canonical names used in tests (see `accounts.ts`)

- Account #0: 0x465d5a3ffea4cd109043499fa576c3e16f918463 (1000000 ETH)

- Account #1: 0x8eb185e20a9b7b31bd48da19e834b93be952795e (1000000 ETH)

- Account #2: 0x6b9d03759e9f14a641f0703fbd84f1f726159b6b (1000000 ETH)

- Account #3: 0xbd6e6a75c7a51cfdf08ddf2f538ceb221835839b (1000000 ETH)

- Account #4: 0x8abfd8375da1521e70d23988eb5a6efa799c15ea (1000000 ETH)

- Account #5: 0x6029424b26feffe2879e88c62e8130dc418e64d9 (1000000 ETH)

- Account #6: 0x0ee3e1d93121c989c94f3e9cf9f9b655ad2cd3cf (1000000 ETH)

- Account #7: 0x533df4b74a18a84f5d9287ed9c5afcbb59dbed1f (0 ETH)

- Account #8: 0x9b9add2d2f759219c60b89a859ef658b8b8280c9 (1000000 ETH)

- Account #9: 0xf31c29b01ef18a3d9726b99ad0e9692e498cf5f8 (0 ETH)

### CLI

Install hardhat [shorthand and autocomplete](https://hardhat.org/guides/shorthand.html)
