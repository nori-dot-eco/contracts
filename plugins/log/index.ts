/* eslint-disable no-param-reassign -- hre is intended to be configured via assignment in this file */
import { extendEnvironment } from 'hardhat/config';
import { lazyFunction, lazyObject } from 'hardhat/plugins';
import chalk from 'chalk';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { TracerEnv } from 'hardhat-tracer';

import './type-extensions';

type DebugOptions = Partial<TracerEnv> & { verbose: boolean };

/** Wraps a function call in hardhat-tracer */
export const debug = async <T extends (...args: []) => any>({
  functionToDebug,
  hre,
  options,
}: {
  hre: HardhatRuntimeEnvironment;
  functionToDebug: T;
  options: DebugOptions;
}): Promise<Awaited<ReturnType<T>>> => {
  const tracerConfig = hre.tracer;
  const { enabled, verbose, calls, logs, sstores, sloads, gasCost } =
    options ?? {};
  hre.tracer.enabled = Boolean(enabled) || verbose;
  hre.tracer.calls = Boolean(calls) || verbose;
  hre.tracer.logs = Boolean(logs) || verbose;
  hre.tracer.sstores = Boolean(sstores) || verbose;
  hre.tracer.sloads = Boolean(sloads) || verbose;
  hre.tracer.gasCost = Boolean(gasCost) || verbose;
  const result = await functionToDebug();
  hre.tracer.enabled = false;
  hre.tracer = tracerConfig;
  return result;
};

const { log: defaultLogger, table } = console;

export const trace = (...consoleArguments: unknown[]): void => {
  if (process.env.TRACE) {
    defaultLogger(...consoleArguments); // todo consider using ethers Logger https://docs.ethers.io/v5/api/utils/logger/#logging
  }
};

export const log = (...consoleArguments: unknown[]): void => {
  defaultLogger(...consoleArguments);
};

/**
 * Returns a logger with an optional prefix for use with the hardhat runtime environment.
 *
 * @todo Use debug package so we can use DEBUG=hardhat* to log all hardhat packages with one env var
 */
export const getLogger = ({
  hre,
  prefix,
}: {
  hre: HardhatRuntimeEnvironment;
  prefix?: string | undefined;
}): {
  info: typeof log;
  error: typeof log;
  warn: typeof log;
  success: typeof log;
  table: typeof table;
} => {
  const maybePrefix = typeof prefix === 'string' ? [prefix] : [];
  const logger = hre.log;
  return {
    info: (...args: unknown[]) =>
      logger(chalk.bold.white(...maybePrefix, ...args)),
    error: (...args: unknown[]) => logger(chalk.red(...maybePrefix, ...args)),
    warn: (...args: unknown[]) =>
      logger(chalk.yellow('⚠️  ', ...maybePrefix, ...args)),
    success: (...args: unknown[]) =>
      logger(chalk.bold.green(...maybePrefix, ...args)),
    table: (args: unknown, columns?: string[]): void => {
      table(args, columns);
    },
  };
};

extendEnvironment((hre) => {
  hre.log = lazyFunction(() => log); // todo deprecate
  hre.trace = lazyFunction(() => trace); // todo deprecate
  hre.debug = lazyFunction(() => debug); // todo deprecate
  hre.getLogger = lazyFunction(() => getLogger); // todo deprecate
  hre.logger = lazyObject(() => getLogger({ hre }));
});
