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
import { keccak256 } from 'ethers/lib/utils';
const logger = new Logger('Fireblocks signer');

export class FireblocksSigner extends Signer implements TypedDataSigner {
  readonly fireblocksApiClient!: FireblocksSDK;
  readonly chain!: Chain;
  readonly vaultAccountId!: string;
  readonly _bridge: EthersCustomBridge;

  constructor(
    fireblocksApiClient: FireblocksSDK,
    chain: Chain = Chain.POLYGON,
    provider: JsonRpcProvider,
    vaultAccountId?: string,
  ) {
    logger.checkNew(new.target, FireblocksSigner);
    super();
    defineReadOnly(this, 'fireblocksApiClient', fireblocksApiClient);
    defineReadOnly(this, 'chain', chain);
    defineReadOnly(this, 'vaultAccountId', vaultAccountId || "0");
    defineReadOnly(this, 'provider', provider);
    this._bridge = new EthersCustomBridge({
      fireblocksApiClient,
      vaultAccountId: vaultAccountId || "0",
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

  _fail(message: string, operation: string): Promise<any> {
    return Promise.resolve().then(() => {
      logger.throwError(message, Logger.errors.UNSUPPORTED_OPERATION, {
        operation: operation,
      });
    });
  }

  signMessage(message: Bytes | string): Promise<string> {
    return this._fail('FireblocksSigner cannot sign messages', 'signMessage');
  }

  async _populateTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<PopulatedTransaction> {
    const tx = await this.populateTransaction(transaction);
    return {
      chainId: tx.chainId || undefined,
      data: tx.data ? ethers.utils.hexlify(tx.data) : undefined,
      nonce: tx.nonce ? ethers.BigNumber.from(tx.nonce).toNumber() : undefined,
      to: tx.to || undefined,
      value: tx.value ? BigNumber.from(tx.value) : undefined,
    };
  }

  async _signTransaction(transaction: PopulatedTransaction): Promise<string> {
    console.log(transaction);
    // TODO: fireblocks.estimateFeeForTransaction(payload);
    const feeData = await this.provider?.getFeeData();
    const txInfo = await this._bridge.sendTransaction(
      {
        // type: 2,
        gasLimit: transaction.gasLimit || BigNumber.from(150000),
        gasPrice: feeData!.gasPrice || undefined,
        // maxFeePerGas: feeData?.maxFeePerGas || undefined,
        // maxPriorityFeePerGas: feeData?.maxPriorityFeePerGas || undefined,
        ...transaction,
      },
      'Created with ethersjs contract Signer'
    );
    await this._bridge.waitForTxHash(txInfo.id);
    const txDetail = await this.fireblocksApiClient.getTransactionById(
      txInfo.id
    );
    console.log(txDetail);
    return txDetail.txHash;
  }

  async _signRawTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    const tx = await ethers.utils.resolveProperties(transaction);
    const _gasLimit = await this.provider?.estimateGas(transaction);
    const feeData = await this.provider?.getFeeData();
    const baseTx: ethers.utils.UnsignedTransaction = {
      type: 2,
      chainId: tx.chainId || undefined,
      data: tx.data || undefined,
      gasLimit: tx.gasLimit || _gasLimit?.mul(2),
      maxFeePerGas: feeData?.maxFeePerGas || undefined,
      maxPriorityFeePerGas: feeData?.maxPriorityFeePerGas || undefined,
      nonce: tx.nonce ? ethers.BigNumber.from(tx.nonce).toNumber() : undefined,
      to: tx.to || undefined,
      value: tx.value || undefined,
    };
    const unsignedTx = ethers.utils.serializeTransaction(baseTx);
    const txInfo = await this._bridge.sendRawTransaction(
      keccak256(unsignedTx).substring(2),
      'Created with ethersjs raw Signer'
    );
    // This doesn't actually give back the hash for a raw tx but it
    // does tell us when the status has settled in fireblocks.
    await this._bridge.waitForTxHash(txInfo.id);
    const txDetail = await this.fireblocksApiClient.getTransactionById(
      txInfo.id
    );
    if (txDetail.status !== TransactionStatus.COMPLETED) {
      console.log(txDetail);
      throw new Error(`Transaction failed: ${JSON.stringify(txDetail)}`);
    }
    const sig = await txDetail.signedMessages![0].signature;
    const signedMessage = ethers.utils.serializeTransaction(baseTx, {
      v: ethers.BigNumber.from('0x' + sig.v).toNumber(),
      r: '0x' + sig.r,
      s: '0x' + sig.s,
    });
    return signedMessage;
  }

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
      tx = await this._signRawTransaction(transaction);
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
      const txResponse = await this.provider!.sendTransaction(tx);
      txHash = txResponse.hash;
    }

    console.log(`txHash: `, txHash);

    return {
      hash: txHash,
      confirmations: 0,
      from: await this.getAddress(),
      nonce: baseTx.nonce!,
      gasLimit: baseTx.gasLimit!,
      data: baseTx.data || '',
      value: baseTx.value || BigNumber.from(0),
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
