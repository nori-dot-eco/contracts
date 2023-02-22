import type { BigNumberish, Signer } from 'ethers';

export const depositNoriUSDC = async ({
  hre,
  contracts,
  to,
  amount,
  signer,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  contracts: RequiredKeys<Contracts, 'NoriUSDC'>;
  to: string;
  amount: BigNumberish;
  signer: Signer;
}): Promise<void> => {
  await contracts.NoriUSDC.connect(signer).transfer(to, amount);
  hre.trace(`NoriUSDC: Sent ${amount} NoriUSDC to ${to}`);
};

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
  await contracts.NORI.connect(hre.namedSigners.admin).transfer(to, amount);
  hre.trace(`NORI: Sent ${amount} NORI to ${to}`);
  await contracts.BridgedPolygonNORI.deposit(
    to,
    hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [amount])
  );
  hre.trace(
    `BridgedPolygonNORI: Deposited ${amount} NORI for BridgedPolygonNORI`
  );
  const bridgeTx = await contracts.NORI.connect(signer).transfer(
    hre.namedAccounts.mockPolygonBridge,
    amount
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
