import type { ethers } from 'ethers';

import type {
  ContractEventInterfaceFromType,
  ContractsWithEvents,
} from '../types/events';

export const parseTransactionLogs = <
  T extends ContractsWithEvents[keyof ContractsWithEvents]
>({
  contractInstance,
  txReceipt,
}: {
  contractInstance: T;
  txReceipt: ethers.providers.TransactionReceipt;
}): ContractEventInterfaceFromType<T>[] => {
  const logs: ContractEventInterfaceFromType<T>[] = txReceipt.logs
    .filter((log) => log.address === contractInstance.address)
    .map(
      (log) =>
        contractInstance.interface.parseLog(
          log
        ) as unknown as ContractEventInterfaceFromType<T>
    );
  return logs;
};
