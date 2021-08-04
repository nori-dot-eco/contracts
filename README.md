# About

The Ethereum smart contracts that power nori.com

---
## Local Development
### Deploying to a local testnet

First, start [ganache](https://github.com/trufflesuite/ganache-cli)

```
ganache-cli
```

Second, deploy and initialize all contracts via the migration scripts

```
truffle migrate --network test
```
---

## Testing

First, start [ganache](https://github.com/trufflesuite/ganache-cli)

```
ganache-cli
```

Clear and compile contracts

```
rm -rf build && truffle compile
```

Then run the tests

```
yarn test
```
---

## Contracts

### Upgradeability

Contracts in this repo use the [OpenZeppelin SDK](https://github.com/OpenZeppelin/openzeppelin-sdk/tree/master/packages/docs#readme) to manage upgradeability

### NCCR

#### The Minter Role

The minter role is required to add additional minters to the NCCR contract. This role allows suppliers to mint NCCR(AKA NRTs).

---

## Public testnets

### Ropsten
#### Deploying

Deploy and initialize all contracts via the truffle migration files

```
truffle migrate --network ropsten
```

---

## Misc. Notes and Tips

### Using the oz CLI tool

#### Deploying new upgradeable contracts

To deploy new upgradeable contracts individually (bypassing migrations) via the [oz CLI tool](https://docs.openzeppelin.com/cli/2.8/), use the following command (note: substitute `ropsten` for whatever network you want to perform this on):

```
oz create --network ropsten
```

Then initialize them selecting the `initialize()`

You'll need to add minter roles for any address that needs the ability to mint NCCR/NORI tokens

#### Upgrading contracts

To upgrade existing contracts via the CLI use the following command (note: substitute `ropsten` for whatever network you want to perform this on):

```
oz upgrade --network ropsten
```

### IDE support

#### Solidity linting via Solium

If you are using vscode, use the [solidity plugin](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity) and set the following user setting: `"solidity.linter": "solium",`
