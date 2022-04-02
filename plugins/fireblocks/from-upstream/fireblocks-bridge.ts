import { PopulatedTransaction } from "@ethersproject/contracts";
import { Deferrable } from "@ethersproject/properties";
import {
  CreateTransactionResponse,
  PeerType,
  TransactionArguments,
  TransactionOperation,
} from "fireblocks-sdk";
import { formatEther, formatUnits, parseEther } from 'ethers/lib/utils';
import { BaseBridge } from './base-bridge';


export class EthersCustomBridge extends BaseBridge {
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
      gasPrice: formatUnits(transaction?.gasPrice?.toString() || "0", 'gwei'),
      gasLimit: formatUnits(transaction?.gasLimit?.toString() || "0", 'wei'),
      destination: {
        type: this.params.externalWalletId
          ? PeerType.EXTERNAL_WALLET
          : PeerType.ONE_TIME_ADDRESS,
        id: this.params.externalWalletId,
        oneTimeAddress: {
          address: <string>transaction.to,
        },
      },
      note: txNote || "",
      amount: formatEther(transaction.value?.toString() || "0"),
      extraParameters: {
        contractCallData: transaction.data,
      },
    };
    console.log(txArguments);
    return this.params.fireblocksApiClient.createTransaction(txArguments);
  }

  async sendRawTransaction(
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
      note: txNote || "",
      extraParameters: {
        rawMessageData: {
            messages: [{
                content: transaction
            }]
        }
      },
    };
    return this.params.fireblocksApiClient.createTransaction(txArguments);
  }
}
