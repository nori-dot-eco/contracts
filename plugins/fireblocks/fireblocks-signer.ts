/* eslint-disable @typescript-eslint/dot-notation -- frequent FireblocksWeb3Provider private member access */
import type {
  Signer,
  TypedDataDomain,
  TypedDataField,
} from '@ethersproject/abstract-signer';
import type {
  TransactionRequest,
  TransactionResponse,
} from '@ethersproject/providers';
import { _TypedDataEncoder, toUtf8Bytes } from 'ethers/lib/utils';
import type { Deferrable } from '@ethersproject/properties';
import type { Bytes } from '@ethersproject/bytes';
import type { BigNumber } from 'ethers';
import { ethers } from 'ethers';
import { FireblocksSigner as HardhatFireblocksSigner } from '@fireblocks/hardhat-fireblocks/dist/src/provider';
import type {
  FireblocksProviderConfig,
  FireblocksWeb3Provider,
} from '@fireblocks/fireblocks-web3-provider';
import type { EIP1193Provider } from 'hardhat/types/provider';

export class FireblocksSigner
  extends HardhatFireblocksSigner
  implements Signer
{
  _isSigner = true;

  provider?: ethers.providers.Provider | undefined;

  private _jsonRpcSigner: ethers.providers.JsonRpcSigner;

  private _ethersWeb3Provider: ethers.providers.Web3Provider;

  private _defaultNote: string | undefined;

  constructor(
    provider: EIP1193Provider,
    fireblocksConfig: FireblocksProviderConfig
  ) {
    super(provider, fireblocksConfig);
    this._ethersWeb3Provider = new ethers.providers.Web3Provider(
      this['_fireblocksWeb3Provider'] as FireblocksWeb3Provider
    );
    this._defaultNote = fireblocksConfig.note;
    this._jsonRpcSigner = this._ethersWeb3Provider.getSigner();
  }

  connect(provider: ethers.providers.Provider): Signer {
    return this._jsonRpcSigner.connect(provider);
  }

  async getAddress(): Promise<string> {
    return this._jsonRpcSigner.getAddress();
  }

  setNote(memo: string): void {
    (this['_fireblocksWeb3Provider'] as FireblocksWeb3Provider)['note'] = memo;
  }

  restoreDefaultNote(): void {
    (this['_fireblocksWeb3Provider'] as FireblocksWeb3Provider)['note'] =
      this._defaultNote;
  }

  getBalance(
    blockTag?: ethers.providers.BlockTag | undefined
  ): Promise<BigNumber> {
    return this._jsonRpcSigner.getBalance(blockTag);
  }

  getTransactionCount(
    blockTag?: ethers.providers.BlockTag | undefined
  ): Promise<number> {
    return this._jsonRpcSigner.getTransactionCount(blockTag);
  }

  estimateGas(transaction: Deferrable<TransactionRequest>): Promise<BigNumber> {
    return this._jsonRpcSigner.estimateGas(transaction);
  }

  call(
    transaction: Deferrable<TransactionRequest>,
    blockTag?: ethers.providers.BlockTag | undefined
  ): Promise<string> {
    return this._jsonRpcSigner.call(transaction, blockTag);
  }

  sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    return this.sendTransaction(transaction);
  }

  getChainId(): Promise<number> {
    return this._jsonRpcSigner.getChainId();
  }

  getGasPrice(): Promise<BigNumber> {
    return this._jsonRpcSigner.getGasPrice();
  }

  getFeeData(): Promise<ethers.providers.FeeData> {
    return this._jsonRpcSigner.getFeeData();
  }

  resolveName(name: string): Promise<string> {
    return this._jsonRpcSigner.resolveName(name);
  }

  checkTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Deferrable<TransactionRequest> {
    return this._jsonRpcSigner.checkTransaction(transaction);
  }

  populateTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionRequest> {
    return this._jsonRpcSigner.populateTransaction(transaction);
  }

  _checkProvider(operation?: string | undefined): void {
    return this._jsonRpcSigner._checkProvider(operation);
  }

  async signMessage(message: Bytes | string): Promise<string> {
    const data = typeof message === 'string' ? toUtf8Bytes(message) : message;
    return this._jsonRpcSigner.signMessage(data);
  }

  signTransaction(
    _transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    throw new Error('signing transactions is unsupported by JsonRpcSigner');
  }

  async _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, any>
  ): Promise<string> {
    return this._jsonRpcSigner._signTypedData(domain, types, value);
  }
}
