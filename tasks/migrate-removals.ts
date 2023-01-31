/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */

import type { Contract, ContractReceipt, ContractTransaction } from 'ethers';
import { BigNumber, FixedNumber } from 'ethers';
import cliProgress from 'cli-progress';
import { task, types } from 'hardhat/config';
import { readJsonSync, writeJsonSync } from 'fs-extra';
import type { TransactionReceipt } from '@ethersproject/providers';

import type { Removal } from '@/typechain-types';
import { getLogger } from '@/utils/log';
import { parseTransactionLogs } from '@/utils/events';
import { getRemoval } from '@/utils/contracts';
import type { FireblocksSigner } from '@/plugins/fireblocks/fireblocks-signer';
import { Zero } from '@/constants/units';

export interface MigrateRemovalsTaskOptions {
  file: string;
  outputFile?: string;
  dryRun?: boolean;
}

type ParsedMigrateRemovalsTaskOptions = RequiredKeys<
  MigrateRemovalsTaskOptions,
  'file'
>;

interface RemovalData {
  idVersion: 0;
  methodology: 1;
  methodologyVersion: 0;
  country: 'US';
  subdivision: `${string}${string}`;
  supplierAddress: `0x${string}`;
  subIdentifier: number;
  vintage: number;
  parcelKey: string;
  removalKey: string;
}

interface Project {
  amounts: number[];
  removals: RemovalData[];
  projectId: number;
  scheduleStartTime: number;
  holdbackPercentage: number;
  txReceipt?: TransactionReceipt;
  tokenIds?: string[];
  error?: any;
}

interface InputData {
  amounts: number[];
  removals: RemovalData[];
  projectId: number;
  scheduleStartTime: number;
  holdbackPercentage: number;
}

type Projects = Project[];

interface Summary {
  totalRemovalSupplyOnChain: {
    sum: BigNumber;
    removals: BigNumber[];
    // projects: BigNumber[];
  };
  expectedTotalRemovalSupply: number;
}

const summarize = async ({
  outputData,
  inputData,
  removalContract,
}: {
  outputData: Projects;
  inputData: InputData[];
  removalContract: Removal;
}): Promise<Summary> => {
  const allRemovalIds = outputData.flatMap((project) => project.tokenIds!);
  const multicallData = allRemovalIds.map((tokenId) =>
    removalContract.interface.encodeFunctionData('totalSupply', [tokenId])
  );
  const removalAmountsOnChain = await removalContract.callStatic.multicall(
    multicallData
  );
  const bigNumberRemovalAmounts = removalAmountsOnChain.map((amount) =>
    BigNumber.from(amount)
  );
  const totalOnChainSupply = bigNumberRemovalAmounts.reduce(
    (total, next) => total.add(next),
    Zero
  );

  const totalRemovalSupplyOnChain = {
    sum: totalOnChainSupply,
    removals: bigNumberRemovalAmounts,
  };
  const expectedTotalRemovalSupply = inputData
    .map((d) => d.amounts)
    .reduce((total, next) => {
      return (
        total +
        next.reduce((t, n) => {
          return t + n;
        }, 0)
      );
    }, 0);
  return {
    totalRemovalSupplyOnChain,
    expectedTotalRemovalSupply,
  };
};

const validate = ({
  logger,
  summary,
}: {
  logger: ReturnType<typeof getLogger>;
  summary: Summary;
}): void => {
  const onChainSupplyTonnesInWei = summary.totalRemovalSupplyOnChain.sum;
  const offChainSupplyTonnesInWei = BigNumber.from(
    FixedNumber.from(summary.expectedTotalRemovalSupply)
  )
    .div(1_000_000)
    .toString();
  if (!onChainSupplyTonnesInWei.eq(offChainSupplyTonnesInWei)) {
    throw new Error(
      `Unexpected total supply, onChainSupplyTonnesInWei: ${onChainSupplyTonnesInWei}, offChainSupplyTonnesInWei: ${offChainSupplyTonnesInWei}`
    );
  }
  logger.success('🎉 Successfully validated the migration!');
};

const printSummary = ({
  logger,
  outputFileName,
  hre,
  summary,
}: {
  logger: ReturnType<typeof getLogger>;
  outputFileName: string;
  hre: CustomHardHatRuntimeEnvironment;
  summary: Summary;
}): void => {
  logger.info(`\n\nMigration summary:`);
  logger.table({
    'Output file name': { value: outputFileName },
    // 'Project count': {
    //   value: summary.totalRemovalSupplyOnChain.projects.length.toLocaleString(),
    // },
    'Removal count': {
      value: summary.totalRemovalSupplyOnChain.removals.length.toLocaleString(),
    },
    // 'Project totals on-chain (tonnes)': {
    //   value: summary.totalRemovalSupplyOnChain.projects.map((p) =>
    //     Number(ethers.utils.formatUnits(p, 18)).toLocaleString()
    //   ),
    // },
    'Total removal supply on-chain (tonnes)': {
      value: Number(
        hre.ethers.utils.formatUnits(summary.totalRemovalSupplyOnChain.sum, 18)
      ).toLocaleString(),
    },
  });
};

const asciiStringToHexString = (ascii: string): string => {
  return `0x${[...Array.from({ length: ascii.length }).keys()]
    .map((index) => ascii.charCodeAt(index).toString(16))
    .join('')}`;
};

const callWithTimeout = async (
  promise: Promise<any>,
  timeout: number
): Promise<unknown> => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Timed out waiting on transaction submission.')),
        timeout
      );
    }),
  ]).catch((error) => {
    throw error;
  });
};

export const GET_MIGRATE_REMOVALS_TASK = () =>
  ({
    name: 'migrate-removals',
    description: 'Utility to mint legacy removals',
    run: async (
      options: MigrateRemovalsTaskOptions,
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
      const TIMEOUT_DURATION = 1000 * 60 * 2; // 2 minutes

      const {
        file,
        outputFile = 'migrated-removals.json',
        dryRun,
      } = options as ParsedMigrateRemovalsTaskOptions;
      const logger = getLogger({
        prefix: dryRun === true ? '[DRY RUN]' : undefined,
        hre,
      });
      const outputFileName =
        dryRun === true ? `dryRun-${outputFile}` : outputFile;
      const network = hre.network.name;
      if (![`localhost`, `mumbai`, `polygon`].includes(network)) {
        throw new Error(
          `Network ${network} is not supported. Please use localhost, mumbai, or polygon.`
        );
      }
      const fullInputData: InputData[] = readJsonSync(file);
      let alreadyMintedResults = [];
      try {
        alreadyMintedResults = readJsonSync(outputFile);
      } catch {
        logger.info(
          'No existing migration results found. Continuing with full migration.'
        );
      }
      logger.info(
        `${alreadyMintedResults.length} projects already minted in ${outputFile}. Skipping first ${alreadyMintedResults.length} projects.`
      );
      const filteredInputData = fullInputData.slice(
        alreadyMintedResults.length
      );
      const outputData: Projects = alreadyMintedResults;

      const [signer] = await hre.getSigners();
      const signerAddress = await signer.getAddress();
      const removalContract = await getRemoval({
        hre,
        signer,
      });
      hre.log(`Removal contract address: ${removalContract.address}`);
      hre.log(`Signer address: ${signerAddress}`);
      // const fireblocksSigner = removalContract.signer as FireblocksSigner;
      const signerHasConsignorRole = await removalContract.hasRole(
        await removalContract.CONSIGNOR_ROLE(),
        signerAddress
      );
      if (!signerHasConsignorRole) {
        throw new Error(
          `Signer does not have the CONSIGNOR role in the removal contract`
        );
      }

      logger.info(
        `Minting removals for ${filteredInputData.length} projects...`
      );
      const PROGRESS_BAR = new cliProgress.SingleBar(
        {},
        cliProgress.Presets.shades_classic
      );
      PROGRESS_BAR.start(filteredInputData.length, 0);
      // submit all mintBatch transactions serially to avoid nonce collision!
      let projectIndex = 0;
      for (const project of filteredInputData) {
        const amounts = project.amounts.map((amount) =>
          BigNumber.from(FixedNumber.from(amount)).div(1_000_000)
        );
        const removals = project.removals.map((removal) => {
          const removalData = {
            idVersion: removal.idVersion,
            methodology: removal.methodology,
            methodologyVersion: removal.methodologyVersion,
            vintage: removal.vintage,
            country: asciiStringToHexString(removal.country),
            subdivision: asciiStringToHexString(removal.subdivision),
            supplierAddress: removal.supplierAddress, // TODO need real supplier address on the project
            subIdentifier: removal.subIdentifier,
          };
          return removalData;
        });
        const migrationFunction =
          dryRun === true
            ? removalContract.callStatic.mintBatch
            : removalContract.mintBatch;

        // Enable this code to simulate a timeout on third project to be minted on localhost
        // if (projectIndex === 2 && network === 'localhost') {
        //   logger.info(`🚧 Intentionally timing out on third project`);
        //   migrationFunction = async () => {
        //     console.log('Calling the timeout fake mintBatch function...');
        //     await new Promise((resolve) =>
        //       // eslint-disable-next-line no-promise-executor-return -- script
        //       setTimeout(resolve, TIMEOUT_DURATION * 2)
        //     ); // will time out
        //   };
        // }

        let pendingTx: ContractTransaction;
        let tokenIds;
        let txReceipt;
        try {
          let maybePendingTx;
          if (network === `localhost` && dryRun === false) {
            // localhost non-dry-run requires manually setting gas price
            const gasPrice = await signer.getGasPrice();
            maybePendingTx = await callWithTimeout(
              migrationFunction(
                signerAddress, // mint to the consignor
                amounts,
                removals,
                project.projectId,
                project.scheduleStartTime,
                project.holdbackPercentage,
                { gasPrice }
              ),
              TIMEOUT_DURATION
            );
          } else {
            // all other cases
            maybePendingTx = await callWithTimeout(
              migrationFunction(
                signerAddress, // mint to the consignor
                amounts,
                removals,
                project.projectId,
                project.scheduleStartTime,
                project.holdbackPercentage
              ),
              TIMEOUT_DURATION
            );
          }

          if (maybePendingTx === undefined) {
            throw new Error(`No pending transaction returned`);
          } else {
            pendingTx = maybePendingTx;
          }
          if (dryRun === false) {
            logger.info(`📝 Awaiting transaction: ${pendingTx.hash}`);
            const txResult =
              network === `localhost`
                ? await callWithTimeout(pendingTx.wait(), TIMEOUT_DURATION)
                : await callWithTimeout(pendingTx.wait(2), TIMEOUT_DURATION); // TODO what is the correct number of confirmations for mainnet?
            txReceipt = (await callWithTimeout(
              removalContract.provider.getTransactionReceipt(
                (txResult as ContractReceipt).transactionHash
              ),
              TIMEOUT_DURATION
            )) as TransactionReceipt;
            tokenIds = parseTransactionLogs({
              contractInstance: removalContract,
              txReceipt,
              eventNames: ['TransferBatch'],
            }).flatMap((log) =>
              log.args.ids.map((id: BigNumber) => id.toString())
            );
            if (txReceipt.status !== 1) {
              logger.error(
                `❌ Transaction ${pendingTx.hash} failed with failure status ${txReceipt.status} - exiting early`
              );
              return;
            }
          }
          PROGRESS_BAR.increment();
          outputData.push({
            ...project,
            txReceipt,
            tokenIds,
          });
        } catch (error) {
          logger.error(
            `❌ Error minting project ${project.projectId} (number ${projectIndex}/${filteredInputData.length}) - exiting early`
          );
          PROGRESS_BAR.stop();
          logger.error(error);
          // For now, suppressing the writing of errors to the output file
          // outputData.push({
          //   ...project,
          //   error,
          // });
          logger.info(`Writing current output results to ${outputFileName}`);
          writeJsonSync(outputFileName, outputData);
          throw error;
        }
        projectIndex += 1;
      }
      PROGRESS_BAR.stop();
      writeJsonSync(outputFileName, outputData);
      if (!Boolean(dryRun)) {
        logger.info('Starting validation and summary...');
        const summary = await summarize({
          outputData,
          removalContract,
          inputData: fullInputData,
        });
        logger.info('finished summary, printing summary...');
        printSummary({
          logger,
          outputFileName,
          hre,
          summary,
        });
        logger.info('starting validation');
        await validate({ summary, logger });
      } else {
        logger.info(
          `📝 Skipping validation and summary as it is not possible to do either in a dry run`
        );
      }
      logger.success(`🎉 Done!`);
    },
  } as const);

(() => {
  const { name, description, run } = GET_MIGRATE_REMOVALS_TASK();
  task(name, description, run)
    .addParam(
      'file',
      'JSON removal data to read',
      undefined,
      types.string,
      false
    )
    .addFlag('dryRun', 'simulate the transaction without actually sending it');
})();
