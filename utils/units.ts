export const formatTokenAmount = (
  amount: number
): InstanceType<typeof ethers['BigNumber']> => {
  if (typeof amount !== 'number') {
    throw new TypeError(`Expected number but received ${typeof amount}`);
  }
  return hre.ethers.utils.parseUnits(amount.toString(), 18);
};

export const formatTokenString = (
  amount: string
): InstanceType<typeof ethers['BigNumber']> => {
  if (typeof amount !== 'string') {
    throw new TypeError(`Expected string but received ${typeof amount}`);
  }
  if (amount === '') {
    amount = '0';
  }
  return hre.ethers.utils.parseUnits(amount.toString(), 18);
};
