# hardhat-fireblocks-signer

Hardhat plugin incorporating support for fireblocks signing using ethers.

Depends on `hardhat-ethers`

Adds:

- `hre.fireblocks.getSigners() => Promise<FirblocksSigner[]>`
- `hre.fireblocks.getSigner(index) => Promise<FirblocksSigner | undefined>`
- `userconfig.fireblocks: { apiKey: 'YOUR_API_KEY', apiSecret: 'YOUR_API_SECRET_PATH', vaultId: '0' }`
- `config.fireblocks: { apiKey: 'YOUR_API_KEY', apiSecret: '<PEM_PRIVATE_KEY>', vaultId: '0' }`

Cobbled together based on:

- https://github.com/fireblocks-oren/fireblocks-evm-contract-deploy
- https://github.com/fireblocks/fireblocks-defi-sdk

And help center docs

TODO:

- [ ] Move network to chain mapping to Nori's config file
- [ ] Expose other sdk client params that may be relevant (i.e. asset)

## Usage

To enable fireblocks signing please set the following env vars:

- FIREBLOCKS_API_KEY
- FIREBLOCKS_API_SECRET_PATH
- FIREBLOCKS_VAULT_ID
