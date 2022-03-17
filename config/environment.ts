import dotenvParseVariables from 'dotenv-parse-variables';
import dotenvDefaults from 'dotenv-defaults';
import dotenv from 'dotenv';

const env = dotenv.config();
const defaults = dotenvDefaults.config();

if (env.error != null || env.parsed == null) throw env.error;

process.env = {
  ...defaults,
  ...env,
  ...dotenvParseVariables(env.parsed),
} as typeof global.process.env;
