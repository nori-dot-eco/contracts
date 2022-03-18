import moment from 'moment';

export const formatTokenAmount = (
  amount: number
): InstanceType<typeof ethers['BigNumber']> => {
  if (typeof amount !== 'number') {
    throw new Error(`Expected number but received ${typeof amount}`);
  }
  return hre.ethers.utils.parseUnits(amount.toString(), 18);
};

export const formatTokenString = (amount: string): string => {
  if (typeof amount !== 'string') {
    throw new Error(`Expected string but received ${typeof amount}`);
  }
  return hre.ethers.utils.parseUnits(amount.toString(), 18).toString();
};

export const formatEthereumTime = (date: string | number): number => {
  return moment(date).unix();
};
