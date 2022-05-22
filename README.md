# About

The Ethereum smart contracts that power [nori](https://nori.com)

---

## Supported Networks and their Contracts

### polygon

- BridgedPolygonNORI
  - 0x8cf6E82919f69aE382DEf8f94e581a43Ce1E70C1
- LockedNORI
  - 0xCcFfFA6c2a030821331cC113b63babDC60BfF82A
- Certificate
- Removal
- FIFOMarket

### mumbai (polygon testnet)

- BridgedPolygonNORI
- LockedNORI
- Certificate
- Removal
- FIFOMarket

### mainnet (ethereum L1)

- NORI
  - 0x961760Ad1bEd52bf4d79aa4b1558E7F9d72071e4

### goerli (ethereum L1 testnet)

- NORI

### localhost (hardhat standalone)

- BridgedPolygonNORI
- LockedNORI
- Certificate
- Removal
- FIFOMarket
- NORI

NB: hardhat running locally in a separate process (see `Running and deploying to a local testnet`)

### hardhat (hardhat in-process)

Same contracts as _localhost_

You would rarely target this network from the CLI except when running tests because it starts a fresh in-process hardhat node that exits when the CLI command completes.

## Development

### Running and deploying to a local testnet

To start a local hardhat chain:

```
hardhat node
```

or optionally to mint BridgedPolygonNORI to the owner wallet when the node starts
(avoids complexities because we don't run a mock of the Polygon bridge locally)

```
MINT=true hardhat node
```

In both variations the `0_deploy_contracts` script is run so your node starts seeded with test wallets and all of our contracts deployed.

---

## Testing

Run tests using an in-process hardhat blockchain:

```
yarn test
```

### Reporting gas usage from tests

Note that gas reporting is disabled by default because it slows tests down significantly.

First, set `REPORT_GAS` and `COINMARKETCAP_API_KEY` environment variables.

Then, in a first terminal, run the following:

```
hardhat node --no-deploy
```

Finally, in a second terminal, run the following:

```
REPORT_GAS=true hardhat test --network localhost
```

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
hardhat docgen
```

---

## Contracts

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
MINT=true hardhat node
```

### Standard test addresses

- Account #0 (admin): 0x465d5a3ffea4cd109043499fa576c3e16f918463 (1000000 ETH)

- Account #1: 0x8eb185e20a9b7b31bd48da19e834b93be952795e (1000000 ETH)

- Account #2 (supplier): 0x6b9d03759e9f14a641f0703fbd84f1f726159b6b (1000000 ETH)

- Account #3: 0xbd6e6a75c7a51cfdf08ddf2f538ceb221835839b (1000000 ETH)

- Account #4 (investor1): 0x8abfd8375da1521e70d23988eb5a6efa799c15ea (1000000 ETH)

- Account #5 (investor2): 0x6029424b26feffe2879e88c62e8130dc418e64d9 (1000000 ETH)

- Account #6 (buyer): 0x0ee3e1d93121c989c94f3e9cf9f9b655ad2cd3cf (1000000 ETH)

- Account #7 (employee): 0x533df4b74a18a84f5d9287ed9c5afcbb59dbed1f (0 ETH)

- Account #8 (mockPolygonBridge): 0x9b9add2d2f759219c60b89a859ef658b8b8280c9 (1000000 ETH)

- Account #9 (noriWallet): 0xf31c29b01ef18a3d9726b99ad0e9692e498cf5f8 (0 ETH)

## Tips and tricks

### Hardhat

#### Shorthand and autocomplete

- [Docs](https://hardhat.org/guides/shorthand.html)

### Tenderly

1. Install the [tenderly CLI](https://github.com/Tenderly/tenderly-cli)

2. Request to be added to the nori tenderly project
3. Login to tenderly via the CLI

```bash
tenderly login # Generate an access token in the tenderly dashboard or use the email login
```

4. Delete the deployments folder (remember to undo this before checking back in). If you forget to do this step, you might end up with inconsistent behavior when attempting to export transactions due to how the current version of tenderly parses the deployments folder. Future versions of `tenderly-cli` might make this step obsolete, but for now, it's a very important step for consistency.

```bash
mv deployments deployments_backup
```

5. Test that it works with the following:

```bash
MINT=true TRACE=true LOG_HARDHAT_NETWORK=true hardhat node --no-deploy
```

6. Then, in another terminal, run

```bash
MINT=true TRACE=true LOG_HARDHAT_NETWORK=true hardhat deploy --network localhost
```

7. Delete the `deployments/localhost` folder generated by hardhat-deploy (you only need want the `deployments/localhost_9001` folder generated by `hardhat-tenderly`'s `persistArtifacts`)

```bash
rm -rf deployments/localhost
```

8. Grab a transaction hash from the terminal output and then run the following (replace `TRANSACTION_HASH` with the transaction hash):

```bash
tenderly export TRANSACTION_HASH --debug
```

9. If you want to inspect the gas profile or debug individual contract functions use the hardhat CONTRACT_NAME plugins (e.g., `hardhat Removal --func mint "0x6b9d03759E9F14a641f0703fBD84F1F726159B6B" 1000000000000000000000000 10 "0x" --network localhost`). **Note that if you do not see "Using contracts" in the terminal output, something may not be configured correctly and the information exported to tenderly will be incomplete (e.g., with no ABI).**

10. When you are done debugging with tenderly, remember to undo the renaming of the deployments folder

```bash
mv deployments_backup deployments
```

#### Tenderly autocomplete

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
