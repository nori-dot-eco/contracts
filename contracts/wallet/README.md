# Wallet Contracts

## Formal Specifications

NA

## Background

This contract was adapted from the official Gnosis multisig wallet [here](https://github.com/gnosis/MultiSigWallet)

## Purpose

The MultiSigWallet is intended to store company Ether and Tokens and is registered in the RootRegistry.

Current implementation on Ropsten: `0xf554e6f58f798e55b43b4c110ab8c2897d61b991`

## Key features

- stores ether
- stores tokens
- requires N number of signatures to execute a transaction
- can define up to 50 owners

[Example interaction can be found here](https://github.com/nori-dot-eco/contracts/blob/master/test/behaviors/MultiSig.js)
