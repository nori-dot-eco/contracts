import type { ethers } from 'ethers';

export const parseTransactionLogs = ({
  contractInstance,
  txReceipt,
}: {
  contractInstance: ethers.Contract;
  txReceipt: ethers.providers.TransactionReceipt;
}): ethers.utils.LogDescription[] => {
  return txReceipt.logs
    .filter((log) => log.address === contractInstance.address)
    .map((log) => contractInstance.interface.parseLog(log));
};
