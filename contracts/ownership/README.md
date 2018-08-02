# Ownership Contracts

## Formal Specifications

NA

## Background

This contract was adapted from [here](https://github.com/zeppelinos/labs/blob/master/upgradeability_using_unstructured_storage/contracts/test/Ownable.sol)

## Purpose

The ownership contracts are used to establish ownership of contracts which inherit from it. It establishes some basic permissions so that certain functions (such as an upgrade, or transfering ownership) can only be called by the address which owns the address. Through these means, a contract can be deployed by any address and then that address can transfer ownership to the MultiAdmin contract, or any other address.

## Key features

- Used to allow upgrades to contracts
- Used to transfer ownership from adeploying address to a multisig address
- creates a modifier function so that contract functions can be permissioned to only allow the registered owner to invoke them
