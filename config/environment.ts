import dotenvDefaults from 'dotenv-defaults';
import dotenvParseVariables from 'dotenv-parse-variables';

const defaults = dotenvDefaults.config();

if (!Boolean(defaults.error) || !Boolean(defaults.parsed)) throw defaults.error;

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
