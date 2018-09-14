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

The second is a nuclear option, which can be used to reset everthing, including the multisig contracts, ENS registration, and the root and contract registries (and all the contract's state therein)

```
NUKE=true npx truffle migrate
```
