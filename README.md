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

## Contracts

### Upgradeability

Contracts in this repo use the [OpenZeppelin Upgrades Plugin](https://docs.openzeppelin.com/upgrades-plugins/1.x/) to manage upgradeability

## Additional tooling notes

## CLI

Install hardhat [shorthand and autocomplete](https://hardhat.org/guides/shorthand.html)

### IDE support

#### Solidity linting via Solium

If you are using vscode, use the [solidity plugin](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity) and set the following user setting: `"solidity.linter": "solium",`
