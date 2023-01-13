import { ethers } from 'ethers';

import type {
  NamedLogs,
  ContractEventNames,
  ContractWithEvents,
} from '../types/events';

/**
 * Parse and strongly type event logs from a transaction receipt using a contract instance and an optional filter.
 *
 * @param args.contractInstance The contract instance to parse logs from.
 * @param args.txReceipt The transaction receipt to parse logs from.
 * @param [args.filter=] An optional filter to filter logs by. Filters are names of events in the contract (e.g.,
 * `ReceiveRemovalBatch` can be used to filter the events by passing this function `['ReceiveRemovalBatch']` as the
 * `args.filter` argument).
 * @returns An array of strongly typed logs with type support based on `args.contractInstance`. Note that all events in
 * the logs array which use `args.values` in their event signature will have `args.values` remapped to `args.vals` due
 * to a {@link https://github.com/ethers-io/ethers.js/discussions/3542#discussioncomment-4214097| limitation} of
 * JavaScript.
 * @example
 * <caption>Parse "ReceiveRemovalBatch" logs for a tx using the Certificate contract</caption>
 * ```ts
 * const logs = parseTransactionLogs({
 *   contractInstance: certificate,
 *   txReceipt, // TransactionReceipt object
 *   filter: ['ReceiveRemovalBatch'],
 * });
 * logs.name; // 'ReceiveRemovalBatch'
 * logs.args.recipient; // '0x...'
 * logs.args.FAKE; // Error: Property 'FAKE' does not exist on type 'ReceiveRemovalBatchEvent["args"]'
 * ```
 */
export const parseTransactionLogs = <
  TContract extends ContractWithEvents,
  TEventNames extends ContractEventNames<TContract>[]
>({
  contractInstance,
  txReceipt,
  eventNames,
}: {
  contractInstance: TContract;
  txReceipt: ethers.providers.TransactionReceipt;
  eventNames?: TEventNames;
}): NamedLogs<TContract, TEventNames> => {
  const interfaceFragments = [contractInstance.interface.format()].flat().map(
    (fragment) => fragment.replace('values', 'vals') // remap `values` to `vals` due to a limitation of JavaScript
  );
  const iface = new ethers.utils.Interface(interfaceFragments);
  const shouldFilterLogs = Array.isArray(eventNames) && eventNames.length > 0;
  const logs = txReceipt.logs
    .filter((log) => {
      return log.address === contractInstance.address;
    })
    .reduce<NamedLogs<TContract, TEventNames>>((acc, log) => {
      const parsedLog = iface.parseLog(log) as typeof acc[number];
      if (!('name' in parsedLog)) {
        throw new Error('Something went wrong when parsing logs!');
      }
      const shouldReturnEvent: boolean =
        (shouldFilterLogs && eventNames.includes(parsedLog.name)) ||
        !shouldFilterLogs;
      return [...acc, ...(shouldReturnEvent ? [parsedLog] : [])];
    }, []);

  return logs;
};
