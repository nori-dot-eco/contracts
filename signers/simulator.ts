import type {
  TransactionRequest,
  TransactionResponse,
  Provider,
} from '@ethersproject/providers';
import type { Deferrable } from 'ethers/lib/utils';
import type { Bytes } from 'ethers';
import { Signer } from 'ethers';
import axios from 'axios';

export class TenderlySimulationSigner extends Signer {
  readonly signer: Signer;

  readonly provider: Provider;

  constructor(signer: Signer) {
    super();
    this.signer = signer;
    this.provider = signer.provider!;
  }

  connect(provider: Provider): TenderlySimulationSigner {
    return new TenderlySimulationSigner(this.signer.connect(provider));
  }

  signMessage(message: Bytes | string): Promise<string> {
    return this.signer.signMessage(message);
  }

  public async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    return {
      simulation: await this._simulateTx(transaction),
      wait: () => {},
    } as any;
  }

  public async getAddress(): Promise<string> {
    return this.signer.getAddress();
  }

  public async signTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    return this.signer.signTransaction(transaction);
  }

  async simulateTx(transaction: Deferrable<TransactionRequest>): Promise<void> {
    await this._simulateTx(transaction);
  }

  async _simulateTx(
    transaction: Deferrable<TransactionRequest>
  ): ReturnType<typeof axios.post> {
    const apiURL = `https://api.tenderly.co/api/v1/account/me/project/nori/simulate`;
    const body = {
      ...transaction,
      network_id: (await this.provider.getNetwork()).chainId.toString(), // todo
      input: transaction.data,
      save_if_fails: true,
    };
    const headers = {
      headers: {
        'content-type': 'application/JSON',
        'X-Access-Key': process.env.TENDERLY_ACCESS_KEY as string,
      },
    };
    const resp = await axios.post(apiURL, body, headers);
    return resp;
  }
}
