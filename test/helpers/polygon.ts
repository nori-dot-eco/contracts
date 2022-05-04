import type { BigNumberish, Signer } from 'ethers';

import type { Contracts } from '@/utils/deploy';

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
  hre.trace('BridgedPolygonNORI: Granted DEPOSITOR_ROLE to admin'); // todo transaction wrapper for better automatic tracing
  await contracts.NORI.connect(hre.namedSigners.admin).send(to, amount, '0x');
  hre.trace(`NORI: Sent ${amount} NORI to ${to}`);
  await contracts.BridgedPolygonNORI.deposit(
    to,
    hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [amount])
  );
  hre.trace(
    `BridgedPolygonNORI: Deposited ${hre.namedSigners.admin} NORI for BridgedPolygonNORI`
  );
  const bridgeTx = await contracts.NORI.connect(signer).send(
    hre.namedAccounts.mockPolygonBridge,
    amount,
    '0x'
  );
  const bridgeTxResult = await bridgeTx.wait();
  hre.trace(
    `NORI: Sent ${amount} NORI to ${hre.namedAccounts.mockPolygonBridge} to mock bridging functionality. TX: ${bridgeTxResult.transactionHash}`
  );
  await contracts.BridgedPolygonNORI.renounceRole(
    DEPOSITOR_ROLE,
    hre.namedAccounts.admin
  );
  hre.trace('BridgedPolygonNORI: Renounced DEPOSITOR_ROLE from admin');
};
