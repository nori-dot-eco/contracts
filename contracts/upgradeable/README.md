# Upgradeability

## Background

Nori smart contracts are upgradeable. They use a pattern adapted from ZeppelinOS's research on ["Unstructured Storage"](https://github.com/zeppelinos/labs/tree/master/upgradeability_using_unstructured_storage). We have extended a few key parts of this pattern in order to:

- Improve governance of upgrades by introducing a "MultiAdmin" owner
- Increase transparency by using an amalgomation of registries strongly tied to the upgradeable contract
- Adding version history

## Purpose

In an ideal world, smart contracts would be permanent and deterministic. This isn't an ideal world. Bugs happen, and so versioning needs to be possible.

## Specifications

Ethereum has an an opcode called [DELEGATECALL](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7.md) that makes most of this possible. Specifically, it makes it possible to deploy a [proxy pattern](https://blog.zeppelinos.org/proxy-patterns/) for smart contracts. The following is a high-level overview of how proxy patterns work:

![uogrades and registries - page 1](https://user-images.githubusercontent.com/18407013/43371589-024d1a4c-934a-11e8-942f-f89bc921561c.png)

Basically, you place a proxy in front of an implementation smart contract that contains some logic designed to operate on state. Additionally, the proxy maintains a variable which can be changed to modify where that logic exists at a later point. When the user sends a transaction to the proxy, the proxy looks up the current version of that logic, finds the function that matching function logic in the implementation contract, but rather than executing it at that location, it executes the logic inside the context of the proxy's state.

### Uning Unstructured Storage

Each proxy pattern is a little bit different. Unstructured storage upgrades, the proxy pattern which we are using, is laid out in the following components:

![uogrades and registries - page 3](https://user-images.githubusercontent.com/18407013/43371822-641a6d16-934e-11e8-9b3b-6f19a5fecfb5.png)

#### UnstructuredOwnedUpgradeabilityProxy

#### UnstructuredUpgradeabilityProxy

#### Proxy

#### Implementation Contract (i.e., ContractV0_1_0)

#### UnstructuredOwnable

#### ContractAtProxy

#### MultiAdmin

#### ContractRegistry

#### RootRegistry

#### ENS

### How Upgrades Interact with the Registries

_The following image might be out of date; View the latest [here](https://www.lucidchart.com/documents/view/e8debb56-b202-4c22-a219-9abfa6cd3656)._ The following is a high-level overview of the way the upgradeable smart contracts interact with registries:

![uogrades and registries - page 2 2](https://user-images.githubusercontent.com/18407013/43371944-eb9f2a3c-934f-11e8-85c6-a664a1f6076b.png)

For more on how the registries are implemented see the Registry README file.

## Key features

- uses fixed storage to read and write from fixed slots referenced by custom pointers
- owned by a MultiAdmin governed by developers requiring multiple signatures to initate an upgrade
- automatically updates registry state when an
  upgrade happens to track previous implementations and proxies
- upgradeable contracts do not need any requisite logic or even awareness that they are part of this upgradeable system, maximizing flexibility
- when a contract is upgraded, state is persisted in the proxy NOT the implementation
