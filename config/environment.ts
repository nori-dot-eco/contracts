import dotenvDefaults from 'dotenv-defaults';
import dotenvParseVariables from 'dotenv-parse-variables';

const defaults = dotenvDefaults.config();

if (defaults.error != null || defaults.parsed == null) throw defaults.error;

process.env = Object.fromEntries(
  Object.entries(
    dotenvParseVariables({
      ...defaults.parsed,
      ...process.env,
    } as any)
  ).map(([k, v]) => [k, (v as string)?.toLowerCase?.() === 'null' ? null : v])
) as typeof global.process.env;
