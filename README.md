<img width="150" alt="Nori Symbol - full_color" src="https://user-images.githubusercontent.com/18407013/191872114-ffa7ea67-3ce8-4102-9919-4c6014001a1c.png">

# [Nori](https://nori.com) marketplace smart contracts



## 🏗️ Integrations

### JavaScript/TypeScript
 
This package can be used in your project by installing it the package:

```bash
yarn add -D @nori-dot-com/contracts
```

Then, in your solidity code, you can import the contracts you need:

```solidity
import "@nori-dot-com/contracts/dist/solidity/Market.sol";
```

### Solidity

#### [Foundry](https://github.com/foundry-rs/foundry)

```bash
forge install nori-dot-eco/contracts
```

> **Note**
> You may also need to [configure path remapping](https://book.getfoundry.sh/projects/dependencies?highlight=remap#remapping-dependencies) if you are using foundry.

#### [Hardhat](https://github.com/NomicFoundation/hardhat)/[Truffle](https://github.com/trufflesuite/truffle)

```bash
yarn add -D @nori-dot-com/contracts @openzeppelin/contracts-upgradeable@4.8.2 erc721a-upgradeable@4.2.2
```

Then, in your solidity code, you can import the contracts you need:

```solidity
import "@nori-dot-com/contracts/dist/solidity/Market.sol";
```

## :notebook_with_decorative_cover: Documentation

Refer to the contracts [README](./docs/README.md) for detailed documentation about how each smart contract works.

## :woman_technologist: Development

### Setup

Make sure to initialize submodules

```bash
git submodule update --init --recursive
```

Then install dependencies

```bash
yarn install && foundryup
```

Finally, make sure you set the necessary environment variables (refer to [the default dotenv file](./.env.defaults) for a list of supported variables)

### Deploying contracts locally

You can run the following command to start a hardhat node:

```bash
hardhat node
```

This command will do the following:

1. Start a local node with a new instance of a locally running chain.
2. Seed test wallets with funds.
3. Run the deployment scripts which seed the test contracts.

### Deploying the market contracts on a live network

Note that you will need to have `SOLC_PROFILE` environment variable configured as `production` or the deployment will be prevented.
The following command will deploy new implementations and upgrade the existing proxies if they exist.

```bash
hardhat deploy --network [networkName] --tags market
```

TODO: documentation around how to deploy and force the deployment of fresh proxies as well.

### Testing

To serially run the hardhat test suite followed by the forge test suite, run the following:

```bash
yarn test
```

#### Hardhat

To run _just_ the typescript test suite using hardhat, run the following command:

```bash
yarn test:hardhat
```

#### Forge

To run _just_ the solidity test suite using forge, run the following command:

```bash
yarn test:forge
```

### Gas reports

To generate gas reports, run the following command:

```bash
yarn snapshot
```

The resulting [snapshot file](./.gas-snapshot) should be checked-in with every PR.

You can also run `yarn snapshot:production` to generate a snapshot using production compiler settings or `yarn snapshot:test` to use the fastest compiler settings.

## :construction_worker: Hardhat Tasks

### Interact with contracts

Custom hardhat tasks have been implemented that allow for calling functions on deployed contracts.

```bash
hardhat [contract name] --func [function name] [arguments] --network [network name]
```

<details>

  <summary><b>Example: Mint 1 NORI on goerli</b></summary>

```bash
hardhat NORI \
  --func mint \
  "0x321af43416f670ce8b4ba214dfb87c4199e2a77f" \
  1000000000000000000 \
  "0x" \
  "0x" \
  --network goerli
```

</details>

<details>

  <summary><b>Example: Deposit 100 bpNORI on mumbai</b></summary>

```bash
hardhat BridgedPolygonNORI \
  --func deposit \
  0x6dc772f80495f47d8000530a59ee975b67b7c646 \
  "0x0000000000000000000000000000000000000000000000056bc75e2d63100000" \
  --network mumbai
```

> :information_source: Note that the final argument (`0x0000000000000000000000000000000000000000000000056bc75e2d63100000`) is a `uint256` bytes-encoded representation of 100 bpNORI.

</details>

### Generate contract documentation

Generate documentation for contracts using the following command:

```bash
yarn docgen # runs hardhat docgen
```

Running this command will re-generate the contract documentation in the [docs](./docs) folder. Note that the template used to generate the documentation is located in the sub-folder called [templates](./docs/templates).

### Accounts

Print the named accounts used for development and testing

```bash
hardhat accounts
```

## :ninja: Tips and tricks

### Connecting to your local node from MetaMask

You can connect to your local node from MetaMask by adding giving it a custom RPC configuration. For example, if you are using the default [hardhat network configuration](./config/networks.ts) (e.g., if your node was started via `hardhat node`), then you can connect to it by adding a custom RPC configuration with the following values:

| RPC URL                 | Chain ID |
| ----------------------- | -------- |
| `http://localhost:8545` | 9001     |

For more, refer to the [official MetaMask documentation on this topic](https://metamask.zendesk.com/hc/en-us/articles/360015290012-Using-a-Local-Node).

### Ethernal

[Ethernal](https://app.tryethernal.com/) is an etherscan-style interface for your local hardhat node. Sign up for a free account and run your local node with the following extra variables to have contract ABIs and transactions synced there for viewing / interacting with.

```bash
ETHERNAL=true \
ETHERNAL_EMAIL="you@nori.com" \
ETHERNAL_PASSWORD="xxxxxx_yyyyyyyy" \
hardhat node
```

For more, refer to the [official hardhat-ethernal documentation](https://github.com/tryethernal/hardhat-ethernal/blob/master/README.md).

### Foundry

#### Forge

##### Solidity Scripting

Foundry offers the ability to write scripts in solidity that foundry can then run (via `forge script`) to create and send real transactions to a specified network.

For an overview, checkout the official tutorial [here](https://book.getfoundry.sh/tutorials/solidity-scripting).

<details>

  <summary><b>Setup</b></summary>

For these scripts to work, the following environment variables must be set in your environment:

```
MUMBAI_RPC_URL # The RPC URL for the mumbai network
MNEMONIC # The mnemonic you want to use to sign your transaction with
```

> :information_source: The first index of the `$MNEMONIC` HD path needs to be funded with MATIC, have the correct permissions to make the contract calls, etc.

> :information_source: Our on-chain market on mumbai was deployed with a fireblocks signer, so we have been using the fireblocks signer from the command line with hardhat tasks to grant necessary permissions to other addresses that we may want to use.

Here is the hardhat command for granting the `CONSIGNOR_ROLE` to an address (hardhat is currently required to use a fireblocks signer):

```bash
hardhat \
  --network mumbai \
  Removal \
  --func grantRole \
  `cast call 0xa051E9EeaC803d2fCA1DbF415b78AD9BfEB723b0 "CONSIGNOR_ROLE()" --rpc-url mumbai` `# The bytes32 representation of the CONSIGNOR_ROLE` \
  0x465d5a3fFeA4CD109043499Fa576c3E16f918463
```

See `forge script --help` for many more command line options to the scripting.

A description of how to run some example scripts can be found in the examples below this section.

</details>

<details>

  <summary><b>Example: Minting and listing new removals on mumbai</b></summary>

```bash
forge script \
  script/MintAndListRemovals.s.sol:MintAndListRemovals \
  --rpc-url mumbai \
  --mnemonics=$MNEMONIC \
  --broadcast \
  -vvvvv
```

> :information_source: Transactions for minting removals have at times seemed really slow on mumbai (taking almost 15 minutes to get included).

</details>

<details>

  <summary><b>Example: Minting bpNORI</b></summary>

```bash
forge script \
  script/MintBPNori.s.sol:MintBPNori.sol \
  --rpc-url mumbai \
  --mnemonics=$MNEMONIC \
  --broadcast \
  -vvvv
```

</details>

#### Cast

##### Sending transactions

You can use `cast send` to send transactions and interact with deployed contracts.

<details>

  <summary><b>Example: Deposit/mint bpNORI</b></summary>

The following deposits 100 bpNORI to `$TO_ADDRESS` on mumbai (the first account of the `$MNEMONIC` **must** have the `DEPOSITOR_ROLE` role).

```bash
cast send \
  --mnemonic=$MNEMONIC
  --rpc-url mumbai \
  $TO_ADDRESS \
  "deposit(address,bytes)" \
  $BP_NORI_ADDRESS \
  `cast --to-uint256 100000000000000000000`
```

</details>

#### Autocomplete

To set up autocomplete for the foundry CLI tools, follow the instructions [here](https://book.getfoundry.sh/config/shell-autocompletion.html).

### Hardhat

#### Autocomplete

To set up autocomplete for hardhat follow the instructions in the [docs](https://hardhat.org/guides/shorthand.html).

#### Autocomplete

<details>

  <summary><b>ZSH setup</b></summary>

1. For ZSH (omz), add the following to your zsh config file (requires [zsh-completions](https://github.com/zsh-users/zsh-completions))

```bash
# https://github.com/zsh-users/zsh-completions
fpath+=${ZSH_CUSTOM:-${ZSH:-~/.oh-my-zsh}/custom}/plugins/zsh-completions/src \
autoload -U compinit && compinit
```

</details>
