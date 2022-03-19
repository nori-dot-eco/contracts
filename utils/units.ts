import moment from 'moment';

export const formatTokenAmount = (
  amount: number
): InstanceType<typeof ethers['BigNumber']> => {
  if (typeof amount !== 'number') {
    throw new Error(`Expected number but received ${typeof amount}`);
  }
  return hre.ethers.utils.parseUnits(amount.toString(), 18);
};

export const formatTokenString = (
  amount: string
): InstanceType<typeof ethers['BigNumber']> => {
  if (typeof amount !== 'string') {
    throw new Error(`Expected string but received ${typeof amount}`);
  }
  return hre.ethers.utils.parseUnits(amount.toString(), 18);
};

export const utcToEvmTime = (date: string | number | moment.Moment): number => {
  return moment(date).unix();
};

export const evmTimeToUtc = (date: number): moment.Moment => {
  return moment(moment.unix(date));
};
