# About

The Ethereum smart contracts that power nori.com

# Developer Setup

If you are using vscode, use the [solidity plugin](https://marketplace.visualstudio.com/items?itemName=JuanBlanco.solidity) and set the following user setting: `"solidity.linter": "solium",`


# Contracts

## Upgradeability

Contracts in this repo use the [OpenZeppelin SDK](https://github.com/OpenZeppelin/openzeppelin-sdk/tree/master/packages/docs#readme) to manage upgradeability

## CRC

### The Minter Role

The minter role is required to add additional minters to the CRC contract. This role allows suppliers to mint CRCs.

