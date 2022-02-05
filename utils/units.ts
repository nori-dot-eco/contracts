import { ethers } from '@/utils/hre';

export const formatTokenAmount = (
  amount: number
): InstanceType<typeof ethers['BigNumber']> => {
  if (typeof amount !== 'number') {
    throw new Error(`Expected number but received ${typeof amount}`);
  }
  return ethers.utils.parseUnits(amount.toString(), 18);
};
