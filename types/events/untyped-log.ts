import type { LogDescription } from 'ethers/lib/utils';

export type UntypedLog = Omit<LogDescription, 'args' | 'name'>;
