import type { BigNumberish, Signer } from 'ethers';

import type { Contracts } from '@/utils/contracts';

export const mockDepositNoriToPolygon = async ({
  hre,
  contracts,
  to,
  amount,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: RequiredKeys<Contracts, 'BridgedPolygonNORI' | 'NORI'>;
  to: string;
  amount: BigNumberish;
  signer: Signer;
}): Promise<void> => {
  const DEPOSITOR_ROLE = await contracts.BridgedPolygonNORI.DEPOSITOR_ROLE();
  await contracts.BridgedPolygonNORI.grantRole(
    DEPOSITOR_ROLE,
    hre.namedAccounts.admin
  );
  await contracts.NORI.connect(hre.namedSigners.admin).send(to, amount, '0x');
  await contracts.BridgedPolygonNORI.deposit(
    to,
    hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [amount])
  );
  await contracts.NORI.connect(signer).send(
    hre.namedAccounts.mockPolygonBridge,
    amount,
    '0x'
  );
  await contracts.BridgedPolygonNORI.renounceRole(
    DEPOSITOR_ROLE,
    hre.namedAccounts.admin
  );
};
