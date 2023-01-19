/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */

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
    projects: BigNumber[];
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
  const totalRemovalSupplyOnChain = await outputData.reduce(
    async (summary, project) => {
      const updatedSummary = await summary;
      const projectTotals: BigNumber = await project.tokenIds!.reduce(
        async (total, removal) => {
          const updatedTotal = await total;
          const removalIdSupply = await removalContract.totalSupply(removal);
          const removalTotal = updatedTotal.add(removalIdSupply);
          updatedSummary.sum = updatedSummary.sum.add(removalIdSupply);
          updatedSummary.removals.push(removalTotal);
          return removalTotal;
        },
        Promise.resolve(Zero)
      );
      updatedSummary.projects.push(projectTotals);
      return updatedSummary;
    },
    Promise.resolve({
      sum: Zero,
      removals: [] as BigNumber[],
      projects: [] as BigNumber[],
    })
  );
  const expectedTotalRemovalSupply = inputData
    .map((d) => d.amounts)
    .reduce((total, next) => {
      return total + next.reduce((t, n) => t + n, 0);
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
    'Project count': {
      value: summary.totalRemovalSupplyOnChain.projects.length.toLocaleString(),
    },
    'Removal count': {
      value: summary.totalRemovalSupplyOnChain.removals.length.toLocaleString(),
    },
    'Project totals on-chain (tonnes)': {
      value: summary.totalRemovalSupplyOnChain.projects.map((p) =>
        Number(ethers.utils.formatUnits(p, 18)).toLocaleString()
      ),
    },
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

export const GET_MIGRATE_REMOVALS_TASK = () =>
  ({
    name: 'migrate-removals',
    description: 'Utility to mint legacy removals',
    run: async (
      options: MigrateRemovalsTaskOptions,
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
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
      const inputData: InputData[] = readJsonSync(file);
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

      const outputData: Projects = [];
      logger.info(`Minting removals for ${inputData.length} projects...`);
      const PROGRESS_BAR = new cliProgress.SingleBar(
        {},
        cliProgress.Presets.shades_classic
      );
      PROGRESS_BAR.start(inputData.length, 0);
      // submit all mintBatch transactions serially to avoid nonce collision!
      let projectIndex = 0;
      for (const project of inputData) {
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
        let pendingTx: Awaited<ReturnType<typeof migrationFunction>>;

        try {
          const gasPrice = await signer.getGasPrice(); // TODO on a live network we probably don't need to do this??
          pendingTx = await removalContract.mintBatch(
            signerAddress, // mint to the consignor
            amounts,
            removals,
            project.projectId,
            project.scheduleStartTime,
            project.holdbackPercentage,
            { gasPrice }
          );
          const txResult = await pendingTx.wait(1); // TODO specify more than one confirmation?
          const txReceipt =
            await removalContract.provider.getTransactionReceipt(
              txResult.transactionHash
            );
          const tokenIds = parseTransactionLogs({
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
          PROGRESS_BAR.increment();
          outputData.push({
            ...project,
            txReceipt,
            tokenIds,
          });
        } catch (error) {
          logger.error(
            `❌ Error minting project ${project.projectId} (number ${projectIndex}/${inputData.length}) - exiting early`
          );
          PROGRESS_BAR.stop();
          logger.error(error);
          outputData.push({
            ...project,
            error,
          });
          writeJsonSync(outputFileName, outputData);
          throw error;
        }
        projectIndex += 1;
      }
      PROGRESS_BAR.stop();
      writeJsonSync(outputFileName, outputData);
      if (!Boolean(dryRun)) {
        const summary = await summarize({
          outputData,
          removalContract,
          inputData,
        });
        printSummary({
          logger,
          outputFileName,
          hre,
          summary,
        });
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
