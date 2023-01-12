import { ethers } from 'ethers';

import type {
  ContractEventInterface,
  ContractWithEvents,
} from '../types/events';

/**
 * Take a contract instance and a transaction receipt, and
 *
 * @param args.contractInstance The contract instance to parse logs from.
 * @param args.txReceipt The transaction receipt to parse logs from.
 * @returns An array of strongly typed logs with type support based on `args.contractInstance`. Note that all events in
 * the logs array which use `args.values` in their event signature will have `args.values` remapped to `args.vals` due
 * to a {@link https://github.com/ethers-io/ethers.js/discussions/3542#discussioncomment-4214097| limitation} of
 * JavaScript.
 */
export const parseTransactionLogs = <TContract extends ContractWithEvents>({
  contractInstance,
  txReceipt,
}: {
  contractInstance: TContract;
  txReceipt: ethers.providers.TransactionReceipt;
}): ContractEventInterface<TContract>[] => {
  const logs: ContractEventInterface<TContract>[] = txReceipt.logs
    .filter((log) => log.address === contractInstance.address)
    .map((log) => {
      const interfaceFragments = contractInstance.interface.format();
      const contractInterface = [interfaceFragments].flat(2).map(
        (fragment) => fragment.replace('values', 'vals') // remap `values` to `vals` due to a limitation of JavaScript
      );
      const parsedLog = new ethers.utils.Interface(contractInterface).parseLog(
        log
      ) as ContractEventInterface<TContract>;
      return parsedLog;
    });
  return logs;
};
