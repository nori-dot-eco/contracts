# ERC 820: Pseudo-introspection using a registry contract

## Formal Specifications

- [ERC-820](https://github.com/ethereum/EIPs/issues/820)

## Background

This standard allows us to register the interfaces which each contract implements. It allows us to "dial" contracts when they support an interface to invoke a function within its context.

## Purpose

See NORI readme for an example of how this is consumed and why.

## Key features

- allowing/disallowing tokens to be sent to an address
- registration of contract interfaces by address
- used as a lookup mechanism to "dial" contracts and invoke a function after a token function is called first
- allows us to "atomically swap" NORI tokens for CRC tokens via the above 3 features
