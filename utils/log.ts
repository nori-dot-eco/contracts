import chalk from 'chalk';

const { log: defaultLogger, table } = console;

export const trace = (...consoleArguments: unknown[]): void => {
  if (process.env.TRACE) {
    defaultLogger(...consoleArguments); // todo consider using ethers Logger https://docs.ethers.io/v5/api/utils/logger/#logging
  }
};

export const log = (...consoleArguments: unknown[]): void => {
  defaultLogger(...consoleArguments);
};

export const getLogger = ({
  hre,
  prefix,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  prefix?: string | undefined;
}): {
  info: typeof log;
  error: typeof log;
  success: typeof log;
  table: typeof table;
} => {
  const maybePrefix = typeof prefix === 'string' ? [prefix] : [];
  return {
    info: (...args: unknown[]) =>
      hre.log(chalk.bold.white(...maybePrefix, ...args)),
    error: (...args: unknown[]) => hre.log(chalk.red(...maybePrefix, ...args)),
    success: (...args: unknown[]) =>
      hre.log(chalk.bold.green(...maybePrefix, ...args)),
    table: (args: unknown, columns?: string[]): void => {
      table(args, columns);
    },
  };
};
