# Pre-reqs:

Until the Solidity extension for VSCode supports soliumrc.json files, you'll need both extensions:

- [Solidity](https://github.com/juanfranblanco/vscode-solidity)
- [Solidity Extended](https://github.com/beaugunderson/vscode-solidity-extended)

When using VSCode, add the following to your user settings (`ctrl + ,`)

```
"solidity.packageDefaultDependenciesContractsDirectory": "",
"solidity.linter": "",
```

# Contracts

The Ethereum smart contracts that power nori.com

Each folder within `contracts/` has its own readme file with much more information relating to how the contracts work.

Additionally, [documentation](docs) for each contract is generated using [soldoc](https://github.com/dev-matan-tsuberi/soldoc) and can be found within the `docs/` folder.

To generate a new version of the docs:

> yarn sol:docs

## Development/Contributing

After cloning, you may also need to do: `git submodule init`.

External contributors: simply create a feature branch, complete your development, and submit the pull request against master. CircleCI will take care if integration tests, etc.

Note: The `contracts/contrib` folder contains a submodule (and will contain more: ie `contracts/contrib/EIP/eip820`) for EIPs and other contract repositories. We use these to contribute to official standards. When developing, make sure you grab the latest version of that submodule.

## Testing

> yarn run test

Note: we use a sub-standard way of test suites. All tests are exported from the `test/behaviors/BEHAVIOR.js` folder and imported in the `test/CONTRACT.test.js` file. Finally the test suites are exported from the `.test.js` file and imported in `test/0_setup_tests.js` which contains the full list of test suites to run. Since testing can take awhile, best to comment out the suites you are not using within this file for quicker feedback.
