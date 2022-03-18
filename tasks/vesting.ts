import { readFileSync } from 'fs';

import * as yup from 'yup';
import csv from 'csvtojson';
import { task, subtask, types } from 'hardhat/config';
import { BigNumber } from 'ethers';
import chalk from 'chalk';
import { diff, diffString } from 'json-diff';
import { isBigNumberish } from '@ethersproject/bignumber/lib/bignumber';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { CSVParseParam } from 'csvtojson/v2/Parameters';
import { isAddress } from 'ethers/lib/utils';
import moment from 'moment';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore // https://github.com/dethcrypto/TypeChain/issues/371#issuecomment-1032397470
import type { BridgedPolygonNORI, LockedNORI } from '@/typechain-types';
import { getOctokit } from '@/tasks/utils/github';
import { formatEthereumTime, formatTokenString } from '@/utils/units';

// // README
// // This script is for reading in a CSV file of token grants with unlocking schedules.
// // A sample file format is part of NO-1463:
// // https://docs.google.com/spreadsheets/d/1NC-jlGSxY6i7IM6v_u7HpZAerO1Hrh-sFaQpLuzm0uI/edit#gid=834947403
// // This is only for grants that have an unlocking schedule with 1 or 2 cliffs; optionally
// // they may also have a vesting schedule.

// // checks for valid data in a single row from a CSV file;
// // once any invalid data is found, prints an error and exits
// const validateGrant= (row: any)=> {
//   // amount - required to be valid up to 18 decimal places
//   if (!('amount' in row)) {
//     fatalErr('Invalid row without an amount column');
//   }
//   if (!isValidAmount(row.amount)) {
//     fatalErr(`Invalid amount: ${row.amount}`);
//   }
//   // startTime - required ISO8601
//   if (!('startTime' in row)) {
//     fatalErr('Invalid row without a startTime column');
//   }
//   if (!isValidTime(row.startTime)) {
//     fatalErr(`Invalid startTime: ${row.startTime}`);
//   }
//   // vestEndTime - optional but must be valid if present
//   if (!('vestEndTime' in row)) {
//     fatalErr('Invalid row without a vestEndTime column');
//   }
//   if (row.vestEndTime === '') {
//     // no vesting for this grant; later we check that vestAmounts are also empty
//   } else {
//     if (!isValidTime(row.vestEndTime)) {
//       fatalErr(`Invalid vestEndTime: ${row.vestEndTime}`);
//     }
//     if (Date.parse(row.vestEndTime) < Date.parse(row.startTime)) {
//       fatalErr(
//         `Invalid vesting timing with vestEndTime before startTime: ${row.vestEndTime}, ${row.startTime}`
//       );
//     }
//   }
//   // unlockEndTime - required and must be after startTime and vestEndTime
//   if (!('unlockEndTime' in row)) {
//     fatalErr('Invalid row without an unlockEndTime column');
//   }
//   if (!isValidTime(row.unlockEndTime)) {
//     fatalErr(`Invalid unlockEndTime: ${row.unlockEndTime}`);
//   }
//   if (Date.parse(row.unlockEndTime) < Date.parse(row.startTime)) {
//     fatalErr(
//       `Invalid timing with unlockEndTime before startTime: ${row.unlockEndTime}, ${row.startTime}`
//     );
//   }
//   if (!(row.vestEndtime === '')) {
//     if (Date.parse(row.unlockEndTime) < Date.parse(row.vestEndTime)) {
//       fatalErr(
//         `Invalid timing with unlockEndTime before vestEndTime: ${row.unlockEndTime}, ${row.vestEndTime}`
//       );
//     }
//   }
//   // cliff1Time - required and can be same as startTime
//   if (!('cliff1Time' in row)) {
//     fatalErr('Invalid row without a cliff1Time column');
//   }
//   if (!isValidTime(row.cliff1Time)) {
//     fatalErr(`Invalid cliff1Time: ${row.cliff1Time}`);
//   }
//   if (Date.parse(row.cliff1Time) < Date.parse(row.startTime)) {
//     fatalErr(
//       `Invalid timing with cliff1Time before startTime: ${row.cliff1Time}, ${row.startTime}`
//     );
//   }
//   if (Date.parse(row.cliff1Time) > Date.parse(row.unlockEndTime)) {
//     fatalErr(
//       `Invalid timing with cliff1Time after unlockEndTime: ${row.cliff1Time}, ${row.unlockEndTime}`
//     );
//   }
//   if (!(row.vestEndtime === '')) {
//     if (Date.parse(row.cliff1Time) > Date.parse(row.vestEndTime)) {
//       fatalErr(
//         `Invalid timing with cliff1Time after vestEndTime: ${row.cliff1Time}, ${row.vestEndTime}`
//       );
//     }
//   }
//   // cliff2Time - optional, but if provided must come after cliff1Time before end times
//   if (!('cliff2Time' in row)) {
//     fatalErr('Invalid row without a cliff2Time column');
//   }
//   if (row.cliff2Time === '') {
//     // no cliff 2 for this grant
//   } else {
//     if (!isValidTime(row.cliff2Time)) {
//       fatalErr(`Invalid cliff2Time: ${row.cliff2Time}`);
//     }
//     if (Date.parse(row.cliff2Time) < Date.parse(row.startTime)) {
//       fatalErr(
//         `Invalid timing with cliff2Time before startTime: ${row.cliff2Time}, ${row.startTime}`
//       );
//     }
//     if (Date.parse(row.cliff2Time) < Date.parse(row.cliff1Time)) {
//       fatalErr(
//         `Invalid timing with cliff2Time before cliff1Time: ${row.cliff2Time}, ${row.cliff1Time}`
//       );
//     }
//     if (Date.parse(row.cliff2Time) > Date.parse(row.unlockEndTime)) {
//       fatalErr(
//         `Invalid timing with cliff2Time after unlockEndTime: ${row.cliff2Time}, ${row.unlockEndTime}`
//       );
//     }
//     if (!(row.vestEndtime === '')) {
//       if (Date.parse(row.cliff2Time) > Date.parse(row.vestEndTime)) {
//         fatalErr(
//           `Invalid timing with cliff2Time after vestEndTime: ${row.cliff2Time}, ${row.vestEndTime}`
//         );
//       }
//     }
//   }
//   // vestCliff1Amount - if there is vesting, this can be any amount up to total amount
//   if (!('vestCliff1Amount' in row)) {
//     fatalErr('Invalid row without a vestCliff1Amount column');
//   }
//   if (!(row.vestEndTime === '')) {
//     if (!isValidAmount(row.vestCliff1Amount)) {
//       fatalErr(
//         `Valid vestCliff1Amount is required because this grant has vesting: ${row.vestCliff1Amount}`
//       );
//     }
//     if (intAmount(row.vestCliff1Amount) > intAmount(row.amount)) {
//       fatalErr(
//         `Invalid vestCliff1Amount larger than grant amount: ${row.vestCliff1Amount}, ${row.amount}`
//       );
//     }
//   } else if (!(row.vestCliff1Amount === '')) {
//     fatalErr(
//       'Invalid grant has a vestCliff1Amount when there is no vestEndTime'
//     );
//   }
//   // vestCliff2Amount - if there is a cliff 2 and vesting, this can be between vestCliff1Amount and total amount
//   if (!('vestCliff2Amount' in row)) {
//     fatalErr('Invalid row without a vestCliff2Amount column');
//   }
//   if (row.vestEndTime === '' || row.cliff2Time === '') {
//     if (!(row.vestCliff2Amount === '')) {
//       fatalErr(
//         'Invalid grant has a vestCliff2Amount when there is no vesting or cliff 2'
//       );
//     }
//   } else {
//     if (!isValidAmount(row.vestCliff2Amount)) {
//       fatalErr(
//         `Valid vestCliff2Amount is required because this grant has vesting and cliff 2: ${row.vestCliff2Amount}`
//       );
//     }
//     if (intAmount(row.vestCliff2Amount) > intAmount(row.amount)) {
//       fatalErr(
//         `Invalid vestCliff2Amount larger than grant amount: ${row.vestCliff2Amount}, ${row.amount}`
//       );
//     }
//     if (intAmount(row.vestCliff2Amount) < intAmount(row.vestCliff1Amount)) {
//       fatalErr(
//         `Invalid vestCliff2Amount smaller than vestCliff1Amount: ${row.vestCliff2Amount}, ${row.vestCliff1Amount}`
//       );
//     }
//   }
//   // unlockCliff1Amount - optional, and if provided it must be less than vestCliff1Amount
//   if (!('unlockCliff1Amount' in row)) {
//     fatalErr('Invalid row without a unlockCliff1Amount column');
//   }
//   if (row.unlockCliff1Amount === '') {
//     // no cliff 1 amount for this grant
//     if (Date.parse(row.cliff1Time) > Date.parse(row.startTime)) {
//       fatalErr(
//         'Invalid grant has no unlockCliff1Amount but has a cliff1Time later than startTime'
//       );
//     }
//   } else {
//     if (!isValidAmount(row.unlockCliff1Amount)) {
//       fatalErr(`Invalid unlockCliff1Amount: ${row.unlockCliff1Amount}`);
//     }
//     if (intAmount(row.unlockCliff1Amount) > intAmount(row.amount)) {
//       fatalErr(
//         `Invalid unlockCliff1Amount larger than grant amount: ${row.unlockCliff1Amount}, ${row.amount}`
//       );
//     }
//     if (!(row.vestEndTime === '')) {
//       if (intAmount(row.vestCliff1Amount) < intAmount(row.unlockCliff1Amount)) {
//         fatalErr(
//           `Invalid unlockCliff1Amount larger than vestCliff1Amount: ${row.unlockCliff1Amount}, ${row.vestCliff1Amount}`
//         );
//       }
//     }
//   }
//   // unlockCliff2Amount - optional, and must be less than vestCliff2Amount
//   if (!('unlockCliff2Amount' in row)) {
//     fatalErr('Invalid row without a unlockCliff2Amount column');
//   }
//   if (row.cliff2Time === '') {
//     // no cliff 2 for this grant
//     if (!(row.unlockCliff2Amount === '')) {
//       fatalErr('Invalid grant has unlockCliff2Amount when there is no cliff 2');
//     }
//   } else {
//     if (!isValidAmount(row.unlockCliff2Amount)) {
//       fatalErr(`Invalid unlockCliff2Amount: ${row.unlockCliff2Amount}`);
//     }
//     if (intAmount(row.unlockCliff2Amount) > intAmount(row.amount)) {
//       fatalErr(
//         `Invalid unlockCliff2Amount larger than grant amount: ${row.unlockCliff2Amount}, ${row.amount}`
//       );
//     }
//     if (intAmount(row.unlockCliff2Amount) < intAmount(row.unlockCliff1Amount)) {
//       fatalErr(
//         `Invalid unlockCliff2Amount smaller than unlockCliff1Amount: ${row.unlockCliff2Amount}, ${row.unlockCliff1Amount}`
//       );
//     }
//     if (!(row.vestEndTime === '')) {
//       if (intAmount(row.vestCliff2Amount) < intAmount(row.unlockCliff2Amount)) {
//         fatalErr(
//           `Invalid unlockCliff2Amount larger than vestCliff2Amount: ${row.unlockCliff2Amount}, ${row.vestCliff2Amount}`
//         );
//       }
//     }
//   }
//   // lastRevocationTime - optional
//   if ('lastRevocationTime' in row && !(row.lastRevocationTime === '')) {
//     if (!isValidTime(row.lastRevocationTime)) {
//       fatalErr(`Invalid lastRevocationTime: ${row.lastRevocationTime}`);
//     }
//     if (Date.parse(row.lastRevocationTime) < Date.parse(row.startTime)) {
//       fatalErr(
//         `Invalid lastRevocationTime before startTime: ${row.lastRevocationTime}, ${row.startTime}`
//       );
//     }
//     if (Date.parse(row.lastRevocationTime) > Date.parse(row.vestEndTime)) {
//       fatalErr(
//         `Invalid lastRevocationTime after vestEndTime: ${row.lastRevocationTime}, ${row.vestEndTime}`
//       );
//     }
//   }
// }

// // GrantFromCSV()
// // constructs and returns a grant data object given a row from CSV format
// const grantFromRow = (row: any): GrantFromCSV =>{
//   const grant: GrantFromCSV = {
//     walletAddress: row.walletAddress,
//     amount: intAmount(row.amount),
//     startTime: row.startTime,
//     unlockEndTime: row.unlockEndTime,
//     cliff1Time: row.cliff1Time,
//   };
//   if ('vestEndTime' in row && row.vestEndTime !== '') {
//     grant.vestEndTime = row.vestEndTime;
//     grant.vestCliff1Amount = row.vestCliff1Amount;
//   }
//   if ('unlockCliff1Amount' in row && row.unlockCliff1Amount !== '') {
//     grant.unlockCliff1Amount = row.unlockCliff1Amount;
//   }
//   if ('cliff2Time' in row && row.cliff2Time !== '') {
//     grant.cliff2Time = row.cliff2Time;
//     grant.unlockCliff2Amount = row.unlockCliff2Amount;
//   }
//   if (
//     'vestEndTime' in row &&
//     row.vestEndTime !== '' &&
//     'cliff2Time' in row &&
//     row.cliff2Time !== ''
//   ) {
//     grant.vestCliff2Amount = row.vestCliff2Amount;
//   }
//   if ('lastRevocationTime' in row && row.lastRevocationTime !== '') {
//     grant.lastRevocationTime = row.lastRevocationTime;
//   }
//   return grant;
// }

// // isValidTime()
// // returns true or false given a string with an ISO8601 datetime
// const isValidTime:(time: string): boolean =>{
//   // valid time in ISO8601 UTC without milliseconds
//   const regTime =
//     /^20\d{2}-([0]\d|1[0-2])-([0-2]\d|3[01])T[0-2]\d:[0-5]\d:[0-5]\dZ$/;
//   // and it must be good enough for Date.parse()
//   const d: number = Date.parse(time);
//   return regTime.test(time) && !isNaN(d);
// }

// interface Validations {
//   [key: string]: {
//     [Property in keyof yup.TestConfig]: yup.TestConfig[Property];
//   } & {
//     test: (value: any, opts?: { path: string }) => boolean;
//     message: (path: any) => any;
//   };
// }

export const validation = {
  isBigNumberString: {
    message: (d: { path: string }) => `${d.path} must be BigNumberish`,
    test: (value: unknown, _opts?: { path: string }) => isBigNumberish(value),
  },
  isWalletAddress: {
    message: (d: { path: string }) =>
      `${d.path} must be a wallet address and the same value as the parent key`,
    test: (value: unknown, opts: { path: string }) => {
      const hasSameValueAsParentKey =
        Boolean(opts?.path) && opts?.path.split('.')[0] === value;
      return (
        typeof value === 'string' && hasSameValueAsParentKey && isAddress(value)
      );
    },
  },
  isWithinFiveYears: {
    message: (d: { path: string }) =>
      `${d.path} is not a date within 5 years from today`,
    test: (value: unknown, _opts?: { path: string }) => {
      return (
        typeof value === 'number' &&
        moment(value * 1_000).isBefore(moment().add(5, 'years'))
      );
    },
  },
} as const;

const { isWalletAddress, isBigNumberString } = validation;

export const grantSchema = yup.lazy((data) => {
  // todo further constrain
  return yup.object(
    Object.fromEntries(
      Object.keys(data).map((key) => [
        key,
        yup.object({
          recipient: yup.string().test(isWalletAddress).required(),
          originalAmount: yup.string().test(isBigNumberString).required(),
          startTime: yup.number().required(),
          vestEndTime: yup.number().required(),
          unlockEndTime: yup.number().required(),
          cliff1Time: yup.number().required(),
          cliff2Time: yup.number().required(),
          vestCliff1Amount: yup.string().test(isBigNumberString).required(),
          vestCliff2Amount: yup.string().test(isBigNumberString).required(),
          unlockCliff1Amount: yup.string().test(isBigNumberString).required(),
          unlockCliff2Amount: yup.string().test(isBigNumberString).required(),
          lastRevocationTime: yup.number().required(),
          lastQuantityRevoked: yup.string().test(isBigNumberString).required(),
        }),
      ])
    )
  );
});

type ParseGrantFunction<
  TReturnType extends
    | keyof ParsedGrant[keyof ParsedGrant]
    | 'omit'
    | 'number'
    | 'string'
> = TReturnType extends keyof ParsedGrant[keyof ParsedGrant]
  ? (
      item: string,
      head: string,
      resultRow: unknown,
      row: string[],
      columnIndex: number
    ) => ParsedGrant[string][TReturnType]
  : ParsedGrant;

type RunVestingWithSubTasks = <TTaskName extends string>(
  name: TTaskName,
  taskArguments: typeof name extends typeof DIFF_SUBTASK['name']
    ? Parameters<typeof DIFF_SUBTASK['run']>[0]
    : typeof name extends typeof UPDATE_SUBTASK['name']
    ? Parameters<typeof UPDATE_SUBTASK['run']>[0]
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
      : typeof name extends typeof UPDATE_SUBTASK['name']
      ? typeof UPDATE_SUBTASK['run']
      : typeof name extends typeof GET_GITHUB_SUBTASK['name']
      ? typeof GET_GITHUB_SUBTASK['run']
      : typeof name extends typeof GET_BLOCKCHAIN_SUBTASK['name']
      ? typeof GET_BLOCKCHAIN_SUBTASK['run']
      : typeof name extends typeof REVOKE_SUBTASK['name']
      ? typeof REVOKE_SUBTASK['run']
      : never
  >
>;

export type ParsedGrant = yup.InferType<typeof grantSchema>;

export type GrantList = ParsedGrant[keyof ParsedGrant][];
interface Grants {
  github: ParsedGrant;
  blockchain: ParsedGrant;
}

/**
 * We use a function here instead to address type issues resulting from race conditions in typechain
 *
 * @todo
 * @see https://github.com/dethcrypto/TypeChain/issues/371#issuecomment-1032397470
 */
export const GET_VESTING_TASK = () =>
  ({
    name: 'vesting',
    description: 'Utilities for handling vesting',
    run: async (
      {
        diff: showDiff,
        expand,
        commit,
        account,
        action,
        file,
        asJson,
      }: {
        diff?: boolean;
        expand?: boolean;
        commit?: string;
        account?: number;
        action?: 'update' | 'account' | 'revoke' | 'create';
        file?: string;
        asJson?: boolean;
      },
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
      const { update, revoke, create } = {
        update: action === 'update',
        revoke: action === 'revoke',
        create: action === 'create',
      };
      if ((!account && account !== 0) || account < 0 || account > 10) {
        throw new Error('Invalid account/signer index');
      }
      if (asJson && !showDiff && !expand) {
        throw new Error(
          'You must specify --asJson or --expand when using --as-json'
        );
      }
      const signer = (await hre.ethers.getSigners())[account];
      const { getBridgedPolygonNori, getLockedNori } = await import(
        '@/utils/contracts'
      );
      const bpNori = getBridgedPolygonNori({
        network: hre.network.name,
        signer,
      });
      const lNori = getLockedNori({ network: hre.network.name, signer });
      const runSubtask = hre.run as RunVestingWithSubTasks;
      let githubGrants: Grants['github'];
      if (file) {
        hre.log('Reading grants from file');
        githubGrants = readFileSync(file, { encoding: 'utf8' }) as any;
      } else {
        hre.log('Reading grants from github commit:', commit);
        githubGrants = await runSubtask('get-github', { commit });
      }
      if (showDiff || expand) {
        await runSubtask('diff', {
          grants: { github: githubGrants },
          lNori,
          expand,
          asJson,
        });
      }
      if (update || create) {
        await runSubtask('update', {
          grants: { github: githubGrants },
          bpNori,
          lNori,
        });
      }
      if (update || revoke) {
        await runSubtask('revoke', {
          grants: { github: githubGrants },
          lNori,
          signer,
        });
      }
      if (!expand && !showDiff && !update && !create && !revoke) {
        hre.log('No action selected.  Use --help for options.');
      }
    },
  } as const);

const getDiff = ({
  grants: { github: githubGrants, blockchain: blockchainGrants },
  expand,
  asJson,
}: {
  grants: Grants;
  expand?: boolean;
  asJson?: boolean;
}): string | Record<string, unknown> => {
  return asJson
    ? diff(blockchainGrants, githubGrants, { full: expand })
    : diffString(blockchainGrants, githubGrants, { full: expand });
};

type ColParser = CSVParseParam['colParser'];

interface CsvParser extends ColParser {
  recipient: 'string';
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

const csvParser: CsvParser = {
  recipient: 'string',
  contactUUID: 'omit',
  originalAmount: (item) => formatTokenString(item).toString(), // todo validate (> 0)
  startTime: (item) => formatEthereumTime(item === '' ? 1_000 : item), // todo can we stop creating grants that have start times in the past?  // todo only if vestEndTimeIsAlso ===''  // todo validate
  vestEndTime: (item) => formatEthereumTime(item === '' ? 1_000 : item), // todo validate
  unlockEndTime: (item) => formatEthereumTime(item), // todo validate
  cliff1Time: (item) => formatEthereumTime(item), // todo validate
  cliff2Time: (item) => formatEthereumTime(item), // todo validate
  vestCliff1Amount: (item) => formatTokenString(item ?? '0'), // todo validate
  vestCliff2Amount: (item) => formatTokenString(item ?? '0'), // todo validate
  unlockCliff1Amount: (item) => formatTokenString(item ?? '0'), // todo validate
  unlockCliff2Amount: (item) => formatTokenString(item ?? '0'), // todo validate
  lastRevocationTime: (item) => (Boolean(item) ? formatEthereumTime(item) : 0), // todo validate,
  lastQuantityRevoked: (item) =>
    formatTokenString(['', 'ALL'].includes(item) ? '0' : item), // todo validate // todo mathjs  // todo, if grant doesn't exist, don't allow revoking
};

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
      expand?: boolean;
      asJson?: boolean;
    },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const runSubtask = hre.run as RunVestingWithSubTasks;
    const blockchainGrants = await runSubtask('get-blockchain', {
      grants: { githubGrants },
      lNori,
    });
    const grantsDiff = getDiff({
      grants: { blockchain: blockchainGrants, github: githubGrants },
      expand,
      asJson,
    });
    hre.log(grantsDiff);
  },
} as const;

export const grantListToObject = ({
  listOfGrants,
}: {
  listOfGrants: GrantList;
}): ParsedGrant => {
  return listOfGrants.reduce((acc, val): ParsedGrant => {
    if (Boolean(acc[val.recipient])) {
      throw new Error('Found duplicate recipient address in grants');
    }
    return { ...acc, [val.recipient]: val };
  }, {} as ParsedGrant);
};

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
  ): Promise<ParsedGrant> => {
    const { data } = await getOctokit().rest.repos.getContent({
      mediaType: {
        format: 'raw',
      },
      ref: commit,
      owner: 'nori-dot-eco',
      repo: 'grants',
      path: 'grants.csv',
    });
    const listOfGrants: GrantList = await csv({
      checkColumn: true,
      colParser: csvParser,
    })
      .subscribe(undefined, (err) => {
        throw err;
      })
      .fromString(data.toString());
    const githubGrants: ParsedGrant = grantListToObject({ listOfGrants });
    await grantSchema.validate(githubGrants);
    return githubGrants;
  },
} as const;

const GET_BLOCKCHAIN_SUBTASK = {
  name: 'get-blockchain',
  description: 'Get all grants from on-chain',
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
  ): Promise<ParsedGrant> => {
    const blockchainGrants = (
      await lNori.batchGetGrant(Object.keys(githubGrants))
    ).reduce((acc: ParsedGrant, grant: any): ParsedGrant => {
      return grant.recipient === hre.ethers.constants.AddressZero
        ? acc
        : {
            ...acc,
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
            },
          };
    }, {} as ParsedGrant) as ParsedGrant;
    return blockchainGrants;
  },
} as const;

const UPDATE_SUBTASK = {
  name: 'update',
  description: 'Update grants on-chain',
  run: async (
    {
      grants: { github: githubGrants },
      bpNori,
      lNori,
    }: {
      grants: Pick<Grants, 'github'>;
      bpNori: BridgedPolygonNORI;
      lNori: LockedNORI;
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
    const grantDiffs: any[] = Object.values(diffs).filter((d: any) => {
      return Object.entries(d).find(
        ([k, v]: [any, any]) =>
          k !== 'lastRevocationTime' && k !== 'lastQuantityRevoked' && v.__new
      );
    });
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
    }
  },
} as const;

const REVOKE_SUBTASK = {
  // todo --updateAndRevoke flag
  name: 'revoke',
  description: 'Revokes grants on-chain',
  run: async (
    {
      grants: { github: githubGrants },
      lNori,
      signer,
    }: {
      grants: Pick<Grants, 'github'>;
      lNori: LockedNORI;
      signer: SignerWithAddress;
    },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const runSubtask = hre.run as RunVestingWithSubTasks; // todo why do i need this
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
          d.lastRevocationTime.__new ||
          (d.lastQuantityRevoked.__new === '0' && d.lastRevocationTime.__new)
      )
    );
    hre.log(
      chalk.bold.bgWhiteBright.black(
        `Found ${grantRevocationDiffs.length} grants that needs revocation`
      )
    );
    if (grantRevocationDiffs.length > 0) {
      const fromAccounts = grantRevocationDiffs.map(
        (grant: any) => grant.recipient
      );
      const toAccounts = Array(grantRevocationDiffs.length).fill(
        signer.address
      ); // todo use flag to allow different to address for admin
      const atTimes = grantRevocationDiffs.map(
        (grant) => grant.lastRevocationTime.__new ?? grant.lastRevocationTime
      );
      const amounts = grantRevocationDiffs.map(
        (grant) =>
          BigNumber.from(
            grant.lastQuantityRevoked.__new ?? grant.lastQuantityRevoked
          ) // todo maybe throw error if this is not set to prevent mistakenly revoking full grant?
      );
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
    }
  },
} as const;
(() => {
  const { name, description, run } = GET_VESTING_TASK();
  task(name, description, run)
    .addOptionalPositionalParam(
      'action',
      'The action to perform: create | revoke | update',
      undefined,
      types.string
    )
    .addOptionalParam(
      'commit',
      'Use the grants known by a particular GitHub commit',
      'master',
      types.string
    )
    .addOptionalParam(
      'account',
      'The account index to connect using',
      0,
      types.int
    )
    .addOptionalParam('file', 'Use a file instead of github')
    .addFlag(DIFF_SUBTASK.name, DIFF_SUBTASK.description)
    .addFlag(
      'expand',
      'Print expanded information (including a full diff when using the --diff flag)'
    )
    .addFlag('asJson', 'Prints diff as JSON');

  subtask(DIFF_SUBTASK.name, DIFF_SUBTASK.description, DIFF_SUBTASK.run);
  subtask(UPDATE_SUBTASK.name, UPDATE_SUBTASK.description, UPDATE_SUBTASK.run);
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
  // todo --dry-run using CONTRACT.callStatic.methodName
})();
