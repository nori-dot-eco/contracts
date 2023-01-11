import { ethers } from 'ethers';

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
    .map((log) => {
      const interfaceFragments = contractInstance.interface.format();
      const contractInterface = [interfaceFragments]
        .flat(2)
        .map((fragment) => fragment.replace('values', 'vals'));
      const parsedLog = new ethers.utils.Interface(contractInterface).parseLog(
        log
      ) as ContractEventInterfaceFromType<T>;
      return parsedLog;
    });
  return logs;
};
