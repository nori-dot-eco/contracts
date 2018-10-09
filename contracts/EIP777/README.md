# ERC 777: Advanced Token Standard

These contracts have been moved to a respective submodule so as to allow for easier collaboration/syncing with the official standard. They are now in [contracts/contrib/EIP/eip777](https://github.com/nori-dot-eco/contracts/tree/master/contracts/contrib/EIP)

## Formal Specifications

- [ERC-777 Advanced Token Standard](https://eips.ethereum.org/EIPS/eip-777)

## Background

The NORI implementation of the ERC 777 advanced token standard extends the basic functionality to allow for a few more types of introspection-invoked transactions (ie `madeOperatorForTokens` which uses contract introspection to see if a receiving contract has the requested function implementation to support being made an operator of the NORI token).

## Purpose

See NORI readme

## Key features

See NORI readme
