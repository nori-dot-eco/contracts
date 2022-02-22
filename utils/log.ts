export const log = (...consoleArgs: unknown[]): void => {
  if (process.env.LOG && process.env.LOG?.toLowerCase() !== 'false')
    console.log(...consoleArgs);
};
