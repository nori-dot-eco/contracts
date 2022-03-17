import dotenvParseVariables from 'dotenv-parse-variables';
import dotenv from 'dotenv-defaults';

const env = dotenv.config();

if (env.error != null || env.parsed == null) throw env.error;

process.env = {
  ...env,
  ...dotenvParseVariables(env.parsed),
} as typeof global.process.env;
