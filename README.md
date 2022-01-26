# About

The Ethereum smart contracts that power nori.com

---

## Local Development

### Deploying to a local testnet

```
hardhat node
```

## Testing

```
yarn test
```

---

## Hardhat Tasks

https://hardhat.org/guides/create-task.html
Custom hardhat tasks have been implemented that allow for calling any function (read or write) on the existing contracts.

```
hardhat [contract name] --func [function name] [arguments] --network [network name]
```

Example: mints 1 NORI on mumbai to given address

```
hardhat NORI --func mint  "0x321af43416f670ce8b4ba214dfb87c4199e2a77f" 1000000000000000000 "0x" "0x" --network mumbai
```

## Contracts

### Upgradeability

Contracts in this repo use the [OpenZeppelin Upgrades Plugin](https://docs.openzeppelin.com/upgrades-plugins/1.x/) to manage upgradeability

## Additional tooling notes

## CLI

Install hardhat [shorthand and autocomplete](https://hardhat.org/guides/shorthand.html)

### IDE support

#### Solidity linting via Solium

If you are using vscode, use the [solidity plugin](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity) and set the following user setting: `"solidity.linter": "solium",`
