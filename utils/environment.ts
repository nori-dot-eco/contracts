/* eslint-disable @typescript-eslint/naming-convention */
import 'tsconfig-paths/register';

import dotenv from 'dotenv';

dotenv.config();

interface Environment {
  readonly MNEMONIC?: undefined | string;
  readonly STAGING_MNEMONIC?: undefined | string;
  readonly INFURA_STAGING_KEY?: undefined | string;
  readonly TENDERLY_USERNAME?: undefined | string;
  readonly TENDERLY_PROJECT?: undefined | string;
}

const REQUIRED_ENV_VARS: (keyof Environment)[] = [];

const configureEnvironment = (): Environment => {
  REQUIRED_ENV_VARS.forEach((k) => {
    if (!process.env[k]) {
      throw new Error(
        `Environment variable ${k} is required but was not found in process.env`
      );
    }
  });
  return process.env as Environment;
};

export const env = configureEnvironment();
