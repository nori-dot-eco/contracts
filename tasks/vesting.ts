import { readFileSync } from 'fs';

import * as yup from 'yup';
import csv from 'csvtojson';
import { task, subtask, types } from 'hardhat/config';
import { BigNumber } from 'ethers';
import chalk from 'chalk';
import { diff, diffString } from 'json-diff';
import type { BigNumberish } from '@ethersproject/bignumber/lib/bignumber';
import { isBigNumberish } from '@ethersproject/bignumber/lib/bignumber';
import type { Signer } from '@ethersproject/abstract-signer';
import type { CSVParseParam } from 'csvtojson/v2/Parameters';
import { isAddress, getAddress } from 'ethers/lib/utils';
import moment from 'moment';

import type { FireblocksSigner } from '../plugins/fireblocks/fireblocks-signer';

import type { BridgedPolygonNORI, LockedNORI } from '@/typechain-types';
import { getOctokit } from '@/tasks/utils/github';
import { evmTimeToUtc, utcToEvmTime, formatTokenString } from '@/utils/units';

// todo cleanup: move utils to utils folder
// todo cli: add optional param to allow a revoking tokens to a different address than the first signer index
// todo cli: add fireblocks support
// todo cli tests: test remaining untested flags and command combos
// todo grantSchema validation: originalAmount isWithinReasonableBigNumberRange
// todo grantSchema validation: lastRevocationTime is optional
// todo grantSchema validation: lastRevocationTime date validation
// todo grantSchema validation: lastRevocationTime > startTime
// todo grantSchema validation: lastRevocationTime < vestEndTime
// todo grantSchema validation: lastRevocationTime is undefined if lastQuantityRevoked is set
// todo grantSchema validation: lastQuantityRevoked is optional
// todo grantSchema validation: lastQuantityRevoked is positive uint bignumber string
// todo grantSchema validation: lastQuantityRevoked isWithinReasonableBigNumberRange
// todo grantSchema validation: lastQuantityRevoked is undefined if lastRevocationTime is set
// todo grantSchema validation: evmTimeToUtc(value).isBefore('2100') should be separated from isBeforeMaxYears
// todo grantSchema validation: evmTimeToUtc(value).isAfter('2021') should be separated from isAfterYearsAgo
// todo diffSchema validation: create schema that adds validation for blockchain grants vs github grant diffs
// todo diffSchema validation: isBeforeMaxYears should only be run on diff schema since it relies on the number of years from the date the CLI is being run
// todo diffSchema validation: isBeforeMaxYears should only be run on diff schema since it relies on the number of years from the date the CLI is being run
// todo diffSchema validation: lastQuantityRevoked only allowed if grant exists
// todo diffSchema validation: if startTime.__old !== 0, startTime.__new should never exist
// todo blockchainGrantsSchema: set to grantSchema with one additional exists property
// todo types: global subtask types  (e.g., RunVestingWithSubTasks)
// todo types: replace `any` types

type ParseGrantFunction<
  TReturnType extends keyof Grant | 'omit' | 'number' | 'string'
> = TReturnType extends keyof Grant
  ? (
      item: string,
      head: string,
      resultRow: unknown,
      row: string[],
      columnIndex: number
    ) => ParsedGrants[string][TReturnType]
  : ParsedGrants;

type RunVestingWithSubTasks = <TTaskName extends string>(
  name: TTaskName,
  taskArguments: typeof name extends typeof DIFF_SUBTASK['name']
    ? Parameters<typeof DIFF_SUBTASK['run']>[0]
    : typeof name extends typeof CREATE_SUBTASK['name']
    ? Parameters<typeof CREATE_SUBTASK['run']>[0]
    : typeof name extends typeof GET_GITHUB_SUBTASK['name']
    ? Parameters<typeof GET_GITHUB_SUBTASK['run']>[0]
    : typeof name extends typeof GET_BLOCKCHAIN_SUBTASK['name']
    ? Parameters<typeof GET_BLOCKCHAIN_SUBTASK['run']>[0]
    : typeof name extends typeof REVOKE_SUBTASK['name']
    ? Parameters<typeof REVOKE_SUBTASK['run']>[0]
    : never
) => Promise<
  ReturnType<
    typeof name extends typeof DIFF_SUBTASK['name']
      ? typeof DIFF_SUBTASK['run']
      : typeof name extends typeof CREATE_SUBTASK['name']
      ? typeof CREATE_SUBTASK['run']
      : typeof name extends typeof GET_GITHUB_SUBTASK['name']
      ? typeof GET_GITHUB_SUBTASK['run']
      : typeof name extends typeof GET_BLOCKCHAIN_SUBTASK['name']
      ? typeof GET_BLOCKCHAIN_SUBTASK['run']
      : typeof name extends typeof REVOKE_SUBTASK['name']
      ? typeof REVOKE_SUBTASK['run']
      : never
  >
>;

export type ParsedGrants = yup.InferType<typeof grantsSchema>;

export type Grant = ParsedGrants[keyof ParsedGrants];

export type GrantList = Grant[];

interface Grants {
  github: ParsedGrants;
  blockchain: ParsedGrants;
}

type ColParser = CSVParseParam['colParser'];

interface CsvParser extends ColParser {
  recipient: ParseGrantFunction<'recipient'>;
  contactUUID: 'omit';
  originalAmount: ParseGrantFunction<'originalAmount'>;
  startTime: ParseGrantFunction<'startTime'>;
  vestEndTime: ParseGrantFunction<'vestEndTime'>;
  unlockEndTime: ParseGrantFunction<'unlockEndTime'>;
  cliff1Time: ParseGrantFunction<'cliff1Time'>;
  cliff2Time: ParseGrantFunction<'cliff2Time'>;
  vestCliff1Amount: ParseGrantFunction<'vestCliff1Amount'>;
  vestCliff2Amount: ParseGrantFunction<'vestCliff2Amount'>;
  unlockCliff1Amount: ParseGrantFunction<'unlockCliff1Amount'>;
  unlockCliff2Amount: ParseGrantFunction<'unlockCliff2Amount'>;
  lastRevocationTime: ParseGrantFunction<'lastRevocationTime'>;
  lastQuantityRevoked: ParseGrantFunction<'lastQuantityRevoked'>;
}

const UINT_STRING_MATCHER = /^\d+$/;

export const validations = {
  isValidEvmMoment: () => {
    return {
      message: (d: { path: string; value?: unknown }): string =>
        `${d.path} must be a valid EVM timestamp. Value: ${d.value}.`,
      test: (value: unknown, _options?: { path: string }): boolean =>
        typeof value === 'number' &&
        yup.number().strict().min(0).integer().isValidSync(value) &&
        moment(evmTimeToUtc(value)).isValid(),
    };
  },
  isBigNumberish: () => {
    return {
      message: (d: { path: string; value?: unknown }): string =>
        `${d.path} must be BigNumberish. Value: ${d.value}.`,
      test: (value: unknown, _options?: { path: string }): boolean =>
        typeof value === 'string' && isBigNumberish(value),
    };
  },
  isNonZero: () => {
    return {
      message: (d: { path: string; value?: unknown }): string =>
        `${d.path} must be > 0. Value: ${d.value}.`,
      test: (value: BigNumberish, _options?: { path: string }): boolean =>
        BigNumber.from(value).gt(0),
    };
  },
  isBigNumberLTE: (other: BigNumberish) => {
    return {
      message: (d: { path: string; value?: unknown }): string =>
        `${d.path} must be BigNumberish less than or equal to: ${other}`,
      test: (value: unknown, _options?: { path: string }): boolean => {
        return isBigNumberish(value) && BigNumber.from(value).lte(other);
      },
    };
  },
  walletAddressIsSameAsParentKey: () => {
    return {
      message: (d: { path: string; value?: unknown }): string =>
        `${d.path} must be the same value as the parent key. Value: ${d.value}.`,
      test: (value: unknown, options: { path: string }): boolean => {
        const hasSameValueAsParentKey =
          options?.path === '' ||
          (Boolean(options?.path) && options?.path.split('.')[0] === value);
        return typeof value === 'string' && hasSameValueAsParentKey;
      },
    };
  },
  isWalletAddress: () => {
    return {
      message: (d: { path: string; value?: unknown }): string =>
        `${d.path} must be a wallet address. Value: ${d.value}.`,
      test: (value: unknown, _options?: { path: string }): boolean => {
        return typeof value === 'string' && isAddress(value);
      },
    };
  },
  isBeforeMaxYears: ({ maxFutureYears }: { maxFutureYears: number }) => {
    return {
      message: (d: { path: string; value?: unknown }): string =>
        `${d.path} is not a date within ${maxFutureYears} years from today. Value: ${d.value}.`,
      test: (value: unknown, _options?: { path: string }): boolean => {
        const maxFutureYearsIsUint = yup
          .number()
          .integer()
          .positive()
          .min(0)
          .required()
          .strict()
          .isValidSync(maxFutureYears);
        return (
          typeof value === 'number' &&
          maxFutureYearsIsUint &&
          evmTimeToUtc(value).isBefore(moment().add(maxFutureYears, 'years')) &&
          evmTimeToUtc(value).isBefore('2100')
        );
      },
    };
  },
  isAfterYearsAgo: ({ minimumPastYears }: { minimumPastYears: number }) => {
    return {
      message: (d: { path: string; value?: unknown }): string =>
        `${d.path} is not a date after ${minimumPastYears} year ago today. Value: ${d.value}.`,
      test: (value: unknown, _options?: { path: string }): boolean => {
        const minimumPastYearsIsUint = yup
          .number()
          .integer()
          .positive()
          .min(0)
          .required()
          .strict()
          .isValidSync(minimumPastYears);
        return (
          typeof value === 'number' &&
          minimumPastYearsIsUint &&
          evmTimeToUtc(value).isAfter(
            moment().subtract(minimumPastYears, 'years')
          ) &&
          evmTimeToUtc(value).isAfter('2021')
        );
      },
    };
  },
} as const;

export const rules = {
  requiredPositiveInteger: () =>
    yup.number().integer().positive().min(0).required().strict(),
  requiredString: () => yup.string().required().strict(),
  requiredPositiveBigNumberString: () =>
    rules
      .requiredString()
      .matches(UINT_STRING_MATCHER)
      .test(validations.isBigNumberish()),
  requiredPositiveNonZeroBigNumberString: () =>
    rules.requiredPositiveBigNumberString().test(validations.isNonZero()),
  isTimeWithinReasonableDateRange: ({
    minimumPastYears,
    maxFutureYears,
  }: {
    minimumPastYears: number;
    maxFutureYears: number;
  }): yup.NumberSchema<number, yup.AnyObject, undefined, ''> =>
    rules
      .requiredPositiveInteger()
      .test(validations.isValidEvmMoment())
      .test(validations.isAfterYearsAgo({ minimumPastYears }))
      .test(validations.isBeforeMaxYears({ maxFutureYears })),
  isWalletAddress: () =>
    rules
      .requiredString()
      .test(validations.isWalletAddress())
      .test(validations.walletAddressIsSameAsParentKey()),
} as const;

export const grantSchema = yup
  .object({
    recipient: rules.isWalletAddress(),
    originalAmount: rules.requiredPositiveNonZeroBigNumberString(),
    startTime: rules.isTimeWithinReasonableDateRange({
      minimumPastYears: 1,
      maxFutureYears: 2,
    }),
    vestEndTime: rules
      .requiredPositiveInteger()
      .when('startTime', ([startTime], schema, value) => {
        if (value > 0) {
          return schema
            .min(startTime)
            .test(validations.isBeforeMaxYears({ maxFutureYears: 10 }));
        }
        return schema;
      }),
    unlockEndTime: rules
      .isTimeWithinReasonableDateRange({
        minimumPastYears: 1,
        maxFutureYears: 10,
      })
      .when(
        ['vestEndTime', 'startTime'],
        ([vestEndTime, startTime], schema) => {
          return schema.min(Math.max(vestEndTime, startTime));
        }
      ),
    cliff1Time: rules
      .isTimeWithinReasonableDateRange({
        minimumPastYears: 1,
        maxFutureYears: 10,
      })
      .when('startTime', ([startTime], schema) => {
        return schema.min(startTime);
      }),
    cliff2Time: rules
      .isTimeWithinReasonableDateRange({
        minimumPastYears: 1,
        maxFutureYears: 10,
      })
      .when('cliff1Time', ([cliff1Time], schema) => {
        return schema.min(cliff1Time);
      }),
    vestCliff1Amount: rules
      .requiredPositiveBigNumberString()
      .when(
        ['originalAmount', 'vestEndTime', 'startTime'],
        ([originalAmount, vestEndTime, startTime], schema, value) => {
          if (value > 0 && vestEndTime > startTime) {
            return schema.test(validations.isBigNumberLTE(originalAmount));
          }
          return schema;
        }
      ),
    vestCliff2Amount: rules
      .requiredPositiveBigNumberString()
      .when(
        ['originalAmount', 'vestCliff1Amount', 'vestEndTime', 'startTime'],
        (
          [originalAmount, vestCliff1Amount, vestEndTime, startTime],
          schema,
          value
        ) => {
          if (value > 0 && vestEndTime > startTime) {
            return schema.test(
              validations.isBigNumberLTE(
                BigNumber.from(originalAmount).sub(vestCliff1Amount)
              )
            );
          }
          return schema;
        }
      ),
    unlockCliff1Amount: rules
      .requiredPositiveBigNumberString()
      .when(
        ['vestCliff1Amount', 'originalAmount'],
        ([vestCliff1Amount, originalAmount], schema) => {
          if (vestCliff1Amount > 0) {
            return schema.test(validations.isBigNumberLTE(vestCliff1Amount));
          }
          return schema.test(validations.isBigNumberLTE(originalAmount));
        }
      ),
    unlockCliff2Amount: rules
      .requiredPositiveBigNumberString()
      .when(
        [
          'vestCliff1Amount',
          'vestCliff2Amount',
          'unlockCliff1Amount',
          'originalAmount',
        ],
        (
          [
            vestCliff1Amount,
            vestCliff2Amount,
            unlockCliff1Amount,
            originalAmount,
          ],
          schema
        ) => {
          if (vestCliff1Amount > 0) {
            return schema.test(
              validations.isBigNumberLTE(
                BigNumber.from(vestCliff1Amount)
                  .add(vestCliff2Amount)
                  .sub(unlockCliff1Amount)
              )
            );
          }
          return schema.test(
            validations.isBigNumberLTE(
              BigNumber.from(originalAmount).sub(unlockCliff1Amount)
            )
          );
        }
      ),
    lastRevocationTime: rules.requiredPositiveInteger(),
    lastQuantityRevoked: rules.requiredPositiveBigNumberString(),
  })
  .strict()
  .noUnknown();

export const grantsSchema = yup.lazy((data) => {
  return yup.object(
    Object.fromEntries(Object.keys(data).map((key) => [key, grantSchema]))
  );
});

const getDiff = ({
  grants: { github: githubGrants, blockchain: blockchainGrants },
  expand,
  asJson,
}: {
  grants: Grants;
  expand: boolean;
  asJson: boolean;
}): string | Record<string, unknown> => {
  return asJson
    ? diff(blockchainGrants, githubGrants, { full: expand })
    : diffString(blockchainGrants, githubGrants, { full: expand });
};

export const csvParser: CsvParser = {
  recipient: (item) => getAddress(item),
  contactUUID: 'omit',
  originalAmount: (item) => formatTokenString(item).toString(),
  startTime: (item) => utcToEvmTime(item),
  vestEndTime: (item) => utcToEvmTime(item ?? '0'),
  unlockEndTime: (item) => utcToEvmTime(item),
  cliff1Time: (item) => utcToEvmTime(item ?? '0'),
  cliff2Time: (item) => utcToEvmTime(item ?? '0'),
  vestCliff1Amount: (item) => formatTokenString(item ?? '0').toString(),
  vestCliff2Amount: (item) => formatTokenString(item ?? '0').toString(),
  unlockCliff1Amount: (item) => formatTokenString(item ?? '0').toString(),
  unlockCliff2Amount: (item) => formatTokenString(item ?? '0').toString(),
  lastRevocationTime: (item) => (item ? utcToEvmTime(item) : 0),
  lastQuantityRevoked: (item) =>
    formatTokenString(['', 'ALL'].includes(item) ? '0' : item).toString(),
};

export const grantListToObject = ({
  listOfGrants,
}: {
  listOfGrants: GrantList;
}): ParsedGrants => {
  return listOfGrants.reduce((accumulator, value): ParsedGrants => {
    if (accumulator[value.recipient]) {
      throw new Error(
        `Found duplicate recipient address in grants ${value.recipient}`
      );
    }
    return { ...accumulator, [value.recipient]: value };
  }, {} as ParsedGrants);
};

export const grantCsvToList = async ({
  data,
  opts,
}: {
  data: string;
  opts?: Partial<Omit<CSVParseParam, 'colParser'>>;
}): Promise<GrantList> => {
  const dataP = (await csv({
    ...opts,
    colParser: csvParser,
  })
    .subscribe(
      // Post process rows once they're read in but before final validation
      (row: Grant) => {
        row.cliff1Time = row.cliff1Time === 0 ? row.startTime : row.cliff1Time;
        row.cliff2Time = row.cliff2Time === 0 ? row.cliff1Time : row.cliff2Time;
        // row.vestEndTime = row.vestEndTime === 0 ? row.startTime : row.vestEndTime;
      },
      (error) => {
        throw error;
      }
    )
    .fromString(data)) as GrantList;
  return dataP;
};

const grantCsvToObject = async ({
  data,
}: {
  data: string;
}): Promise<ParsedGrants> => {
  const listOfGrants: GrantList = await grantCsvToList({
    data: data.toString(),
    opts: { checkColumn: true },
  });
  const grants: ParsedGrants = grantListToObject({ listOfGrants });
  return grants;
};

interface VestingTaskOptions {
  diff?: boolean;
  expand?: boolean;
  commit?: string;
  action?: 'createAndRevoke' | 'revoke' | 'create';
  file?: string;
  memo?: string;
  asJson?: boolean;
  dryRun?: boolean;
}

type ParsedVestingTaskOptions = RequiredKeys<
  VestingTaskOptions,
  'diff' | 'expand' | 'asJson' | 'dryRun'
>;

/**
 * We use a function here instead to address type issues resulting from race conditions in typechain
 *
 * @see https://github.com/dethcrypto/TypeChain/issues/371#issuecomment-1032397470
 */
export const GET_VESTING_TASK = () =>
  ({
    name: 'vesting',
    description: 'Utilities for handling vesting',
    run: async (
      options: VestingTaskOptions,
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
      const {
        diff: showDiff,
        expand,
        commit,
        action,
        file,
        memo,
        asJson,
        dryRun,
      } = options as ParsedVestingTaskOptions;
      const { createAndRevoke, revoke, create } = {
        createAndRevoke: action === 'createAndRevoke',
        revoke: action === 'revoke',
        create: action === 'create',
      };
      if (asJson && !showDiff && !expand) {
        throw new Error(
          'You must specify --diff or --expand when using --as-json'
        );
      }
      const [signer] = await hre.getSigners();
      const { getBridgedPolygonNori, getLockedNORI } = await import(
        '@/utils/contracts'
      );
      const bpNori = await getBridgedPolygonNori({
        hre,
        signer,
      });
      const lNori = await getLockedNORI({ hre, signer });
      hre.log(`LockedNORI: ${lNori.address}`);
      const runSubtask = hre.run as RunVestingWithSubTasks;
      let githubGrantsCsv: string;
      if (typeof file === 'string') {
        hre.log('Reading grants from file');
        githubGrantsCsv = readFileSync(file, { encoding: 'utf8' });
      } else {
        hre.log('Reading grants from github commit:', commit);
        githubGrantsCsv = await runSubtask('get-github', { commit });
      }
      const githubGrants: Grants['github'] = await grantCsvToObject({
        data: githubGrantsCsv,
      });
      hre.log(`Grants obtained`);
      await grantsSchema.validate(githubGrants);
      if (showDiff || expand) {
        await runSubtask('diff', {
          grants: { github: githubGrants },
          lNori,
          expand,
          asJson,
        });
      }
      if (createAndRevoke || create) {
        await runSubtask('create', {
          grants: { github: githubGrants },
          bpNori,
          lNori,
          dryRun,
          memo,
        });
      }
      if (createAndRevoke || revoke) {
        await runSubtask('revoke', {
          grants: { github: githubGrants },
          lNori,
          signer,
          dryRun,
          memo,
        });
      }
      if (!expand && !showDiff && !createAndRevoke && !create && !revoke) {
        hre.log('No action selected.  Use --help for options.');
      }
    },
  } as const);

const DIFF_SUBTASK = {
  name: 'diff',
  description:
    'Print the diff between the grants known by a particular GitHub commit and the grants on-chain',
  run: async (
    {
      grants: { github: githubGrants },
      expand,
      lNori,
      asJson,
    }: {
      lNori: LockedNORI;
      grants: Pick<Grants, 'github'>;
      expand: boolean;
      asJson: boolean;
    },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const runSubtask = hre.run as RunVestingWithSubTasks;
    const blockchainGrants = await runSubtask('get-blockchain', {
      grants: { githubGrants },
      lNori,
    });
    hre.log(`Blockchain grants: ${blockchainGrants}`);
    const grantsDiff = getDiff({
      grants: {
        blockchain: Object.fromEntries(
          Object.entries(blockchainGrants).reduce((previous, [k1, v1]) => {
            const {
              vestEndTime,
              startTime,
              lastQuantityRevoked,
              exists,
              ...rest
            } = v1 as any;
            return [
              ...previous,
              [
                k1,
                {
                  vestEndTime:
                    Boolean(exists) &&
                    vestEndTime === 0 &&
                    githubGrants[k1].vestEndTime === githubGrants[k1].startTime
                      ? githubGrants[k1].vestEndTime
                      : vestEndTime,
                  ...(Boolean(lastQuantityRevoked) && {
                    lastQuantityRevoked:
                      githubGrants[k1].lastQuantityRevoked !== '0'
                        ? lastQuantityRevoked
                        : '0',
                  }),
                  startTime,
                  ...rest,
                },
              ],
            ];
          }, [] as any)
        ),
        github: githubGrants,
      },
      expand,
      asJson,
    });
    hre.log(grantsDiff);
  },
} as const;

const GET_GITHUB_SUBTASK = {
  name: 'get-github',
  description: 'Get all grants from github CSV',
  run: async (
    {
      commit,
    }: Pick<
      Parameters<Awaited<ReturnType<typeof GET_VESTING_TASK>>['run']>[0],
      'commit'
    >,
    _hre: CustomHardHatRuntimeEnvironment
  ): Promise<string> => {
    const { data } = await getOctokit().rest.repos.getContent({
      mediaType: {
        format: 'raw',
      },
      ref: commit,
      owner: 'nori-dot-eco',
      repo: 'grants',
      path: 'grants.csv',
    });
    return data.toString();
  },
} as const;

const GET_BLOCKCHAIN_SUBTASK = {
  name: 'get-blockchain',
  description:
    'Get all grants from on-chain and coerce them into the schema of our github grants CSV',
  run: async (
    {
      grants: { githubGrants },
      lNori,
    }: {
      lNori: LockedNORI;
      grants: {
        githubGrants: Grants['github'];
      };
    },
    _hre: CustomHardHatRuntimeEnvironment
  ): Promise<ParsedGrants> => {
    const totalSupply = await lNori.totalSupply();
    hre.log(`Total supply: ${totalSupply}`);
    const rawBlockchainGrants = await lNori.batchGetGrant(
      Object.keys(githubGrants)
    );
    const blockchainGrants = rawBlockchainGrants.reduce(
      (accumulator: ParsedGrants, grant: any): ParsedGrants => {
        return grant.recipient === hre.ethers.constants.AddressZero
          ? accumulator
          : {
              ...accumulator,
              [grant.recipient]: {
                recipient: grant.recipient,
                originalAmount: grant.originalAmount.toString(),
                startTime: grant.startTime.toNumber(),
                vestEndTime: grant.vestEndTime.toNumber(),
                unlockEndTime: grant.unlockEndTime.toNumber(),
                cliff1Time: grant.cliff1Time.toNumber(),
                cliff2Time: grant.cliff2Time.toNumber(),
                vestCliff1Amount: grant.vestCliff1Amount.toString(),
                vestCliff2Amount: grant.vestCliff2Amount.toString(),
                unlockCliff1Amount: grant.unlockCliff1Amount.toString(),
                unlockCliff2Amount: grant.unlockCliff2Amount.toString(),
                lastRevocationTime: grant.lastRevocationTime.toNumber(),
                lastQuantityRevoked: grant.lastQuantityRevoked.toString(),
                exists: grant.exists,
              } as any,
            };
      },
      {} as ParsedGrants
    ) as ParsedGrants;
    const actualAmounts = Object.values(rawBlockchainGrants)
      .map(({ grantAmount, claimedAmount }) => grantAmount.sub(claimedAmount))
      .reduce((accumulator, v) => accumulator.add(v));
    if (!totalSupply.eq(actualAmounts)) {
      hre.log(
        'WARNING: total supply of LockedNORI does not equal the amounts of all grants.',
        ' Was a line removed from grants CSV?'
      );
      hre.log(`Total supply: ${ethers.utils.formatEther(totalSupply)}`);
      hre.log(
        `Total amount of grants provided: ${ethers.utils.formatEther(
          actualAmounts
        )}`
      );
    }
    return blockchainGrants;
  },
} as const;

const CREATE_SUBTASK = {
  name: 'create',
  description: 'Create grants on-chain',
  run: async (
    {
      grants: { github: githubGrants },
      bpNori,
      lNori,
      dryRun,
      memo,
    }: {
      grants: Pick<Grants, 'github'>;
      bpNori: BridgedPolygonNORI;
      lNori: LockedNORI;
      dryRun: boolean;
      memo?: string;
    },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const runSubtask = hre.run as RunVestingWithSubTasks;
    const blockchainGrants = await runSubtask('get-blockchain', {
      grants: { githubGrants },
      lNori,
    });
    const grantDiffs: any[] = Object.values(
      Object.fromEntries(
        Object.entries(
          diff(blockchainGrants, githubGrants, { full: true })
        ).filter(([dk, d]: [any, any]) => {
          return Object.entries(d).find(([k, v]: [any, any]) => {
            const isDifferent =
              !Boolean((blockchainGrants[dk] as any)?.exists) &&
              Boolean(v) &&
              k !== 'lastRevocationTime' &&
              k !== 'lastQuantityRevoked' &&
              v?.__new;
            return isDifferent;
          });
        })
      )
    );
    hre.log(
      chalk.bold.bgWhiteBright.black(
        `Found ${grantDiffs.length} grants that need updating`
      )
    );
    const buildUserData = ({ grant }: { grant: any }): string => {
      return hre.ethers.utils.defaultAbiCoder.encode(
        [
          'address',
          'uint256',
          'uint256',
          'uint256',
          'uint256',
          'uint256',
          'uint256',
          'uint256',
          'uint256',
          'uint256',
        ],
        [
          grant.recipient.__new ?? grant.recipient,
          grant.startTime.__new ?? grant.startTime,
          grant.vestEndTime.__new ?? grant.vestEndTime,
          grant.unlockEndTime.__new ?? grant.unlockEndTime,
          grant.cliff1Time.__new ?? grant.cliff1Time,
          grant.cliff2Time.__new ?? grant.cliff2Time,
          BigNumber.from(
            grant.vestCliff1Amount.__new ?? grant.vestCliff1Amount
          ),
          BigNumber.from(
            grant.vestCliff2Amount.__new ?? grant.vestCliff2Amount
          ),
          BigNumber.from(
            grant.unlockCliff1Amount.__new ?? grant.unlockCliff1Amount
          ),
          BigNumber.from(
            grant.unlockCliff2Amount.__new ?? grant.unlockCliff2Amount
          ),
        ]
      );
    };
    if (grantDiffs.length > 0) {
      const recipients = grantDiffs.map((_) => lNori.address);
      const amounts = grantDiffs.map((grant) =>
        BigNumber.from(grant.originalAmount.__new ?? grant.originalAmount)
      );
      const userData = grantDiffs.map((grant) => buildUserData({ grant }));
      const operatorData = grantDiffs.map((_) => '0x');
      const requireReceptionAck = grantDiffs.map((_) => true);
      hre.log(
        `Total bpNORI to lock: ${ethers.utils.formatEther(
          amounts.reduce((accumulator, v) => accumulator.add(v))
        )}`
      );
      if (!dryRun) {
        const fireblocksSigner = bpNori.signer as FireblocksSigner;
        if (typeof fireblocksSigner.setNextTransactionMemo === 'function') {
          fireblocksSigner.setNextTransactionMemo(
            `Vesting Create: ${memo || ''}`
          );
        }
        const batchCreateGrantsTx = await bpNori.batchSend(
          recipients,
          amounts,
          userData,
          operatorData,
          requireReceptionAck
        );
        const result = await batchCreateGrantsTx.wait();
        hre.log(
          chalk.bold.bgWhiteBright.black(
            `⏰ Waiting for transaction (tx: ${batchCreateGrantsTx.hash})`
          )
        );
        if (result.status === 1) {
          hre.log(
            chalk.bold.bgWhiteBright.black(
              `🎉 Created ${grantDiffs.length} grants (tx: ${result.transactionHash})`
            )
          );
        } else {
          const error = `💀 Failed to create ${grantDiffs.length} grants (tx: ${result.transactionHash})`;
          hre.log(chalk.bold.bgWhiteBright.red(error));
          throw new Error(error);
        }
      } else {
        try {
          await bpNori.callStatic.batchSend(
            recipients,
            amounts,
            userData,
            operatorData,
            requireReceptionAck
          );
          hre.log(chalk.bold.bgWhiteBright.black(`🎉 Dry run was successful!`));
        } catch (error) {
          hre.log(
            chalk.bold.bgRed.black(`💀 Dry run was unsuccessful!`, error)
          );
        }
      }
    }
  },
} as const;

const REVOKE_SUBTASK = {
  name: 'revoke',
  description: 'Revokes grants on-chain',
  run: async (
    {
      grants: { github: githubGrants },
      lNori,
      signer,
      dryRun,
      memo,
    }: {
      grants: Pick<Grants, 'github'>;
      lNori: LockedNORI;
      signer: Signer;
      dryRun: boolean;
      memo?: string;
    },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const runSubtask = hre.run as RunVestingWithSubTasks;
    const blockchainGrants = await runSubtask('get-blockchain', {
      grants: { githubGrants },
      lNori,
    });
    const diffs = Object.values(
      diff(blockchainGrants, githubGrants, { full: true })
    );
    const grantRevocationDiffs: any[] = Object.values(
      diffs.filter(
        (d: any) =>
          Boolean(d.lastRevocationTime.__new) ||
          (d.lastQuantityRevoked.__new === '0' && d.lastRevocationTime.__new)
      )
    );
    hre.log(
      chalk.bold.bgWhiteBright.black(
        `Found ${grantRevocationDiffs.length} grants that needs revocation`
      )
    );
    if (grantRevocationDiffs.length > 0) {
      const fromAccounts = grantRevocationDiffs.map((grant) => grant.recipient);
      const toAccounts = Array.from<string>({
        length: grantRevocationDiffs.length,
      }).fill(await signer.getAddress());
      const atTimes = grantRevocationDiffs.map(
        (grant) => grant.lastRevocationTime.__new ?? grant.lastRevocationTime
      );
      const amounts = grantRevocationDiffs.map((grant) =>
        BigNumber.from(
          grant.lastQuantityRevoked.__new ?? grant.lastQuantityRevoked
        )
      );
      if (!Boolean(dryRun)) {
        const fireblocksSigner = lNori.signer as FireblocksSigner;
        if (typeof fireblocksSigner.setNextTransactionMemo === 'function') {
          fireblocksSigner.setNextTransactionMemo(
            `Vesting Revoke: ${memo || ''}`
          );
        }
        const batchRevokeUnvestedTokenAmountsTx =
          await lNori.batchRevokeUnvestedTokenAmounts(
            fromAccounts,
            toAccounts,
            atTimes,
            amounts
          );
        const result = await batchRevokeUnvestedTokenAmountsTx.wait();
        hre.log(
          chalk.bold.bgWhiteBright.black(
            `⏰ Waiting for transaction (tx: ${batchRevokeUnvestedTokenAmountsTx.hash})`
          )
        );
        if (result.status === 1) {
          hre.log(
            chalk.bold.bgWhiteBright.black(
              `ℹ️  Revoked ${grantRevocationDiffs.length} grants (tx: ${result.transactionHash})`
            )
          );
        } else {
          const error = `💀 Failed to revoke ${grantRevocationDiffs.length} grants (tx: ${result.transactionHash})`;
          hre.log(chalk.bold.bgWhiteBright.red(error));
          throw new Error(error);
        }
      } else {
        try {
          await lNori.callStatic.batchRevokeUnvestedTokenAmounts(
            fromAccounts,
            toAccounts,
            atTimes,
            amounts
          );
          hre.log(
            chalk.bold.bgWhiteBright.black(`🎉  Dry run was successful!`)
          );
        } catch (error) {
          hre.log(
            chalk.bold.bgRed.black(`💀 Dry run was unsuccessful!`, error)
          );
        }
      }
    }
  },
} as const;

(() => {
  const { name, description, run } = GET_VESTING_TASK();
  task(name, description, run)
    .addOptionalPositionalParam(
      'action',
      'The action to perform: revoke | create | createAndRevoke',
      undefined,
      types.string
    )
    .addOptionalParam(
      'commit',
      'Use the grants known by a particular GitHub commit',
      'master',
      types.string
    )
    .addOptionalParam('file', 'Use a file instead of github')
    .addOptionalParam(
      'memo',
      'Add a custom memo to the transaction (Fireblocks only)'
    )
    .addFlag('dryRun', 'simulate the transaction without actually sending it')
    .addFlag(DIFF_SUBTASK.name, DIFF_SUBTASK.description)
    .addFlag(
      'expand',
      'Print expanded information (including a full diff when using the --diff flag)'
    )
    .addFlag('asJson', 'Prints diff as JSON');
  subtask(DIFF_SUBTASK.name, DIFF_SUBTASK.description, DIFF_SUBTASK.run);
  subtask(CREATE_SUBTASK.name, CREATE_SUBTASK.description, CREATE_SUBTASK.run);
  subtask(
    GET_GITHUB_SUBTASK.name,
    GET_GITHUB_SUBTASK.description,
    GET_GITHUB_SUBTASK.run
  );
  subtask(
    GET_BLOCKCHAIN_SUBTASK.name,
    GET_BLOCKCHAIN_SUBTASK.description,
    GET_BLOCKCHAIN_SUBTASK.run
  );
  subtask(REVOKE_SUBTASK.name, REVOKE_SUBTASK.description, REVOKE_SUBTASK.run);
})();
