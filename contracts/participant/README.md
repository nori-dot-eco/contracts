# Participant Contracts

## Formal Specifications

- [Market Ecosystem Components](https://github.com/nori-dot-eco/NIPs/blob/NIP-2-Market-Ecosystem-Components/NIP-2-Market-Ecosystem-Components.md)

## Background

In the Ethereum blockchain all smart contract functions are permissionless by default. However, for the Nori marketplace to abide by certain KYC and other restrictions, we have created these participant "identities" that are used as a sort of proxy to forward a function call onto a contract such as the FIFOMarket smart contract.

The [uPort Identity github](https://github.com/uport-project/uport-identity) was the starting point for the proxy-ispired transaction forwarding.

## Purpose

In creating these participant identity contracts, we are able to modiy functions to only allow invokation when it comes from one of the known participant contracts.

## Key Contracts

To use any of the participant contracts correctly, you should encode a function call off chain, and submit the encoded data to the intended participant type (ie supplier, verifier, etc).

For example:

```javascript
function encodeCall(name, _arguments, values) {
  const methodId = abi.methodID(name, _arguments).toString('hex');
  const params = abi.rawEncode(_arguments, values).toString('hex');
  return `0x${methodId}${params}`;
}

const mint = (to, value) =>
  encodeCall(
    'mint',
    ['address', 'bytes', 'uint256', 'bytes'],
    [to, '0x0', value, '0x0']
  );

await supplier.forward(
  basicCommodity.address,
  0,
  mint(getNamedAccounts(web3).supplier0, 100),
  'IMintableCommodity',
  {
    from: getNamedAccounts(web3).supplier0,
  }
);
```

[See full example here](https://github.com/nori-dot-eco/contracts/blob/master/test/behaviors/BasicCommodity.js)

### Participant

This contract is the base contract to be inherited from by all participant types (i.e. supplier, verifer, etc). It contains the basic functions for forwarding transactions.

#### Key features

- Used to permission smart contract functions

See the `_forward`, `isAllowed`, and `executeCall` functions [defined in here](https://github.com/nori-dot-eco/contracts/blob/master/contracts/participant/ParticipantV0_1_0.sol#L47) for more info.

### Participant Registry

Defines all of the authorized public keys and the participant functions they are allowed to call.

#### Key features

- defines which addresses are permissioned for which participant types

Implemented as:

```solidity
 function isAllowed(address _ifaceImpAddr, string ifaceLabel) public returns (bool) {
    return (participantTypes[keccak256(abi.encodePacked(ifaceLabel))][_ifaceImpAddr] == true);
  }
```

- used to add or remove permissions for an addresses authorized participant types

Implemented as:

```solidity
function toggleParticipantType(string _participantType, address _impAddress, bool _toggle) public {
    participantTypes[keccak256(abi.encodePacked(_participantType))][_impAddress] = _toggle;
  }
```

[See example interaction here](https://github.com/nori-dot-eco/contracts/blob/master/test/behaviors/Supplier.js#L51)

### Supplier

The supplier is the only participant type which is allowed to create new CRCs. As such, the CRC's `mint` function is made to be only callable by a public key defined in the `ParticipantRegistry.sol` contract as an authorized supplier.

#### Key features

- can mint new crcs with an unverified rating

See [here](https://github.com/nori-dot-eco/contracts/blob/master/contracts/commodity/MintableCommodity.sol#L27) for how this is enforced in the CRC contract.

- can split owned crcs

See [here](https://github.com/nori-dot-eco/contracts/blob/master/contracts/commodity/SplittableCommodity.sol#L12) for how this is enforced in the CRC contract.

### Verifier

The Verifier is allowed to upgrade and downgrade verification levels of a CRC.

#### Key features

- Can upgrade and owngrade CRC estimation tiers

See [here](https://github.com/nori-dot-eco/contracts/blob/master/contracts/commodity/VerifiableCommodity.sol#L16) for how this is enforced in the CRC contract.

[See example interaction here](https://github.com/nori-dot-eco/contracts/blob/master/test/behaviors/Verifier.js)

### MultiAdmin

This is the Super User account. It is a multisig wallet, adapted from the [official gnosis implementation](https://github.com/gnosis/MultiSigWallet) . The MultiAdmin contains a list of owners (aka admins) who can call functions such as the upgrading of a contract. This is the account that owns all of the contracts in the Nori dapp.

It is currently defined at this address for ropsten (and will likely change pre-launch): `0x63c5d0a58669062cc4b5686647655eea00d07367`

#### Key features

- used to upgrade contracts
- owns all Nori contracts
- is defined inside the RootRegistry
- used in truffle migrations
- requires N number of signatures to perform an action

[Example interaction here](https://github.com/nori-dot-eco/contracts/blob/master/test/behaviors/MultiSig.js)
