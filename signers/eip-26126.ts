import type { Provider } from '@ethersproject/providers';
import { splitSignature } from 'ethers/lib/utils';
import type { BigNumber, Signature } from 'ethers';
import { Wallet } from 'ethers';
import type { Address } from 'hardhat-deploy/types';
import { constants } from 'ethers/lib';

import type { ERC20PermitUpgradeable } from '@/typechain-types';

interface PermitArgs {
  owner: Address;
  chainId: number;
  nonce: BigNumber;
  name: string;
  version?: string;
  verifyingContract: ERC20PermitUpgradeable;
  spender: Address;
  value: BigNumber;
  deadline?: BigNumber;
}

export class Eip2612Signer extends Wallet {
  static eip712Domain = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  connect(provider: Provider): Eip2612Signer {
    return new Eip2612Signer(this.connect(provider));
  }

  async permit({
    verifyingContract,
    spender,
    value,
    version = '1',
    deadline = constants.MaxUint256,
  }: Omit<
    PermitArgs,
    'chainId' | 'name' | 'nonce' | 'owner'
  >): Promise<Signature> {
    const [owner, chainId, name, nonce] = await Promise.all([
      this.getAddress(),
      this.getChainId(),
      verifyingContract.name(),
      verifyingContract.nonces(this.address),
    ]);
    const signature = await this._signPermitData({
      owner,
      chainId,
      nonce,
      name,
      version,
      verifyingContract,
      spender,
      value,
      deadline,
    });
    return splitSignature(signature);
  }

  private async _signPermitData({
    owner,
    chainId,
    nonce,
    name,
    version,
    verifyingContract,
    spender,
    value,
    deadline,
  }: PermitArgs): ReturnType<typeof this._signTypedData> {
    return this._signTypedData(
      { name, version, chainId, verifyingContract: verifyingContract.address },
      Eip2612Signer.eip712Domain,
      { owner, spender, value, nonce, deadline }
    );
  }
}
