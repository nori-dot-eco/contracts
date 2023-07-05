import type { PopulatedTransaction } from '@ethersproject/contracts';
import type { Deferrable } from '@ethersproject/properties';
import { PeerType, TransactionOperation } from 'fireblocks-sdk';
import type {
  CreateTransactionResponse,
  TransactionArguments,
} from 'fireblocks-sdk';
import { formatEther, formatUnits } from 'ethers/lib/utils';
import { EthersBridge } from 'fireblocks-defi-sdk';

export class EthersCustomBridge extends EthersBridge {
  async sendTransaction(
    transaction: Deferrable<PopulatedTransaction>,
    txNote?: string
  ): Promise<CreateTransactionResponse> {
    const txArguments: TransactionArguments = {
      operation: transaction.data
        ? TransactionOperation.CONTRACT_CALL
        : TransactionOperation.TRANSFER,
      assetId: this.assetId,
      source: {
        type: PeerType.VAULT_ACCOUNT,
        id: this.params.vaultAccountId,
      },
      gasPrice:
        transaction.gasPrice == undefined
          ? undefined
          : formatUnits(transaction?.gasPrice?.toString() || '0', 'gwei'),
      maxFee:
        transaction.maxFeePerGas == undefined
          ? undefined
          : formatUnits(transaction.maxFeePerGas!.toString() || '0', 'gwei'),
      priorityFee:
        transaction.maxPriorityFeePerGas == undefined
          ? undefined
          : formatUnits(
              transaction.maxPriorityFeePerGas!.toString() || '0',
              'gwei'
            ),
      gasLimit: formatUnits(transaction?.gasLimit?.toString() || '0', 'wei'),
      destination: {
        type: this.params.externalWalletId
          ? PeerType.EXTERNAL_WALLET
          : PeerType.ONE_TIME_ADDRESS,
        id: this.params.externalWalletId,
        oneTimeAddress: {
          address: <string>transaction.to,
        },
      },
      note: txNote || '',
      amount: formatEther(transaction.value?.toString() || '0'),
      extraParameters: {
        contractCallData: transaction.data,
      },
    };
    return this.params.fireblocksApiClient.createTransaction(txArguments);
  }

  async sendRawSigningRequest(
    transaction: string,
    txNote?: string
  ): Promise<CreateTransactionResponse> {
    const txArguments: TransactionArguments = {
      operation: TransactionOperation.RAW,
      assetId: this.assetId,
      source: {
        type: PeerType.VAULT_ACCOUNT,
        id: this.params.vaultAccountId,
      },
      note: txNote || '',
      extraParameters: {
        rawMessageData: {
          messages: [
            {
              content: transaction,
            },
          ],
        },
      },
    };
    return this.params.fireblocksApiClient.createTransaction(txArguments);
  }

  async sendTypedSigningRequest(
    payload: any,
    txNote?: string
  ): Promise<CreateTransactionResponse> {
    const txArguments: TransactionArguments = {
      operation: TransactionOperation.TYPED_MESSAGE,
      assetId: this.assetId,
      source: {
        type: PeerType.VAULT_ACCOUNT,
        id: this.params.vaultAccountId,
      },
      note: txNote || '',
      extraParameters: {
        rawMessageData: {
          messages: [
            {
              content: payload,
              index: 0,
              type: 'EIP712',
            },
          ],
        },
      },
    };
    return this.params.fireblocksApiClient.createTransaction(txArguments);
  }
}
