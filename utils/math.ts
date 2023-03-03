import type { BigNumber } from 'ethers';

import { Zero } from '../constants/units';

/** Calculates the sum of an array of bn.js BigNumbers */
export const sum = (numbers: BigNumber[]): BigNumber => {
  return numbers.reduce((total, removal) => total.add(removal), Zero);
};
