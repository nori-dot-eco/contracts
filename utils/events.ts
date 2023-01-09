import type { ethers } from 'ethers';

import type { ContractEventInterfaceFromType } from '@/types/events';

export const parseTransactionLogs = ({
  contractInstance,
  txReceipt,
}: {
  contractInstance: Exclude<Contracts[keyof Contracts], undefined>;
  txReceipt: ethers.providers.TransactionReceipt;
}): ContractEventInterfaceFromType<typeof contractInstance>[] => {
  const logs: ContractEventInterfaceFromType<typeof contractInstance>[] =
    txReceipt.logs
      .filter((log) => log.address === contractInstance.address)
      .map(
        (log) =>
          contractInstance.interface.parseLog(
            log
          ) as unknown as ContractEventInterfaceFromType<
            typeof contractInstance // todo test real event to make sure types are correct
          >
      );
  return logs;
};
