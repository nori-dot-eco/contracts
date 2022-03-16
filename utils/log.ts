export const trace = (...consoleArgs: unknown[]): void => {
  if (
    Boolean(process.env.TRACE) &&
    process.env.TRACE?.toLowerCase() !== 'false'
  ) {
    console.log(...consoleArgs);
  }
};

export const log = (...consoleArgs: unknown[]): void => {
  console.log(...consoleArgs);
};
