## Migration Tips

There are a few different ways to leverage the way migrations work. By default, these migrations are what we use to upgrade our contracts. When testing or developing locally, this is no big deal, and you should interact with migrations in the standard way:

```
npx truffle migrate
```

On testnets such as ropsten, the `MultiAdmin` contract is the most important thing to understand. Firstly, you need to be whitelisted as a MultiAdmin in order to run a upgrade on the testnets. The standard way to run an upgrade is the same as the previous, embedded logic will automatically check for upgrades and initiate where needed (initiates whenever the SemVer changes in the contract name).

You have two different `process.env` variables to use when appropriate. The first can be used to print verbose migration information:

```
MIGRATION=true npx truffle migrate
```

The second is a nuclear option, which can be used to reset everything, including the multisig contracts, ENS registration, and the root and contract registries (and all the contract's state therein)

```
NUKE=true npx truffle migrate
```

## Ropsten

Note: contracts on ropsten won't migrate unless their version number has been incremented

Note: a recent migration (10/10/18 and using NUKE=true) took approximately 5.12335157 ETH and 50 minutes to complete.

### Nori developer migration

Nori developers migrate using developer hardware wallets. These hardware wallets are defined in a multi-sig contract which controls the registry and owns the proxy contracts. To be able to communicate with this system properly you will need the following

1. a hardware wallet
2. that hardware wallets public key added as an owner to the MultiSig contract (found registered at the RootRegistry)
3. plug in and unlock your hardware wallet
4. turn browser support to `no`
5. turn contract support to `yes`
6. start geth `geth --datadir=.ropsten --testnet --syncmode=light --cache 4096 --rpc --rpcapi="db,eth,net,web3,personal" --maxpeers 76 --lightpeers 50 console attach`
7. check that you wallet is unlocked by running `web3.personal.listAccounts` The output should be a list of Ethereum addresses, if the output is an empty array `[]`, you have not made it this far successfully
8. If all the above works, you can run something like `MIGRATION=true npx truffle migrate` in a second terminal (while geth is still running)
9. you will need to be very attentive during this process and _quickly_ confirm transactions, otherwise truffle will error out

### ENS

We make use of ENS on Ropsten by resolving `nori.test` to the RootRegistry address

To get status information from Ropsten, follow the quick-start guide [here](http://docs.ens.domains/en/latest/quickstart.html) to load the ensutils script. Then after you have successfully loaded the script in geth and the `true` output was printed, you can run:

```
getAddr('nori.test')
```

This will print the current Root Registry address if everything went right.

### Pro tips:

Sometimes ropsten has slow blocktimes. In this case, you'll want to have a miner started. To do so, you can run two parallel terminals with two parallel geth instances.

#### start the light version this way

```
geth --datadir=.ropsten --testnet --syncmode=light --cache 4096 --rpc --rpcapi="db,eth,net,web3,personal" --maxpeers 76 --lightpeers 50 console attach
```

#### start the non-light mining-enabled version this way (but with mining disabled until syncing finished)

```
geth --datadir=.ropsten --testnet --cache 4096  --maxpeers 76 --lightpeers 50 console --port=8546
```

After syncing has finished, feel free to close the light client, and start the miner this way:

```
geth --datadir=.ropsten --testnet --cache 4096  --rpc --rpcapi="db,eth,net,web3,personal" --maxpeers 76 --lightpeers 50 console --port=8546 --rpcport 8547 --mine
```
