import {
  Signer,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner,
} from '@ethersproject/abstract-signer';
import {
  JsonRpcProvider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from '@ethersproject/providers';
import { Logger } from '@ethersproject/logger';
import { Deferrable, defineReadOnly } from '@ethersproject/properties';
import { Bytes } from '@ethersproject/bytes';
import { BigNumber, ethers, PopulatedTransaction } from 'ethers';
import { TransactionStatus, FireblocksSDK } from 'fireblocks-sdk';
import { EthersCustomBridge } from './from-upstream/fireblocks-bridge';
import { Chain } from './from-upstream/chain';
import {
  keccak256,
  toUtf8Bytes,
  UnsignedTransaction,
} from 'ethers/lib/utils';
import { getGasPriceSettings } from '../../utils/gas';
const log = new Logger('fireblocks signer');

export class FireblocksSigner extends Signer implements TypedDataSigner {
  readonly fireblocksApiClient!: FireblocksSDK;
  readonly chain!: Chain;
  readonly vaultAccountId!: string;
  readonly _bridge: EthersCustomBridge;
  memo: string = '';

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
    } catch (e) {
      console.log(
        `Fireblocks signer: Failed to load addresses for vault ${this.vaultAccountId} and asset ${this._bridge.assetId}`
      );
      throw e;
    }
  }

  setNextTransactionMemo(memo: string): void {
    this.memo = memo;
  }

  async _fail(message: string, operation: string): Promise<any> {
    log.throwError(message, Logger.errors.UNSUPPORTED_OPERATION, {
      operation: operation,
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
    const txInfo = await this._bridge.sendRawTransaction(
      keccak256(message).substring(2),
      `Message signing request: ${this.memo}`
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
    transaction: Deferrable<TransactionRequest>,
    type: number = 2
  ): Promise<UnsignedTransaction> {
    const feeData = getGasPriceSettings(this._bridge.getChainId());
    let gasEstimate;
    try {
      gasEstimate = await this.provider?.estimateGas(transaction);
    } catch (e: any) {
      console.log('Error estimating gas', e.code);
      gasEstimate = BigNumber.from(3000000); // 3M fallback (dangerous, improve this!)
    }
    const gasLimit =
      transaction.gasLimit !== undefined
        ? BigNumber.from(await transaction.gasLimit)
        : gasEstimate;
    const maxPriority =
      transaction.maxPriorityFeePerGas !== undefined
        ? ethers.utils.parseUnits(
            `${transaction.maxPriorityFeePerGas!}`,
            'gwei'
          )
        : ethers.utils.parseUnits(`${feeData?.maxPriorityFeePerGas}`, 'gwei') ||
          undefined;
    const maxFee =
      transaction.maxFeePerGas !== undefined
        ? ethers.utils.parseUnits(`${await transaction.maxFeePerGas!}`, 'gwei')
        : ethers.utils.parseUnits(`${feeData?.maxFeePerGas!}`, 'gwei') ||
          undefined;
    const tx = await this.populateTransaction({
      type,
      ...transaction,
      gasLimit,
      ...(type === 2 && {
        maxFeePerGas: maxFee,
        maxPriorityFeePerGas: maxPriority,
      }),
      ...(type !== 2 && {
        gasPrice: maxFee!.add(maxPriority!),
      }),
    });
    console.log(
      `Signing Request: ${JSON.stringify({
        nonce: tx.nonce,
        type: tx.type,
        to: tx.to,
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        maxFeePerGas: tx.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
      })}`
    );
    return {
      ...tx,
      chainId: tx.chainId || undefined,
      data: tx.data ? ethers.utils.hexlify(tx.data) : undefined,
      nonce:
        tx.nonce !== undefined
          ? ethers.BigNumber.from(tx.nonce).toNumber()
          : undefined,
      to: tx.to || undefined,
      value: tx.value ? BigNumber.from(tx.value) : undefined,
    };
  }

  async _signTransaction(transaction: UnsignedTransaction): Promise<string> {
    const txInfo = await this._bridge.sendTransaction(
      transaction as PopulatedTransaction,
      `${this.memo}`
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
    const txInfo = await this._bridge.sendRawTransaction(
      keccak256(unsignedTx).substring(2),
      `Raw transaction signing request: ${this.memo}`
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
      v: ethers.BigNumber.from('0x' + sig.v).toNumber(),
      r: '0x' + sig.r,
      s: '0x' + sig.s,
    });
    return signedMessage;
  }

  // TODO: untested
  async signTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    let baseTx;
    let tx;
    if (transaction.to) {
      // looks like a contract interaction
      baseTx = await this._populateTransaction(transaction, 0);
      tx = await this._signTransaction(baseTx);
    } else {
      // looks like a deploy
      baseTx = await this._populateTransaction(transaction, 2);
      tx = await this._signRawTransaction(baseTx);
    }
    return tx;
  }

  async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    this._checkProvider('sendTransaction');
    let txHash: string;
    let baseTx: UnsignedTransaction;
    if (transaction.to) {
      // looks like a contract interaction
      baseTx = await this._populateTransaction(transaction, 0);
      txHash = await this._signTransaction(baseTx);
    } else {
      // looks like a deploy
      baseTx = await this._populateTransaction(transaction, 2);
      const tx = await this._signRawTransaction(baseTx);
      try {
        console.log(`Submitting signed transaction to the network`);
        const txResponse = await this.provider!.sendTransaction(tx);
        txHash = txResponse.hash;
      } catch (e) {
        console.log(
          `Error forwarding signed raw txn to provider (type: ${typeof e})`
        );
        try {
          const body = JSON.parse((<any>e).body);
          console.log(`Error message: ${body.message}`);
        } catch (e2) {
          console.log('cannot parse error');
        }
        throw e;
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
          : BigNumber.from(0),
      chainId: await this.getChainId(),
      wait: async (): Promise<TransactionReceipt> =>
        this.provider!.waitForTransaction(txHash),
    };
  }

  _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    return this._fail(
      'FireblocksSigner cannot sign typed data',
      'signTypedData'
    );
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
