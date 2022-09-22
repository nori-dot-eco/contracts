import type {
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner,
} from '@ethersproject/abstract-signer';
import { Signer } from '@ethersproject/abstract-signer';
import type {
  JsonRpcProvider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from '@ethersproject/providers';
import { UnsignedTransaction, _TypedDataEncoder } from 'ethers/lib/utils';
import {
  resolveProperties,
  Logger,
  keccak256,
  toUtf8Bytes,
} from 'ethers/lib/utils';
import type { Deferrable } from '@ethersproject/properties';
import { defineReadOnly } from '@ethersproject/properties';
import type { Bytes } from '@ethersproject/bytes';
import type { PopulatedTransaction } from 'ethers';
import { BigNumber, ethers, constants } from 'ethers';
import { TransactionStatus } from 'fireblocks-sdk';
import type { FireblocksSDK } from 'fireblocks-sdk';

import { EthersCustomBridge } from './from-upstream/fireblocks-bridge';
import { Chain } from './from-upstream/chain';

const log = new Logger('fireblocks signer');

export class FireblocksSigner extends Signer implements TypedDataSigner {
  readonly fireblocksApiClient!: FireblocksSDK;

  readonly chain!: Chain;

  readonly vaultAccountId!: string;

  readonly _bridge: EthersCustomBridge;

  memo = '';

  constructor(
    fireblocksApiClient: FireblocksSDK,
    chain: Chain = Chain.POLYGON,
    provider: JsonRpcProvider,
    vaultAccountId?: string
  ) {
    log.checkNew(new.target, FireblocksSigner);
    super();
    defineReadOnly(this, 'fireblocksApiClient', fireblocksApiClient);
    defineReadOnly(this, 'chain', chain);
    defineReadOnly(this, 'vaultAccountId', vaultAccountId || '0');
    defineReadOnly(this, 'provider', provider);
    this._bridge = new EthersCustomBridge({
      fireblocksApiClient,
      vaultAccountId: `${vaultAccountId || 0}`,
      chain,
    });
  }

  async getAddress(): Promise<string> {
    try {
      const addresses = await this.fireblocksApiClient.getDepositAddresses(
        this.vaultAccountId,
        this._bridge.assetId
      );
      if (addresses.length === 0) {
        throw new Error(
          `Fireblocks signer: asset ${this._bridge.assetId} unavailable.  Wrong credentials?`
        );
      }
      return ethers.utils.getAddress(addresses[0].address);
    } catch (error) {
      console.log(
        `Fireblocks signer: Failed to load addresses for vault ${this.vaultAccountId} and asset ${this._bridge.assetId}`
      );
      throw error;
    }
  }

  setNextTransactionMemo(memo: string): void {
    this.memo = memo;
  }

  async _fail(message: string, operation: string): Promise<any> {
    log.throwError(message, Logger.errors.UNSUPPORTED_OPERATION, {
      operation,
    });
  }

  async signMessage(message: Bytes | string): Promise<string> {
    const data = typeof message === 'string' ? toUtf8Bytes(message) : message;
    return await this._signMessage(data);
  }

  /**
   * _signMessage: Internal implementation of raw message signing.
   *
   * There isn't a transaction hash returned in the in raw signing result
   * but the `waitForTxHash` call does tell us when the request status has
   * completed approval and signing in fireblocks.
   *
   * @param message - the message to sign
   * @returns Message signature.
   */
  async _signMessage(message: Bytes): Promise<string> {
    const txInfo = await this._bridge.sendRawSigningRequest(
      keccak256(message).slice(2),
      this.memo
    );
    await this._bridge.waitForTxHash(txInfo.id);
    const txDetail = await this.fireblocksApiClient.getTransactionById(
      txInfo.id
    );
    if (txDetail.status !== TransactionStatus.COMPLETED) {
      log.debug(txDetail);
      throw new Error(
        `Raw message signing failed: ${JSON.stringify(txDetail)}`
      );
    }
    const sig = await txDetail.signedMessages![0].signature;
    return ethers.utils.joinSignature({
      r: `0x${sig.r!}`,
      v: sig.v,
      s: `0x${sig.s}`,
    });
  }

  /**
   * _populateTransaction - Internal wrapper around ethers populateTransaction function.
   *
   * Figures out gas pricing and limits.
   *
   * Ideally this would lean more heavily on the JsonRPCProvider but for the moment there
   * is a hardcoded setting of 25 gwei internally which fails on mumbai / polygon now.
   *
   * @param transaction
   * @param type
   * @returns
   */
  async _populateTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<UnsignedTransaction> {
    let gasEstimate;
    try {
      gasEstimate = await this.provider?.estimateGas(transaction);
    } catch (error: any) {
      log.makeError('Error estimating gas', error.code);
      gasEstimate = BigNumber.from(3_000_000); // 3M fallback (dangerous, improve this!)
    }
    const gasLimit =
      transaction.gasLimit !== undefined
        ? BigNumber.from(await transaction.gasLimit)
        : gasEstimate?.add(100_000);
    const maxPriorityFeePerGas =
      transaction.maxPriorityFeePerGas !== undefined
        ? ethers.utils.parseUnits(
            `${transaction.maxPriorityFeePerGas!}`,
            'gwei'
          )
        : undefined;
    const maxFeePerGas =
      transaction.maxFeePerGas !== undefined
        ? ethers.utils.parseUnits(`${await transaction.maxFeePerGas!}`, 'gwei')
        : undefined;
    // fills in the nonce and a few other details.
    const tx = await this.populateTransaction({
      type: 2,
      ...transaction,
      gasLimit,

      maxFeePerGas,
      maxPriorityFeePerGas,
    });
    log.debug(
      `Populated Transaction: ${JSON.stringify({
        nonce: tx.nonce,
        type: tx.type,
        to: tx.to,
        gasLimit: tx.gasLimit?.toString(),
        maxFeePerGas: tx.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
      })}`
    );
    return this._transactionRequestToUnsignedTransaction(tx);
  }

  async _transactionRequestToUnsignedTransaction(
    tx: Deferrable<TransactionRequest>
  ): Promise<UnsignedTransaction> {
    const txResolved = await resolveProperties(tx);
    return {
      ...txResolved,
      chainId: txResolved.chainId || undefined,
      data: txResolved.data ? ethers.utils.hexlify(txResolved.data) : undefined,
      nonce:
        txResolved.nonce !== undefined
          ? ethers.BigNumber.from(txResolved.nonce).toNumber()
          : undefined,
      to: txResolved.to || undefined,
      value: txResolved.value ? BigNumber.from(txResolved.value) : undefined,
    };
  }

  async _signTransaction(transaction: UnsignedTransaction): Promise<string> {
    const txInfo = await this._bridge.sendTransaction(
      transaction as PopulatedTransaction,
      this.memo
    );
    await this._bridge.waitForTxHash(txInfo.id);
    const txDetail = await this.fireblocksApiClient.getTransactionById(
      txInfo.id
    );
    log.debug(txDetail);
    return txDetail.txHash;
  }

  /**
   * _signRawTransaction: Internal implementation of raw transaction signing.
   *
   * There isn't a transaction hash returned in the in raw signing result
   * but the `waitForTxHash` call does tell us when the request status has
   * completed approval and signing in fireblocks.
   *
   * @param message - the message to sign
   * @returns Message signature.
   */
  async _signRawTransaction(transaction: UnsignedTransaction): Promise<string> {
    const baseTx: ethers.utils.UnsignedTransaction = {
      type: 2,
      chainId: transaction.chainId,
      data: ethers.utils.hexlify(transaction.data!),
      gasLimit: transaction.gasLimit,
      maxFeePerGas: transaction.maxFeePerGas,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
      nonce: transaction.nonce,
      value: transaction.value,
    };
    const unsignedTx = ethers.utils.serializeTransaction(baseTx);
    const txInfo = await this._bridge.sendRawSigningRequest(
      keccak256(unsignedTx).slice(2),
      this.memo
    );
    await this._bridge.waitForTxHash(txInfo.id);
    const txDetail = await this.fireblocksApiClient.getTransactionById(
      txInfo.id
    );
    if (txDetail.status !== TransactionStatus.COMPLETED) {
      log.debug(txDetail);
      throw new Error(`Transaction failed: ${JSON.stringify(txDetail)}`);
    }
    const sig = await txDetail.signedMessages![0].signature;
    const signedMessage = ethers.utils.serializeTransaction(transaction, {
      v: ethers.BigNumber.from(`0x${sig.v}`).toNumber(),
      r: `0x${sig.r}`,
      s: `0x${sig.s}`,
    });
    return signedMessage;
  }

  // TODO: untested
  async signTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    const baseTx = await this._populateTransaction(transaction);
    let tx;
    if (transaction.to) {
      // looks like a contract interaction
      tx = await this._signTransaction(baseTx);
    } else {
      // looks like a deploy
      tx = await this._signRawTransaction(baseTx);
    }
    return tx;
  }

  async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    this._checkProvider('sendTransaction');
    let txHash: string;

    const baseTx: UnsignedTransaction = await this._populateTransaction(
      transaction
    );
    if (transaction.to) {
      // looks like a contract interaction
      txHash = await this._signTransaction(baseTx);
    } else {
      // looks like a deploy
      const tx = await this._signRawTransaction(baseTx);
      try {
        console.log(`Submitting signed transaction to the network`);
        const txResponse = await this.provider!.sendTransaction(tx);
        txHash = txResponse.hash;
      } catch (error) {
        console.log(
          `Error forwarding signed raw txn to provider (type: ${typeof error})`
        );
        try {
          const body = JSON.parse((error as any).body);
          console.log(`Error message: ${body.message}`);
        } catch {
          console.log('cannot parse error', error);
        }
        throw error;
      }
    }

    log.debug(`txHash: `, txHash);

    return {
      hash: txHash,
      confirmations: 0,
      from: await this.getAddress(),
      nonce: baseTx.nonce!,
      gasLimit: BigNumber.from(baseTx.gasLimit!),
      data: ethers.utils.hexlify(baseTx.data!) || '',
      value:
        baseTx.value !== undefined
          ? BigNumber.from(baseTx.value)
          : constants.Zero,
      chainId: await this.getChainId(),
      wait: async (): Promise<TransactionReceipt> =>
        this.provider!.waitForTransaction(txHash),
    };
  }

  async _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    // Based on jsonrpc signer implementation: https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/json-rpc-provider.ts#L334
    // See also https://support.fireblocks.io/hc/en-us/articles/4413379762450-Off-Chain-Message-Signing#h_01FE9VKBH6SG9EFT9G097ZV3ET
    // Attempt to populate any ENS names (in-place)
    let populated = { domain, value };
    if (this.chain === Chain.MAINNET) {
      populated = await _TypedDataEncoder.resolveNames(
        domain,
        types,
        value,
        (name: string) => {
          return this.provider!.resolveName(name).then(
            (value) => value || name
          );
        }
      );
    }
    const payload = 
      _TypedDataEncoder.getPayload(populated.domain, types, populated.value)
    const payloadString = JSON.stringify(payload);
    const txInfo = await this._bridge.sendTypedSigningRequest(
      payloadString,
      `${this.memo} ${payload.primaryType} ${JSON.stringify(payload.message)}`
    );
    await this._bridge.waitForTxHash(txInfo.id);
    const txDetail = await this.fireblocksApiClient.getTransactionById(
      txInfo.id
    );
    if (txDetail.status !== TransactionStatus.COMPLETED) {
      log.debug(txDetail);
      throw new Error(
        `Typed signing request failed: ${JSON.stringify(txDetail)}`
      );
    }
    const sig = await txDetail.signedMessages![0].signature;
    return ethers.utils.joinSignature({
      r: `0x${sig.r!}`,
      v: 27 + sig.v!,
      s: `0x${sig.s}`,
    });
  }

  connect(provider: JsonRpcProvider): FireblocksSigner {
    return new FireblocksSigner(
      this.fireblocksApiClient,
      this.chain,
      provider,
      this.vaultAccountId
    );
  }
}
