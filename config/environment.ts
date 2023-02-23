import dotenvDefaults from 'dotenv-defaults';
import dotenvParseVariables from 'dotenv-parse-variables';

/**
 * Load environment variables from .env files and `process.env`.
 *
 * @todo set DEBUG=hardhat* when verbose/trace/log is true
 */
const loadEnvironment = (): void => {
  const defaults = dotenvDefaults.config();

  if (defaults.error !== undefined || defaults.parsed === undefined) {
    throw defaults.error;
  }

  process.env = Object.fromEntries(
    Object.entries(
      dotenvParseVariables({
        ...defaults.parsed,
        ...process.env,
      } as dotenvParseVariables.Parsed)
    ).map(([k, v]) => [
      k,
      (v as string)?.toLowerCase?.() === 'null'
        ? null // eslint-disable-line unicorn/no-null -- null is a valid value for our env
        : v,
    ])
  ) as typeof global.process.env;
};

loadEnvironment();
