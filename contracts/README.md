# Nori Smart Contracts

Nori's product is the NRT or Nori _Removal_ Tonne which can be thought of
as a carbon credit granted to a supplier for the CO2 they have removed from
the atmosphere.
The supplier consigns this asset in Nori's marketplace and gets paid in _NORI_ token.
A buyer of NRTs is issued a _Certificate_
(NCCR) which is non-transferrable and owns the NRTs that were swapped from
the supplier for NORI. If a supplier is found to have prematurely released the
sequestered carbon the corresponding NRTs will be burned and funds from the insurance
reserve used to replace them making the Certificate and buyer whole.

Nori collects a configurable marketplace fee (currently 15%) of each transaction
and additionally restricts a percentage of the proceeds of the swap to be held
in an insurance reserve and released linearly over the supplier's ten year contract
with Nori. _RestrictedNORI_ implements this restriction and schedule release mechanism
with support for transfer of restricted token blocks between wallets.

Investors and employees have received token grants bound by vesting and lockup
terms. These grants and implemented by _LockedNORI_ which does not currently support
transfer of locked tokens and allows a maxaimum of one grant schedule per wallet address.

Detailed documentation on these contracts is available [here](../docs)

## ERC20 Tokens

### NORI (NORI)

The [$NORI](./NORI.sol) token is Nori's fungible token which functions as a gift card to purchase NRTs. One NRT is worth one $NORI.

- Deployed on: Ethereum mainnet.
- Initial supply minted at deployment: 500M
- Minting and burning are disabled.

[NORI on Etherscan](https://etherscan.io/token/0x961760ad1bed52bf4d79aa4b1558e7f9d72071e4) Current live deployment: (will be replaced with the current version of the contract having ERC777 support removed with our next deployment.)

### BridgedPolygonNORI (NORI)

[BridgedPolygonNORI](./BridgedPolygonNORI.sol) is the [$NORI](./NORI.sol) token bridged to Polygon PoS.

- Polygon child chain mapper is the only contract with mint / burn permission (DEPOSITOR_ROLE).
- Initially deployed with totalSupply of zero.

[NORI on PolygonScan](https://polygonscan.com/token/0x8cf6e82919f69ae382def8f94e581a43ce1e70c1) Current live deployment (will be replaced with the current version of the contract having ERC777 support removed with our next deployment.)

## Marketplace Contracts

### Removal (NRT)

[Removal.sol](./Removal.sol)

ERC1155 token representing the NRTs (carbon removal credits) issued to a supplier.

Each token ID encodes the wallet address of the supplier to whom the NRTs were issued in addition to information about the source and location of the carbon removed. See [RemovalLib](./RemovalIdLib.sol) for details.

The total supply of each Removal token ID represent the estimated quantity of NRTs (tonnes of CO2 removed from the atmosphere) on a specific parcel of land in a specific year.

Lifecycle of a Removal:

1. Minted to a supplier's wallet address
2. Ownership transferred to the _Market_ contract to be listed for sale. Often in the scope of the minting transaction.
3. Sold by the _Market_ and ownership transferred to the _Certificate_ contract with internal bookkeeping mapping ownership of removal token balances to specific certificate tokens.
4. Possibly burned or partially burned if the supplier fails to uphold their contractual obligation to keep the underlying carbon sequestered for the duration of their contract.

### Certificate (NCCR)

[Certificate.sol](./Certificate.sol)

ERC721a token representing a carbon removal buyer's proof of purchase.

Every purchase in the market mints a new _Certificate_ token with a unique ID. _Certificate_ is configured as an ERC1155 recipient to receive the purchased _Removal_ tokens.

Certificates are non-transferable. It is a fundamental tenet of the Nori market design that Removals and their Certificates cannot change hands after the purchase transaction.

A certificate's balance of underlying Removals may fall below the original quantity it was minted with if its underlying removals were burned. Those burned removals will be replaced by sending additional removals to the certificate. Automated replacement of those burned removals is out of scope in this iteration of the contracts.

### Market

[Market.sol](./Market.sol)

The core swap market contract in the Nori platform. Removals are listed for sale by sending them to this contract.

#### _Swap_ mechanism:

The _swap_ function is the primary point of interaction with the market for buyers. Calls to the _swap_ function include a quantity of NRTs for purchase and a recipient wallet address to which the Certificate is minted. These calls must additionally include a pre-signed authorization to transfer the corresponding quantity of _BridgedPolygonNORI_ following the [ERC20Permit](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/draft-ERC20Permit.sol) pattern.

The NORI tokens transferred from the buyer to this contract are distributed as follows:

- A configurable market fee percentage to Nori's fee wallet (currently 15%)
- A configurable percentage of the sale proceeds due to the supplier(s) are forwarded to the _RestrictedNORI_ contract to be withheld for insurance purposes and released over the life of their NRT agreement(s). (Configured on each Removal)
- The balance of the proceeds of the sale are forwarded to the supplier(s) address.

#### Withdrawal Mechanism:

An unsold _Removal_ can be withdrawn from the market (de-listed for sale) by the owner as encoded in the removal ID or by an apporpriately permissioned operator address. It may later be re-listed for sale

## Vesting and Lockup

### LockedNORIV2

[source](./LockedNORIV2.sol)

Investor and Employee timed vesting and unlocking contract.

The current version was updated to support the new [ERC20Permit](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/draft-ERC20Permit.sol) pattern with _BridgedPolygonNORI_ and to remove reliance on the ERC777 tokensReceived callback.

[LockedNORI](https://polygonscan.com/token/0xccfffa6c2a030821331cc113b63babdc60bff82a) on PolygonScan.

### RestrictedNORI

Supplier insurance holdback contract.

Operates similarly to _LockedNORI_ by acting as a wrapper token that governs the scheduled release of the underlying _BridgedPolyg
onNori_ asset. Implemented as an ERC1155, each token id has its own schedule parameters that control the linear release of the unde
rlying assets over the duration of the schedule. It is possible to create more than one schedule per owner address and also to tran
sfer full or partial restricted balances between addresses.

## Support Libraries

### ArrayLib

### LockedNORILib

The logic for multiple cliffs followed by linear unlock used by the _LockedNORIV2_ contract. The vesting behavior and the unlocking behavior of each grant are each implemented using a schedule from this library.

### RestrictedNORILib

The schedule logic used in _RestrictedNORI_

### RemovalsByYearLib

The queing mechanism used by the _Market_ contract to maintain an ordered list of _Removal_ tokens listed for sale on behalf of a given supplier.

## Deprecated

### LockedNORI

### ERC777PresetPausablePermissions

## Prior Audit

[Omniscia](https://omniscia.io/nori-multiple-token-implementations/) audited NORI, BridgedPolygonNORI and LockedNORI in March of 2022.
