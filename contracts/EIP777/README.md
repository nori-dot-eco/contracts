# ERC 777: Advanced Token Standard

These contracts have been moved to a respective submodule so as to allow for easier collaboration/syncing with the official standard. They are now in [contracts/contrib/EIP/eip777](https://github.com/nori-dot-eco/contracts/tree/master/contracts/contrib/EIP)

## Modifying ERC 777 code

0.  `git checkout -b [BRANCH NAME]` <- run this in the contracts root directory
1.  `cd contracts/contrib/EIP/eip777/`
1.  `git checkout -b [BRANCH NAME]`
1.  make your changes
1.  make sure tests pass in the eip777 folder
1.  `git add .`
1.  `git commit -m "this is a message about the changes"`
1.  `git push origin [BRANCH NAME]`
1.  Open a pull request [here](https://github.com/nori-dot-eco/eip777) from `[BRANCH NAME]` to `nori`
1.  After changes are accepted, merge the branch
1.  cd back into the root contracts directory of the nori contracts repository
1.  make sure tests pass in the root contracts folder
1.  run `git status` and verify that you see that the contrib folder contains updates
1.  add and commit the eip folder
1.  push the contracts repository to origin and open a pull request from `[BRANCH NAME]` to `master`
1.  After changes are accepted, merge the branch
1.  `cd contracts/contrib/EIP/eip777/` verify that your current branch commit is the same as [the updated nori branch you made in step 7](https://github.com/nori-dot-eco/eip777)

## Formal Specifications

- [ERC-777 Advanced Token Standard](https://eips.ethereum.org/EIPS/eip-777)

## Background

The NORI implementation of the ERC 777 advanced token standard extends the basic functionality to allow for a few more types of introspection-invoked transactions (ie `madeOperatorForTokens` which uses contract introspection to see if a receiving contract has the requested function implementation to support being made an operator of the NORI token).

## Purpose

See NORI readme

## Key features

See NORI readme
