# The Ethereum smart contracts that power [Nori](https://nori.com)

![This is an image](https://myoctocat.com/assets/images/base-octocat.svg)

---

## Docs

- [Contracts](./contracts/README.m)

---

## Development

### Setup

Make sure to initialize submodules

```
git submodule update --init --recursive
```

Then install dependencies

```
yarn install
```

### Running and deploying to a local testnet

To start a local hardhat chain:

```
hardhat node
```

When starting, hardhat will run the deploy scripts so your node starts seeded with test wallets and all of our contracts deployed.

---

## Testing

Run tests using an in-process hardhat node:

```
yarn test
```

### Reporting gas usage from tests

:information_source: Note that gas reporting is disabled by default because it slows tests down significantly.

First, in a first terminal, run the following:

```
hardhat node --no-deploy
```

Second, in a second terminal, run the following:

```
yarn test:gas --network localhost
```

Alternatively, you can also get a gas report with by just running a single command in one terminal, but this is not recommended as it will omit per-test gas usage and only output the summary table of functions.

```
yarn test:gas # omits per-unit test gas usage reports
```

If you set the `COINMARKETCAP_API_KEY` environment variable you will also get dollar equivalents in the summary table.

---

## Hardhat Tasks

### Interact with contracts

https://hardhat.org/guides/create-task.html
Custom hardhat tasks have been implemented that allow for calling any function (read or write) on the existing contracts.

```
hardhat [contract name] --func [function name] [arguments] --network [network name]
```

Example: mints 1 NORI on mumbai to given address

```
hardhat NORI --func mint  "0x321af43416f670ce8b4ba214dfb87c4199e2a77f" 1000000000000000000 "0x" "0x" --network mumbai
```

### Generate docs

Generate docs using

```
yarn docgen # runs hardhat docgen
```

### Accounts

Print the named accounts used for development and testing

```
hardhat accounts
```

---

## Contracts

### Supported Networks and their Contracts

See [contracts.json](./contracts.json) for a comprehensive list of all contracts deployed to each network.

### Upgradeability

Contracts in this repo use the [OpenZeppelin Upgrades Plugin](https://docs.openzeppelin.com/upgrades-plugins/1.x/) to manage upgradeability

---

## Additional tooling notes

### Connecting to your local node from Metamask

- RPC URL: `http://localhost:8545`
- Chain ID: 9001

### Ethernal

[Ethernal](https://app.tryethernal.com/) is an etherscan style interface for your local hardhat node. Sign up for a free account and run your local node with the following extra variables to have contract ABIs and transactions synced there for viewing / interacting with.

```

ETHERNAL=true \
ETHERNAL_EMAIL="you@nori.com" \
ETHERNAL_PASSWORD="xxxxxx_yyyyyyyy" \
hardhat node

```

## Tips and tricks

### Foundry

#### Using cast to send transactions

##### Examples

<details>
<summary>
<b>Deposit/mint bpNORI</b>
</summary>

Deposit (mint) 100 bpNORI (at `BP_NORI_ADDRESS`) to `TO_ADDRESS` on mumbai (the `PRIVATE_KEY` **must** have the depositor role)

```bash
cast send --rpc-url WEB3_RPC_ENDPOINT \
  --private-key PRIVATE_KEY --chain 80001 \
  TO_ADDRESS \
  "deposit(address,bytes)" \
  BP_NORI_ADDRESS \
  `cast --to-uint256 100000000000000000000`
```

</details>

#### Solidity Scripting

See tutorial [here](https://book.getfoundry.sh/tutorials/solidity-scripting)

Foundry offers the ability to write scripts in solidity that foundry can run to create real transactions and submit
them to the specified network. Note that for these scripts to work, some environment variables must be set:

```
MUMBAI_RPC_URL
PRIVATE_KEY
```

where the PRIVATE_KEY is the private key of whatever address want to sign your transaction with (so needs to be funded with MATIC, have the correct permissions to make the contract calls being submitted, etc.).

Note that our on-chain market on mumbai was deployed with a fireblocks signer, so we have been using the fireblocks signer from the command line with hardhat tasks or cast commands to grant necessary permissions to other addresses that we may want to use.

Here are the hardhat commands for granting roles to whatever address you're going to admin with (in this example the 0x465... staging mnemonic address):

```bash
hardhat \
  --network mumbai \
  Removal \
  --func grantRole \
  0xa269776b75ac4c5fa422bb11bec3ed3cee626848d07687372583174b209261fb \
  0x465d5a3fFeA4CD109043499Fa576c3E16f918463
```

(note that the role hash `0xa26977...` has was gotten from viewing the contract on polygonscan and selecting "Read as proxy")

Here's an example of making a BridgedPolygonNORI deposit from command line:

```bash
hardhat --network mumbai BridgedPolygonNORI --func deposit 0x6dc772f80495f47d8000530a59ee975b67b7c646 "0x0000000000000000000000000000000000000000000000056bc75e2d63100000"
```

(note that the final argument is the bytes encoded version of the equivalent of 100 NORI as a uint256)

And here's some code for generating the private key to add to the .env from a mnemonic:

```javascript
let mnemonic = 'dont expost or commit your mnemonic!!';
let mnemonicWallet = hre.ethers.Wallet.fromMnemonic(mnemonic);
console.log(mnemonicWallet.privateKey);
```

Scripts can then be run as follows:
(for minting and listing new removals)

```bash
forge script script/MintAndListRemovals.s.sol:MintAndListRemovals --rpc-url $MUMBAI_RPC_URL --private-key $PRIVATE_KEY --broadcast -vvvv
```

(for directly minting BridgedPolygonNORI)

```bash
forge script script/MintBPNori.s.sol:MintBPNori.sol --rpc-url $MUMBAI_RPC_URL --private-key $PRIVATE_KEY --broadcast -vvvv
```

NOTE: Transactions for minting removals have at times seemed really slow on mumbai... (taking almost 15 minutes to get included).
These script commands can take a `--gas-price` flag and it might be worth setting to whatever fast is on polygonscan.

See `forge script --help` for many more command line options to the scripting.

#### Autocomplete

Follow the instructions [here](https://book.getfoundry.sh/config/shell-autocompletion.html).

### Hardhat

#### Autocomplete

Follow the instructions in the [docs](https://hardhat.org/guides/shorthand.html).

### Tenderly

1. Install the [tenderly CLI](https://github.com/Tenderly/tenderly-cli)

2. Request to be added to the nori tenderly project
3. Login to tenderly via the CLI

```bash
tenderly login # Generate an access token in the tenderly dashboard or use the email login
```

4. Test that it works with the following:

```bash
TENDERLY=true TRACE=true LOG_HARDHAT_NETWORK=true hardhat node --no-deploy
```

5. Then, in another terminal, run

```bash
TENDERLY=true TRACE=true LOG_HARDHAT_NETWORK=true hardhat deploy --network localhost
```

6. Delete all deployments folders generated by hardhat-deploy except `localhost_9001` (you only need want the `deployments/localhost_9001` folder generated by `hardhat-tenderly`'s `persistArtifacts`)

```bash
find ./deployments -mindepth 1 ! -regex '^./deployments/localhost_9001\(/.*\)?' -delete
```

7. Grab a transaction hash from the terminal output and then run the following (replace `TRANSACTION_HASH` with the transaction hash):

```bash
tenderly export TRANSACTION_HASH --debug
```

8. If you want to inspect the gas profile or debug individual contract functions use the hardhat CONTRACT_NAME plugins (e.g., `hardhat Removal --func mint "0x6b9d03759E9F14a641f0703fBD84F1F726159B6B" 1000000000000000000000000 10 "0x" --network localhost`). **Note that if you do not see "Using contracts" in the terminal output, something may not be configured correctly and the information exported to tenderly will be incomplete (e.g., with no ABI).**

9. When you are done debugging with tenderly, remember to undo the deletion of the deployments folder

```bash
git checkout origin/master deployments
```

#### Autocomplete

For ZSH (omz), add the following to your zsh config file (requires [zsh-completions](https://github.com/zsh-users/zsh-completions))

```
# https://github.com/zsh-users/zsh-completions
fpath+=${ZSH_CUSTOM:-${ZSH:-~/.oh-my-zsh}/custom}/plugins/zsh-completions/src
autoload -U compinit && compinit
```

Then run

```bash
tenderly completion zsh > ${ZSH_CUSTOM:-${ZSH:-~/.oh-my-zsh}/custom}/plugins/zsh-completions/src
```

### Deployments

When deploying contract to `polygon` or `mumbai` enmsure you have `POYGONSCAN_API_KEY`
set in your `.env` so that the deploy process can upload the contract sources and ABI
to polygonscan.
