# About

The Ethereum smart contracts that power nori.com

# Developer Setup

If you are using vscode, use the [solidity plugin](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity) and set the following user setting: `"solidity.linter": "solium",`

## Deploying to Ropsten

### Via CLI

To deploy new upgradeable contracts via the CLI to Ropsten use the following:

```
openzeppelin create --network ropsten
```

Then initialize them selecting the `initialize()`

You'll need to add minter roles for any address that needs the ability to mint NCCR/NORI tokens

## Upgrading on Ropsten

To upgrade existing contracts via the CLI to Ropsten use the following:

```
openzeppelin upgrade --network ropsten
```

## Testing

First start ganache

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

# Contracts

## Upgradeability

Contracts in this repo use the [OpenZeppelin SDK](https://github.com/OpenZeppelin/openzeppelin-sdk/tree/master/packages/docs#readme) to manage upgradeability

## CRC

### The Minter Role

The minter role is required to add additional minters to the CRC contract. This role allows suppliers to mint CRCs.
