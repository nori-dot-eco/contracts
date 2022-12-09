import chalk from 'chalk';

const { log: defaultLogger } = console;

export const trace = (...consoleArguments: unknown[]): void => {
  if (process.env.TRACE) {
    defaultLogger(...consoleArguments); // todo consider using ethers Logger https://docs.ethers.io/v5/api/utils/logger/#logging
  }
};

export const log = (...consoleArguments: unknown[]): void => {
  defaultLogger(...consoleArguments);
};

export const getLogger = ({
  prefix,
}: {
  prefix?: string | undefined;
} = {}): {
  info: chalk.ChalkFunction;
  error: chalk.ChalkFunction;
  success: chalk.ChalkFunction;
} => {
  const maybePrefix = typeof prefix === 'string' ? [prefix] : [];
  return {
    info: (...args: unknown[]) => chalk.bold.white(...maybePrefix, ...args),
    error: (...args: unknown[]) => chalk.red(...maybePrefix, ...args),
    success: (...args: unknown[]) => chalk.bold.green(...maybePrefix, ...args),
  };
};
