# Nori Smart Contracts

Nori's core product is the Nori _Removal_ Tonne (NRT). NRTs can be understood as carbon removal credits that are granted to a supplier for the CO2 they have removed from the atmosphere via [regenerative agriculture](https://www.weforum.org/agenda/2023/01/5-ways-to-scale-regenerative-agriculture-davos23/). For each tonne of carbon removed, a supplier is granted 1 NRT. Suppliers then consign their NRTs to Nori's marketplace, effectively listing them for sale at a fixed amount of USDC.

If a supplier is found to have released the sequestered carbon the corresponding Removals will be burned and funds from the insurance reserve used to replace them making the _Certificate_ and buyer whole. Automating the replacement of those burned Removals is on the future roadmap but is not implemented here.

When NRTs are purchased, the buyer is minted a non-transferrable _Certificate_ (NCCR) and the NRTs purchased are transferred to the ownership of the _Certificate_, ultimately retiring the NRTs.

During the purchase lifecycle, Nori collects a configurable marketplace fee (currently 25%) from each transaction.

## Contracts Overview

### Marketplace Contracts

#### [_Removal_ (NRT)](Removal.md)

An ERC1155 compatible NFT which represents NRTs (carbon removal credits) issued to a supplier.

Each token ID encodes the wallet address of the supplier to which the NRTs were issued in addition to information about the source and location of the carbon removed. See [_RemovalIdLib_](RemovalIdLib.md) for details.

The total supply of each _Removal_ token ID represents the amount of NRTs granted for a specific parcel of land in a specific year.

Lifecycle of a _Removal_:

1. Minted to supplier's wallet address.
2. Transferred to the _Market_ contract to be listed for sale. Often in the scope of the minting transaction.
3. Sold by the _Market_ and transferred to the _Certificate_ contract with internal bookkeeping mapping ownership of removal token balances to specific certificate tokens.
4. Possibly burned or partially burned if the carbon is released -- i.e., supplier fails to uphold their contractual obligation to keep the underlying carbon sequestered for the duration of their contract.

#### [_Certificate_ (NCCR)](Certificate.md)

An [ERC721a](https://www.erc721a.org/) compatible NFT representing a carbon removal buyer's proof of purchase.

Every purchase in the market mints a new _Certificate_ token with a unique ID. The _Certificate_ contract is configured as an ERC1155 recipient to receive the purchased _Removal_ tokens.

Every _Certificate_ NFT is non-transferable. It is a fundamental tenet of the Nori market design that removals and their certificates cannot change hands after the purchase transaction.

Each _Certificate_'s has a balance of underlying removals which may fall below the original amount it was minted with if its underlying NRTs were released. Those released NRTs will be replaced by sending additional NRTs to the certificate.

> **Note**
> Automated replacement of burned NRTs is out of scope in this iteration of the contracts.

#### [_Market_](Market.md)

The core swap market contract of the Nori platform. Removals are listed for sale by sending them to this contract using the consign function.

##### Swap mechanism

The `swap` function is the primary point of interaction with the market for buyers. Calls to the `swap` function include an amount of NRTs to purchase and a recipient wallet address to which the _Certificate_ is minted. These calls also include a pre-signed authorization to transfer the corresponding amount (including fees) of the supported ERC20 (_USDC_ or _BridgedPolygonNORI_) following the [ERC20Permit](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/draft-ERC20Permit.sol) pattern. Alternatively, the buyer can pre-approve the Market contract as a spender of the corresponding ERC20 and use the version
of `swap` that does not require permit arguments. Note that this previously public endpoint now requires buyers to have the `SWAP_ALLOWLIST_ROLE` to comply with sanctions laws and regulations.

The ERC20 tokens transferred from the buyer to this contract are distributed as follows:

- A configurable market fee percentage to Nori's fee wallet (currently 25%).
- The balance of the proceeds of the sale are forwarded to the supplier(s) address.

##### Withdrawal Mechanism

An unsold _Removal_ can be withdrawn from the market (delisted for sale) by the owner as encoded in the _Removal_ ID or by an appropriately permissioned operator address. It may later be re-listed for sale.

##### Priority Supply Mechanism

The market may be configured with a priority supply threshold. When supply listed for sale drops below this threshold purchases are restricted to addresses having the `PRIORITY_ALLOWLIST_ROLE` role. This mechanism gives Nori the ability to reserve supply for pre-committed partnerships or other off-chain arrangements.

### Support Libraries

#### [_AccessPresetPausable_](AccessPresetPausable.md)

A preset contract that enables pausable access control.

#### [_UInt256ArrayLib_](UInt256ArrayLib.md)

Array utility functions for `uint256[]`.

#### [_AddressArrayLib_](AddressArrayLib.md)

Array utility functions for `address[]`.

#### [_ERC20Preset_](ERC20Preset.md)

An ERC20 token preset contract with [ERC2612](https://eips.ethereum.org/EIPS/eip-2612) permit functionality.

#### [_Errors_](Errors.md)

Custom errors shared across multiple contracts.

#### [_LockedNORILib_](LockedNORILib.md)

The schedule logic for multiple cliffs followed by linear unlock used by the _LockedNORIV2_ contract. The vesting behavior and the unlocking behavior of each grant are each implemented using a schedule from this library.

#### [_RemovalIdLib_](RemovalIdLib.md)

The logic for encoding and decoding removal IDs, which contain information about the origin of the carbon removal.

#### [_RemovalsByYearLib_](RemovalsByYearLib.md)

The queuing mechanism used by the _Market_ contract to maintain an ordered list of _Removal_ tokens by year listed for sale on behalf of a given supplier.

### Deprecated

#### ERC777PresetPausablePermissioned

An ERC777 token preset contract.

## Supported Networks

See [contracts.json](../contracts.json) for a comprehensive list of all contracts deployed to each network.

## Upgradeability

Contracts in this repo use the [OpenZeppelin Upgrades Plugin](https://docs.openzeppelin.com/upgrades-plugins/1.x/) to manage upgradeability.

## Audits

See [here](../docs/audits/README.md) for the latest audit reports.

## Contracts for the Future

### ERC20 Tokens

#### [_NORI_](NORI.md)

The _NORI_ token is Nori's fungible token which functions as a gift card to purchase NRTs. One NRT is worth one _$NORI_. The marketplace is configurable with respect to which ERC20 token it is willing to accept as payment. The initial launch of the market will be configured to receive _USDC_, with the intention of switching to receive _NORI_ once that token is launched publicly with sufficient liquidity.

When a supplier's listed NRTs are sold, the supplier gets paid in _NORI_ tokens at a constant rate of 1 NRT per 1 _NORI_ token (an [ERC20](https://github.com/ethereum/ethereum-org-website/blob/b17088f97b805dbc947e629d3ae5358ed27ac076/src/content/developers/docs/standards/tokens/erc-20/index.md) compatible token on [the Polygon blockchain](https://polygon.technology/)). This mechanism is designed to enable price discovery for carbon removal.

- Deployed on: Ethereum mainnet.
- Initial supply minted at deployment: 500M.
- Minting is disabled.

[_NORI_ on Etherscan](https://etherscan.io/token/0xFAdEDFe89B5A530C0a7f69bE442E190751a13093)

#### [_BridgedPolygonNORI_](BridgedPolygonNORI.md)

_BridgedPolygonNORI_ is the [_$NORI_](NORI.md) token bridged to Polygon PoS.

- Polygon child chain mapper is the only contract with mint / burn permission (`DEPOSITOR_ROLE`).
- Initially deployed with a total supply of zero.

[_BridgedPolygonNORI_ on PolygonScan](https://polygonscan.com/token/0x5922Da38963429b12CA3d7a60f9435AA1f3e8C1D).

### Vesting and Lockup

#### [_LockedNORI_](LockedNORI.md)

A contract managing investor and employee timed vesting and unlocking contract.

V2 of this contract was updated to support the new [ERC20Permit](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/draft-ERC20Permit.sol) pattern with _BridgedPolygonNORI_ and to remove reliance on the ERC777 `tokensReceived` callback. A setter was added to allow us to replace the underlying wrapper token contract with the newer ERC20Permit version of _BridgedPolygonNORI_.

> **Note**
> Investors and employees have received _NORI_ token grants bound by vesting and lockup terms. These grants are implemented by _LockedNORI_ which does not currently support transfer of locked tokens and allows a maximum of one grant schedule per wallet address.

[_LockedNORI_ on PolygonScan](https://polygonscan.com/token/0xccfffa6c2a030821331cc113b63babdc60bff82a)
