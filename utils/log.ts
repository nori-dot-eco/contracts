export const trace = (...consoleArguments: unknown[]): void => {
  if (process.env.TRACE) {
    console.log(...consoleArguments); // todo consider using ethers Logger https://docs.ethers.io/v5/api/utils/logger/#logging
  }
};

export const log = (...consoleArguments: unknown[]): void => {
  console.log(...consoleArguments);
};
