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

#### UnstructuredUpgradeabilityProxy

This contract defines a fixed storage slot that keeps track of the logic contract's implementation ([following ZeppelinOS's lead](https://blog.zeppelinos.org/upgradeability-using-unstructured-storage/)). It does so by leveraging solidty's `ssload` and `sstore` opcodes. Although this location maintains the storage location using a constant, this can be overwritten later using the following bit of code:

```solidity
function setImplementation(address newImplementation) internal {
    bytes32 position = implementationPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      sstore(position, newImplementation)
    }
    emit ImplementationPositionSet(newImplementation);
  }
```

With this, any time we want to change the logic implementation, we can take advantage of this function to overwrite the costant.

#### UnstructuredOwnedUpgradeabilityProxy

This contract defines two additional constant locations, similar to `UnstructuredUpgradeabilityProxy`:

`proxyOwnerPosition`- This storage slot keeps track of the proxy's owner. We set it to the `MultiAdmin` user so that only the multi-sig wallet, controlled by the devs, can upgrade or modify the proxy contracts.

`registryAddrPosition` - This unique extension to the "Unstructured Storage" proxy pattern allows us to automatically manage and keep track of proxy histories. We set and manage this using the following snippet:

```solidty
function setRegistryAddr(address registryAddress) internal {
    bytes32 position = registryAddrPosition;
    assembly { //solium-disable-line security/no-inline-assembly
      sstore(position, registryAddress)
    }
    emit RegistryAddrSet(registryAddress);
  }
```

This registry is set to the address of the `ContractRegistry` in the case of any contract other than the `MultiAdmin`, `MultiSigWallet` or the `ContractRegistry` itself. In the case of those three contracts, it is set to the address of the `RootRegistry`. In doing such, the registry is interacted with every time an `UprageTo` or `UpgrateToAndCall` function is invoked. When such happens, the following is called:

```solidity
function upgradeTo(string contractName, string versionName, address implementation) public onlyProxyOwner {
    _upgradeTo(implementation);
    //todo register interface lookup using eip820 -- not including this now as implications are unknown
    address registry = registryAddr();
    IContractRegistry(registry).setVersion(
      contractName,
      address(this),
      versionName,
      implementation
    );
    //todo require version name doesnt exits
    emit Upgraded(versionName, implementation);
  }
```

As you should see, the upgrade functions will call outwards to where the Registry exists and invoke a function that sets a new `versionName`, `contractName`, and `implementation` location. In most cases, this will append to an array existing in the `ContractRegistry` that contains the complete history of all contract versions and the address at which their logic was implemented. In the case where the `contractName` exists already in the registry but the proxy is a different proxy, a new proxy history is appended, but not overwritten.

Whilst this does NOT solve the issue of determinism in upgradeable contract's, it at least introduces additional transparency and governance.

#### Proxy

The proxy is the base contract which contains a [fallback function](http://solidity.readthedocs.io/en/v0.4.21/contracts.html#fallback-function). Using this function, any time the proxy is called using afunction which the proxy does not have ad efinition for, it uses some assembly invocation to lookup the function logic from the implementation location. It then uses the logic from the implementation and executes the logic on the storage of the proxy and **not the implementation**. This is very important to undertand. The fallback functions looks as follows:

```solidity
function () payable public {
    address _impl = implementation();
    require(_impl != address(0));

    assembly {
      let ptr := mload(0x40)
      calldatacopy(ptr, 0, calldatasize)
      let result := delegatecall(gas, _impl, ptr, calldatasize, 0, 0)
      let size := returndatasize
      returndatacopy(ptr, 0, size)

      switch result
      case 0 { revert(ptr, size) }
      default { return(ptr, size) }
    }
  }
```

#### Implementation Contract (i.e., ContractV0_1_0)

When defining an implementation contract, you should follow this process:

1.  Deploy an implementation contract `ContractV0_1_0`. Do not use the constructor function ever. State will not persist properly.
2.  Encode the `initailize` function for `ContractV0_1_0
3.  Invoke the `upgradeToAndCall` function of the `UnstructuredOwnedUpgradeabilityProxy` using the encoded data in step 2 along with `Contract` as the `contractName`, `0_1_0` as the `versionName` and the address of the deployed contract in step 1 as the `implementation`.

When upgrading after the first initialization follow this same process, but skip the step where you encode initalization data and use the `upgradeTo` function instead in step 3.

#### UnstructuredOwnable

This contract maintains the owner of the implementation contract. It should be inherited by every implementation contract in this proxy system as a base contract so as to define the owner of the contract. It is mandatory that this address be set to the `MultiAdmin` address.

#### ContractAtProxy

To interact with upgradeable contracts you can use the following process (for brevity, I will only describe this in the < web3js 1.0 context; >web3js 1.0 it is a little bit different):

1.  make sure there is a contract deployed to the network you are using
2.  make sure you have the artifact for the contract implemented by the proxy
3.  using the artifact:

```javascript
const ContractV0_1_0 = artifacts.require("ContractV0_1_0");

// get proxy by looking it up from the ContractRegistry

// ...

// after that:

const contractAtProxy = ContractV0_1_0.at(await proxy.getLatestProxyAddr("Contract"));
```

#### MultiAdmin

This is the contract which maintains permissions to upgrade and manage the entire proxy and registry system. It works in the same way as a multi sig wallet, in that you can submit a proposal for atransaction, and when it receives an adequete number of approvals from other owners defined in the wallet, ir will invoke the transaction using its `executeTransaction` assembly invoking function. In the context of upgrades, we use it as a proposal mechanism for proposing upgrades to contracts to devs or invoking other `onlyOwner` and `onlyProxyOwner` functions. An upgrade can be proposed as follows:

```javascript
const upgradeTxData = proxy.contract.upgradeTo.getData(
      contractName,
      versionName,
      contractToInit.address,
      deployParams
    );
await multiAdmin.submitTransaction(proxy.address, 0, upgradeTxData);
```

#### ContractRegistry

See ContractRegistry README

#### RootRegistry

See ContractRegistry README

#### ENS

See ContractRegistry README

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
