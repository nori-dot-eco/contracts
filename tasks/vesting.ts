import fs from 'fs';

import * as yup from 'yup';
import csv from 'csvtojson';
import { task, subtask, types } from 'hardhat/config';
import { BigNumber } from 'ethers';
import chalk from 'chalk';
import { diff, diffString } from 'json-diff';

import { formatTokenAmount } from '../utils/units';
import type { BridgedPolygonNORI, LockedNORI } from '../typechain-types';

import { getOctokit } from './utils/github';

import { getBridgedPolygonNori, getLockedNori } from '@/utils/contracts';

// // README
// // This script is for reading in a CSV file of token grants with unlocking schedules.
// // A sample file format is part of NO-1463:
// // https://docs.google.com/spreadsheets/d/1NC-jlGSxY6i7IM6v_u7HpZAerO1Hrh-sFaQpLuzm0uI/edit#gid=834947403
// // This is only for grants that have an unlocking schedule with 1 or 2 cliffs; optionally
// // they may also have a vesting schedule.

// // Configuration
// const grantFilePath = './csv-examples/grants-with-unlocking_v4.csv';

// // CSV token grants data interface
// // this has more optional properties than our smart contract grant constructor
// interface GrantFromCSV {
//   walletAddress: string;
//   amount: bigint;
//   startTime: string;
//   vestEndTime?: string;
//   unlockEndTime: string;
//   cliff1Time: string;
//   cliff2Time?: string;
//   vestCliff1Amount?: bigint;
//   vestCliff2Amount?: bigint;
//   unlockCliff1Amount?: bigint;
//   unlockCliff2Amount?: bigint;
//   lastRevocationTime?: string;
// }
// type GrantsFromCSV = GrantFromCSV[];

// // Load grants from CSV
// let raw = '';
// try {
//   raw = fs.readFileSync(grantFilePath, 'utf8');
// } catch (err) {
//   console.error(err);
// }

// // Parse grants from CSV
// const csv = parse(raw, { columns: true });
// const grants: GrantsFromCSV = [];
// const wallets: { [key: string]: number } = {};
// csv.forEach( (row: any) => {
//   validateGrant(row);
//   const grant: GrantFromCSV = grantFromRow(row);
//   grants.push(grant);
//   // console.log('Got a valid row for wallet: ' + row.walletAddress);
// });
// console.log(`Success! Read ${grants.length} grants from CSV`);

// // validateGrant()
// // checks for valid data in a single row from a CSV file;
// // once any invalid data is found, prints an error and exits
// const validateGrant= (row: any)=> {
//   // walletAddress - required to be valid and unique

//   if (!isValidAddr(row.walletAddress)) {
//     fatalErr(`Invalid walletAddress: ${row.walletAddress}`);
//   }
//   if (wallets[row.walletAddress] === 1) {
//     fatalErr(`Duplicate walletAddress: ${row.walletAddress}`);
//   } else {
//     wallets[row.walletAddress] = 1;
//   }
//   // contactUUID - ignore (not required)
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

// // isValidAmount()
// // returns true or false given a string, allows up to 18 decimal places
// const isValidAmount:(a: string): boolean =>{
//   // valid currency amounts have up to 18 decimal places
//   const regAmt = /^[0-9,]*\.?[0-9]{0,18}$/;
//   const i: bigint = intAmount(a);
//   return regAmt.test(a) && !isNaN(Number(i));
// }

// // intAmount()
// // converts a token amount string to an integer times (10^18)
// const intAmount:(a: string): bigint =>{
//   const i = BigInt(shiftDecimal(a));
//   return i;
// }
// // shiftDecimal()
// // similar to multiplying by (10^18), but operates on a string from CSV format
// const shiftDecimal:(a: string): string =>{
//   // remove any commas (the RegExp above allows commas to the left of the decimal)
//   const nocommas: string = a.replace(/,/g, '');
//   let result: string;
//   if (nocommas.indexOf('.') === -1) {
//     result = nocommas.concat(zeroes(18));
//   } else {
//     let decimals: string = nocommas.substring(nocommas.indexOf('.') + 1);
//     if (decimals.length < 18) {
//       decimals = decimals.concat(zeroes(18 - decimals.length));
//     }
//     result = nocommas.substring(0, nocommas.indexOf('.')).concat(decimals);
//   }
//   return result;
// }

// // zeroes()
// // return a string of a given number of zeroes
// const zeroes = (i: number): string => {
//   let zeroes = '';
//   while (zeroes.length < i) {
//     zeroes = zeroes.concat('0');
//   }
//   return zeroes;
// };

// // is ValidAddr()
// // returns true or false for a valid wallet address from a CSV field string
// const isValidAddr = (a: string): boolean => {
//   // valid addresses start with "0x" and have 20 bytes in hexadecimal
//   // note: we don't test the checksum or confirm this wallet exists on Polygon
//   const regAddr = /^(0x){1}[0-9a-fA-F]{40}$/;
//   return regAddr.test(a);
// };

// // fatalErr()
// // output an error message to the console and exit
// const fatalErr = (err: string) => {
//   console.error(err);
//   process.exit(1);
// };

const grantSchema = yup.lazy((details) => {
  return yup.object(
    Object.fromEntries(
      Object.keys(details).map((key) => [
        key,
        yup.object({
          recipient: yup.string().defined(), // todo further constrain
          grantAmount: yup.object().defined() as any, // todo further constrain
          // .test('int', 'must be big number', (val) => val instanceof BigNumber)
          startTime: yup.number().defined(), // todo further constrain
          vestEndTime: yup.number().defined(), // todo further constrain
          unlockEndTime: yup.number().defined(), // todo further constrain
          cliff1Time: yup.number().defined(), // todo further constrain
          cliff2Time: yup.number().defined(), // todo further constrain
          vestCliff1Amount: yup.object() as any, // todo further constrain
          vestCliff2Amount: yup.object() as any, // todo further constrain
          unlockCliff1Amount: yup.object() as any, // todo further constrain
          unlockCliff2Amount: yup.object() as any, // todo further constrain
          lastRevocationTime: yup.number().optional(), // todo further constrain
        }),
      ])
    )
  );
});

type ParsedGrant = yup.InferType<typeof grantSchema>;
interface Grants {
  github: ParsedGrant;
  blockchain: ParsedGrant;
}

type RunVestingWithSubTasks = <
  TTaskKind extends typeof LIST_SUBTASK | typeof UPDATE_SUBTASK
>(
  name: TTaskKind['name'],
  taskArguments: Parameters<TTaskKind['run']>[0]
) => Promise<ReturnType<typeof LIST_SUBTASK['run']>>;

export const TASK = {
  name: 'vesting',
  description: 'Utilities for handling vesting',
  run: async (
    {
      list,
      commit,
      update,
      account,
    }: { list: boolean; commit: string; update: boolean; account: number },
    _: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const signer = (await hre.ethers.getSigners())[account];
    const bpNori = getBridgedPolygonNori({ network: hre.network.name, signer });
    const lNori = getLockedNori({ network: hre.network.name, signer });
    const { data } = await getOctokit().rest.repos.getContent({
      mediaType: {
        format: 'raw',
      },
      ref: commit,
      owner: 'nori-dot-eco',
      repo: 'grants',
      path: 'grants.csv',
    });
    const githubGrants: ParsedGrant = (
      await csv({
        checkColumn: true,
        colParser: {
          recipient: (item) => {
            if (!item) {
              throw new Error('Invalid row without a recipient column');
            }
            return item; // todo validate
          },
          contactUUID: 'omit',
          grantAmount: (item) => {
            return formatTokenAmount(Number(item ?? 0)).toString(); // todo validate
          },
          startTime: (item) => {
            let startTime: number;
            if (item === '') {
              startTime = new Date(1_000).getTime() / 1_000; // todo only if vestEndTimeIsAlso ===''
            } else {
              startTime = new Date(item).getTime() / 1_000;
            }
            return startTime; // todo validate // todo mathjs
          },
          vestEndTime: (item) => {
            let vestEndTime: number;
            if (item === '') {
              vestEndTime = 0; // todo only if startTime === ''
            } else {
              vestEndTime = new Date(item).getTime() / 1_000;
            }
            return vestEndTime; // todo validate // todo mathjs
          },
          unlockEndTime: (item) => {
            return new Date(item).getTime() / 1_000; // todo validate // todo mathjs
          },
          cliff1Time: (item, _head, _resultRow, row, colIdx) => {
            return item ? new Date(item).getTime() / 1_000 : 0; // todo validate // todo mathjs
          },
          cliff2Time: (item) => {
            return item ? new Date(item).getTime() / 1_000 : 0; // todo validate // todo mathjs
          },
          vestCliff1Amount: (item) => {
            return formatTokenAmount(Number(item ?? 0)).toString(); // todo validate
          },
          vestCliff2Amount: (item) => {
            return formatTokenAmount(Number(item ?? 0)).toString(); // todo validate
          },
          unlockCliff1Amount: (item) => {
            return formatTokenAmount(Number(item ?? 0)).toString(); // todo validate
          },
          unlockCliff2Amount: (item) => {
            return formatTokenAmount(Number(item ?? 0)).toString(); // todo validate
          },
          lastRevocationTime: (item) => {
            return item ? new Date(item).getTime() / 1_000 : 0; // todo validate
          },
        },
      }).fromString(data.toString())
    ).reduce((acc, val): ParsedGrant => {
      // todo throw error if dupe
      return { ...acc, [val.recipient]: val };
    }, {} as ParsedGrant);
    // await grantSchema.validate(githubGrants); // todo verify working
    const blockchainGrants = (
      await lNori.batchGetGrant(Object.keys(githubGrants))
    ).reduce((acc, grant): ParsedGrant => {
      return grant.recipient === hre.ethers.constants.AddressZero
        ? acc
        : {
            ...acc,
            [grant.recipient]: {
              recipient: grant.recipient,
              grantAmount: grant.grantAmount.toString(),
              startTime: grant.startTime.toNumber(),
              vestEndTime: grant.vestEndTime.toNumber(),
              unlockEndTime: grant.unlockEndTime.toNumber(),
              cliff1Time: grant.cliff1Time.toNumber(),
              cliff2Time: grant.cliff2Time.toNumber(),
              vestCliff1Amount: grant.vestCliff1Amount.toString(),
              vestCliff2Amount: grant.vestCliff2Amount.toString(),
              unlockCliff1Amount: grant.unlockCliff1Amount.toString(),
              unlockCliff2Amount: grant.unlockCliff2Amount.toString(),
              lastRevocationTime: grant.lastRevocationTime.toNumber(), // todo
            },
          };
    }, {} as ParsedGrant) as ParsedGrant;
    const grants: Grants = {
      github: githubGrants,
      blockchain: blockchainGrants,
    };
    if (list) {
      const runSubtask = hre.run as RunVestingWithSubTasks;
      await runSubtask('list', { grants });
    }
    if (update) {
      const runSubtask = hre.run as RunVestingWithSubTasks;
      await runSubtask('update', { grants, bpNori, lNori });
    }
  },
} as const;

const LIST_SUBTASK = {
  name: 'list',
  description: 'List all grants',
  run: async (
    { grants }: { grants: Grants },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    hre.log(grants);
    return Promise.resolve();
  },
} as const;
// todo --diff subtask
const UPDATE_SUBTASK = {
  name: 'update',
  description: 'Update grants on-chain',
  run: async (
    {
      grants: { github: githubGrants, blockchain: blockchainGrants },
      bpNori,
      lNori,
    }: {
      grants: {
        github: ParsedGrant[keyof ParsedGrant];
        blockchain: ParsedGrant[keyof ParsedGrant];
      };
      bpNori: BridgedPolygonNORI;
      lNori: LockedNORI;
    },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    hre.log(diffString(blockchainGrants, githubGrants));
    const diffs = Object.values(
      diff(blockchainGrants, githubGrants, { full: true })
    );
    const grantDiffs: any[] = Object.values(diffs).filter((d: any) => {
      return (
        !d.lastRevocationTime.__new &&
        Object.values(d).find((v: any) => v.__new)
      );
    });
    const grantRevocationDiffs: any[] = Object.values(
      diffs.filter((d: any) => d.lastRevocationTime.__new)
    );
    hre.log(
      chalk.bold.bgWhiteBright.black(
        `Found ${grantDiffs.length} grants that need updating`
      )
    );
    hre.log(
      chalk.bold.bgWhiteBright.black(
        `Found ${grantRevocationDiffs.length} grants that need revocations`
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
          // lastRevocationTime: '' // todo use
        ]
      );
    };
    if (grantDiffs.length) {
      const recipients = grantDiffs.map((_) => lNori.address);
      const amounts = grantDiffs.map((grant) =>
        BigNumber.from(grant.grantAmount.__new ?? grant.grantAmount)
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
      // todo batch revoke
      const result = await batchCreateGrantsTx.wait();
      hre.log(
        chalk.bold.bgWhiteBright.black(
          `\r\n⏰ Waiting for transaction (tx: ${batchCreateGrantsTx.hash})\r\n`
        )
      );
      if (result.status === 1) {
        hre.log(
          chalk.bold.bgWhiteBright.black(
            `\r\n🎉 Created ${grantDiffs.length} grants (tx: ${result.transactionHash})\r\n`
          )
        );
      }
    }

    // todo batch revoke
    hre.log(
      chalk.bold.bgWhiteBright.black(
        `\r\nℹ️  Revoked ${
          grantRevocationDiffs.length
        } grants (tx: ${'TODO'})\r\n`
      )
    );
  },
} as const;

task(TASK.name, TASK.description, TASK.run)
  .addOptionalParam(
    LIST_SUBTASK.name,
    LIST_SUBTASK.description,
    false,
    types.boolean
  )
  .addOptionalParam(
    'commit',
    'Use the grants known by a particular GitHub commit',
    'master',
    types.string
  )
  .addOptionalPositionalParam('update', 'Update grants on-chain')
  .addOptionalParam(
    'account',
    'The account index to connect using',
    0,
    types.int
  );

subtask(LIST_SUBTASK.name, LIST_SUBTASK.description, LIST_SUBTASK.run);
subtask(UPDATE_SUBTASK.name, UPDATE_SUBTASK.description, UPDATE_SUBTASK.run);

// todo --file (for local debugging)
