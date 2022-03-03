import fs from 'fs';

import csv from 'csvtojson';
import { task, subtask, types } from 'hardhat/config';
import type { BigNumber } from 'ethers';

import { formatTokenAmount } from '../utils/units';

import { getOctokit } from './utils/github';

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
//   revokeUnvestedTime?: string;
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
//   // revokeUnvestedTime - optional
//   if ('revokeUnvestedTime' in row && !(row.revokeUnvestedTime === '')) {
//     if (!isValidTime(row.revokeUnvestedTime)) {
//       fatalErr(`Invalid revokeUnvestedTime: ${row.revokeUnvestedTime}`);
//     }
//     if (Date.parse(row.revokeUnvestedTime) < Date.parse(row.startTime)) {
//       fatalErr(
//         `Invalid revokeUnvestedTime before startTime: ${row.revokeUnvestedTime}, ${row.startTime}`
//       );
//     }
//     if (Date.parse(row.revokeUnvestedTime) > Date.parse(row.vestEndTime)) {
//       fatalErr(
//         `Invalid revokeUnvestedTime after vestEndTime: ${row.revokeUnvestedTime}, ${row.vestEndTime}`
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
//   if ('revokeUnvestedTime' in row && row.revokeUnvestedTime !== '') {
//     grant.revokeUnvestedTime = row.revokeUnvestedTime;
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

interface ParsedGrant {
  // todo correct types
  walletAddress: string;
  contactUUID: string;
  amount: BigNumber;
  startTime: string;
  vestEndTime: string;
  unlockEndTime: string;
  cliff1Time: string;
  cliff2Time: string;
  vestCliff1Amount: string;
  vestCliff2Amount: string;
  unlockCliff1Amount: string;
  unlockCliff2Amount: string;
  revokeUnvestedTime: string;
}

type RunVestingWithSubTasks = <TTaskKind extends typeof LIST_SUBTASK>(
  name: TTaskKind['name'],
  taskArguments?: Parameters<TTaskKind['run']>[0]
) => Promise<ReturnType<typeof LIST_SUBTASK['run']>>;

export const TASK = {
  name: 'vesting',
  description: 'Utilities for handling vesting',
  run: async (
    { list, commit }: { list: boolean; commit: string },
    _: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    const runSubtask = hre.run as RunVestingWithSubTasks;
    const octokit = getOctokit();
    const { data } = await octokit.rest.repos.getContent({
      mediaType: { format: 'raw' },
      ref: commit,
      owner: 'nori-dot-eco',
      repo: 'grants',
      path: 'grants.csv',
    });
    const grants: ParsedGrant[] = await csv({
      colParser: {
        walletAddress: (walletAddress) => {
          if (!walletAddress) {
            throw new Error('Invalid row without a walletAddress column');
          }
          return walletAddress;
        },
        contactUUID: (item) => item,
        amount: (item) => {
          return formatTokenAmount(Number(item)); // todo validate
        },
        startTime: (item) => item,
        vestEndTime: (item) => item,
        unlockEndTime: (item) => item,
        cliff1Time: (item) => item,
        cliff2Time: (item) => item,
        vestCliff1Amount: (item) => item,
        vestCliff2Amount: (item) => item,
        unlockCliff1Amount: (item) => item,
        unlockCliff2Amount: (item) => item,
        revokeUnvestedTime: (item) => item,
      },
    }).fromString(data.toString());
    if (list) {
      await runSubtask('list', { grants });
    }
  },
} as const;

const LIST_SUBTASK = {
  name: 'list',
  description: 'List all grants',
  run: async (
    { grants }: { grants: ParsedGrant[] },
    hre: CustomHardHatRuntimeEnvironment
  ): Promise<void> => {
    hre.log(grants);
    return Promise.resolve();
  },
} as const;

task(TASK.name, TASK.description, TASK.run)
  .addOptionalParam('list', 'Lists all grants', false, types.boolean)
  .addOptionalParam(
    'commit',
    'Use the grants known by a particular GitHub commit',
    'master',
    types.string
  );
// todo --file (tests wont work otherwise)

subtask(LIST_SUBTASK.name, LIST_SUBTASK.description, LIST_SUBTASK.run);
