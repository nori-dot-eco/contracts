export const trace = (...consoleArgs: unknown[]): void => {
  if (process.env.TRACE) {
    console.log(...consoleArgs); // todo consider using ethers Logger https://docs.ethers.io/v5/api/utils/logger/#logging
  }
};

export const log = (...consoleArgs: unknown[]): void => {
  console.log(...consoleArgs);
};
