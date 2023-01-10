import type { UntypedLog } from './untyped-log';

export type ContractEvents<TContractEventMap> = {
  [TKey in keyof TContractEventMap]: UntypedLog & TContractEventMap[TKey];
}[keyof TContractEventMap];
