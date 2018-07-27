# Market Contracts

## Formal Specifications

- [FIFO Market Type](https://github.com/nori-dot-eco/NIPs/blob/NIP-11-FIFO-Market-Type/NIP-11-FIFO-Market-Type.md)
- [Market Ecosystem Componets](https://github.com/nori-dot-eco/NIPs/blob/NIP-2-Market-Ecosystem-Components/NIP-2-Market-Ecosystem-Components.md)

## Background

Ther are multiple types of markets:

- Selectable: a market where buyers and suppliers can chose which CRC they want to purchase with their NORI
- FIFO: a market where CRCs are bought and sold in a first-in-first-out queue (similar to a spot market). In this market, buyers do not get to chose which CRCs they are purchasing.

**The only market currently supported by Nori is the FifoCRCMarket.**

## Purpose

The Market contracts are used to buy and sell Carbon Removal Certificates. They are the contracts by which suppliers list CRCs and buyers purchase them with NORI tokens.

The Market contracts are not currently designed to ever take custody of buyer or supplier assets. Instead, they are a medium that is used to swap a comodity asset from a suppliers own account to a buyers account without ever taking custody of the asset itself (nor the buyers tokens).

At a high level, the market accomplishes this form of an atomic swap by use of the CRC and NORI tokens `authorizeOperator` function. When a supplier invokes this function, passing in the market address as the intended operator, the market is given authorization to transfer the CRC on behalf of the user ONLY when it receives a corresponding NORI authorization from a buyer. When it does receive this corresponding authorization (done in the same way as the CRC was done: using the NORI token's `autorizeOperator` function), the Market autonomously invokes (via contract introspection described in the EIP820 readme) an `operatorSendOne` call on the CRC and an `operatorSend` call on the NORI token to send the NORI to the supplier, and the CRC to the buyer.

Basically, the market "listens" for suppliers who say "I want to sell this CRC bundle", and "listens" for buyers who say "I want to buy some CRCs with my tokens", and when it can match these two conversations, it automatically swaps the NORI for the CRC.

**In other words, you never have to deposit the NORI or the CRC in an exchange.**

## Key features

- An atomic swap medium used to swap NORI for CRCs
- a medium for querying the amount of CRCs for sale
