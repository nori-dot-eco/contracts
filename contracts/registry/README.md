# Registry Contracts

## Formal Specifications

Incomplete

## Background

The registry contracts are unqiue in implementation but inspired by:

- [ERC 820](https://github.com/ethereum/EIPs/issues/820)
- [cardstack implementation of ENS and upgradeable contracts](https://medium.com/cardstack/upgradable-contracts-in-solidity-d5af87f0f913)
- [Augur and Colony upgradable contracts](a://medium.com/@asselstine/contract-storage-and-upgrade-in-augur-and-colony-d34ddf1a62d9)
- [zeppelin os research on unstructured storage](https://github.com/zeppelinos/labs/tree/master/upgradeability_using_unstructured_storage)
- [ENS](https://docs.ens.domains/en/latest/)

## Purpose

The Registry contracts are used to keep a transparent history of all versions of contracts and proxies ever used by Nori.

More importantly, the registry is the routing mechanism used to find contract addresses (both proxy and implementation addresses) **by name and/or version number** in order to make working with upgradeable smart contracts a little bit easier.

## Key Contracts

The registry is made up of several different componets all tied to one another:

### EIP820Registry

An [ERC 820 registry](https://github.com/ethereum/EIPs/issues/820)

#### Key features

- Used to lookup interface support of a given address. For more info see the EIP820 readme

### VersionRegistry

This contract keeps track of the entire upgrade history of all contracts (except for the contract registry itself). Wheneverthe `upgrade` or `upgradeTo` function is invoked on an `UnstructuredOwnedUpgradeabilityProxy` contract, the proxy dials the `VersionRegistry` it knows about, and creates a mapping of a `sha3(contractName)` to a struct containing the proxy implementation address and the version name.

#### Key features

- used to keep track of version names
- used to retrieve a contract implementation, proxy, and version

### Contract Registry

This is the main registry used to keep track of two things:

1.  a contracts version, implementation and history
2.  the single shared RootRegistry (for tracking the `MultiAdmin` address and `MultiSigWallet` address, and the contract registries version history).

Additionally, whenever a proxy is changed for a contract, a new entry is created for that proxy. In this way we keep track of every proxy the registry has known a given contract name to have ever used and every implementation that contract has ever used for that particular proxy address. When anew proxy is used, it is appended to the list of historical proxies with a now unique implementation history association.

Note: The registries follow [SemVer 2.0](https://semver.org). However, due to the way solidity compiles, all periods ( . ) are replaced with underscores ( \_ ).

#### Key features

- gives developers an easy way to look up a contract by name (returns proxy, implementation, and version info)

The `ConractRegistry` is what is used to lookup all contracts-- giving the developer an address to instantiate a particular contract using truffle-contracts `.at()`. The process should follow:

1.  lookup a contract by name
2.  use the returned proxy address to create a `ContractNameAndVersion.at()` the returned proxy address.

- used to register new contracts

To register a new contract the process is as follows:

1.  create an upgradeable contract using an `UnstructuredOwnedUpgradeabilityProxy`

2.  invoke `upgradeToAndCall` on that contract, which will in turn register the contract in the `ContractRegistry`.

- interacted with during upgrades

To upgrade, the process is as follows:

1.  invoke `upgradeTo` on an `UnstructuredOwnedUpgradeabilityProxy`.
2.  This will in turn automatically update the `ContractRegistry` (technically the `VersionRegistry`) with the latest implementation information

Now you should look the contract up in the registry by name and follow instantiation steps that way rather than instantiating directly against the proxy address you know about locally.

### Root Registry

The `RootRegistry` is the address at which ENS MUST resulve to. See ENS readme for more info.

The `RootRegistry` is the starting point for all contract look ups. It is used to first find the `ContractRegistry` proxy address.

#### Key Features

- keeps track of the `MultiAdmin`
- keeps track of the `MultiSigWallet`
- keeps track of the `ContractRegistry`

The `ContractRegistry` is an upgradeable contract. As such `RootRegistry`is used to keep track any time the `ContractRegistry` proxy or implementation changes in the same way that `ContractRegistry` keeps track of other contracts.

- The `RootRegistry` is used as the resolver address for ENS

See ENS readme, or [the official ENS docs](The `RootRegistry` is the starting point for all contract look ups. It is used to first find the `ContractRegistry` proxy address) for more info on resolvers.
