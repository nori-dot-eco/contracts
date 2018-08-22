# ERC 820: Pseudo-introspection using a registry contract

## Note: EIP 820 code has been moved to a sub module inside of `contrib/EIP/eip820`. This Readme is for information on EIP 820 as applies to our repository.

## Formal Specifications

- [ERC-820](https://github.com/ethereum/EIPs/issues/820)

## Background

This standard allows us to register the interfaces which each contract implements. It allows us to "dial" contracts when they support an interface to invoke a function within its context.

## Purpose

See NORI readme for an example of how this is consumed and why.

## Key Contracts

### EIP820Registry

This particular contract is what allows contracts to register all of the interfaces which it can support. It is particularly useful for allowing/disallowing certain types of transactions using "pseudo contract introspection". Contracts wishing to leverage this type of functionality MUST inherit from the EIP820Implementer contract.

#### Key features

- allowing/disallowing tokens to be sent to an address
- registration of contract interfaces by address
- used as a lookup mechanism to "dial" contracts and invoke a function after a token function is called first
- allows us to "atomically swap" NORI tokens for CRC tokens via the above 3 features

### EIP820Implementer

This base contract should be inherited by all contracts. When inheriting from this contract, an `EIP820Registry` contract is assigned to keep track of all the interfaces which it can support.

For example, an ERC20 token would inherit from this contract and then register the IERC20 (or IEIP20) interface in the registry. By doing so it is saying "hey, I support all of the ERC 20 functions, so if a contract sends a transaction to me, it will have a good time". A calling contract can then, upon receiving a transaction that is intended for a different final destination, can look up which interfaces that destination supports. If it is supported, the contract will dial the final address and invoke the desired functionality. If the interface is said to not be supported, then the transaction can revert -- preventing loss of funds or enabling only certain senders to submit tokens to it.

#### Key features

- Used to set the `EIP820Registry` address
- Used to set/get supported interfaces for the inheriting contract from the `EIP820Registry`
