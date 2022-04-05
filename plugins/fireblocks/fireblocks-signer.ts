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
import { keccak256, UnsignedTransaction } from 'ethers/lib/utils';
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
    const addresses = await this.fireblocksApiClient.getDepositAddresses(
      this.vaultAccountId,
      this._bridge.assetId
    );
    return ethers.utils.getAddress(addresses[0].address);
  }

  setNextTransactionMemo(memo: string): void {
    this.memo = memo;
  }

  _fail(message: string, operation: string): Promise<any> {
    return Promise.resolve().then(() => {
      log.throwError(message, Logger.errors.UNSUPPORTED_OPERATION, {
        operation: operation,
      });
    });
  }

  signMessage(message: Bytes | string): Promise<string> {
    return this._fail('FireblocksSigner cannot sign messages', 'signMessage');
  }

  async _populateTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<UnsignedTransaction> {
    const feeData = await this.provider?.getFeeData();
    const tx = await this.populateTransaction({
      type: 2,
      gasLimit:
        transaction.gasLimit !== undefined
          ? BigNumber.from(await transaction.gasLimit).mul(2)
          : BigNumber.from(15000000),
      // gasPrice: feeData!.gasPrice || undefined,
      maxFeePerGas:
        transaction.maxFeePerGas !== undefined
          ? BigNumber.from(transaction.maxFeePerGas)
          : feeData?.maxFeePerGas || undefined,
      maxPriorityFeePerGas:
        transaction.maxPriorityFeePerGas !== undefined
          ? BigNumber.from(transaction.maxPriorityFeePerGas)
          : feeData?.maxPriorityFeePerGas || undefined,
      ...transaction,
    });
    console.log(
      `Signing Request: ${JSON.stringify({
        nonce: tx.nonce,
        gasLimit: tx.gasLimit?.toString(),
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
      `Contract call: ${this.memo}`
    );
    await this._bridge.waitForTxHash(txInfo.id);
    const txDetail = await this.fireblocksApiClient.getTransactionById(
      txInfo.id
    );
    log.debug(txDetail);
    return txDetail.txHash;
  }

  async _signRawTransaction(transaction: UnsignedTransaction): Promise<string> {
    const baseTx: ethers.utils.UnsignedTransaction = {
      type: 2,
      chainId: transaction.chainId,
      data: ethers.utils.hexlify(transaction.data!),
      gasLimit: transaction.gasLimit,
      maxFeePerGas: transaction.maxFeePerGas,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
      nonce: transaction.nonce,
      // to: transaction.to || undefined,
      value: transaction.value,
    };
    const unsignedTx = ethers.utils.serializeTransaction(baseTx);
    const txInfo = await this._bridge.sendRawTransaction(
      keccak256(unsignedTx).substring(2),
      `Raw signing request: ${this.memo}`
    );
    this.memo = '';
    // This doesn't actually give back the hash for a raw tx but it
    // does tell us when the status has settled in fireblocks.
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
    const baseTx = await this._populateTransaction(transaction);
    let tx;
    if (baseTx.to) {
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
    const baseTx = await this._populateTransaction(transaction);
    let txHash: string;
    if (baseTx.to) {
      // looks like a contract interaction
      txHash = await this._signTransaction(baseTx);
    } else {
      // looks like a deploy
      const tx = await this._signRawTransaction(baseTx);
      try {
      const txResponse = await this.provider!.sendTransaction(tx);
      txHash = txResponse.hash;
      } catch (e) {
        console.log(`Error forwarding signed raw txn to provider (type: ${typeof e})`);
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
