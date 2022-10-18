/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */
import { readFileSync, writeFileSync } from 'fs';

import cliProgress from 'cli-progress';
import { divide } from '@nori-dot-com/math';
import { task, types } from 'hardhat/config';
import type { BigNumber } from 'ethers';
import { ethers } from 'ethers';
import chalk from 'chalk';
import { parseTransactionLogs } from '@nori-dot-com/contracts/utils/events';

import type { FireblocksSigner } from '../plugins/fireblocks/fireblocks-signer';
import { getRemoval } from '../utils/contracts';

interface MigrateRemovalsTaskOptions {
  file: string;
  outputFile?: string;
  dryRun?: boolean;
}

type ParsedMigrateRemovalsTaskOptions = RequiredKeys<
  MigrateRemovalsTaskOptions,
  'file'
>;

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
      const jsonData = JSON.parse(readFileSync(file, 'utf8'));
      // hre.log({ jsonData });

      const [signer] = await hre.getSigners();
      const signerAddress = await signer.getAddress();
      const removalContract = await getRemoval({
        hre,
        signer,
      });
      hre.log(`Removal contract address: ${removalContract.address}`);
      hre.log(`Signer address: ${signerAddress}`);
      // const fireblocksSigner = removalContract.signer as FireblocksSigner;

      if (!dryRun) {
        hre.log(
          chalk.bold.white(
            `✨ Minting removals for ${jsonData.length} projects...`
          )
        );
        hre.log(chalk.white(`🤞 Submitting transactions...`));
      } else {
        hre.log(
          chalk.bold.white(
            `DRY RUN 🌵 Minting removals for ${jsonData.length} projects...`
          )
        );
      }
      // submit all mintBatch transactions serially to avoid nonce collision!
      const pendingTransactions = [];
      let projectIndex = 1;
      for (const project of jsonData) {
        const amounts = project.amounts.map((amount: string) =>
          ethers.utils
            .parseUnits(divide(Number(amount), 1_000_000).toString())
            .toString()
        );

        const removals = project.removals.map((removal: any, index) => {
          const removalData = {
            idVersion: Number(removal.idVersion),
            // methodology: Number(removal.methodology), // TODO
            // methodologyVersion: Number(removal.methodologyVersion), // TODO
            methodology: 1,
            methodologyVersion: 0,
            vintage: Number(removal.vintage),
            country: asciiStringToHexString(removal.country),
            subdivision: asciiStringToHexString(
              removal.subdivision.slice(0, 2)
            ), // TODO we only want the state code here, original script was giving full substring
            supplierAddress: '0x9A232b2f5FbBf857d153Af8B85c16CBDB4Ffb667', // TODO need real supplier address on the project
            subIdentifier: (project.projectId % 1000) + index, // TODO get from removal
          };
          return removalData;
        });

        if (!dryRun) {
          let pendingTx: ethers.ContractTransaction;
          try {
            pendingTx = await removalContract.mintBatch(
              signerAddress, // mint to the consigner
              amounts,
              removals,
              project.projectId,
              // firstProject.scheduleStartTime, // TODO this can't be 0
              // projectIndex === 1 ? 0 : 1_665_441_893, // <-- to induce a revert
              1_665_441_893,
              project.holdbackPercentage
            );

            pendingTransactions.push(pendingTx);
            hre.log(
              `(${projectIndex}/${jsonData.length}) projectId: ${
                project.projectId
              } txHash: ${chalk.green(pendingTx.hash)}`
            );
          } catch (error) {
            hre.log(
              `(${projectIndex}/${jsonData.length}) projectId: ${
                project.projectId
              } ${chalk.red('error')}`
            );
            pendingTransactions.push(error);
          }
        } else {
          // dry run

          try {
            await removalContract.callStatic.mintBatch(
              signerAddress, // mint to the consigner
              amounts,
              removals,
              project.projectId,
              // firstProject.scheduleStartTime, // TODO this can't be 0
              // projectIndex === 1 ? 0 : 1_665_441_893, // <-- to induce a revert
              1_665_441_893,
              project.holdbackPercentage
            );
            hre.log(
              `(${projectIndex}/${jsonData.length}) projectId: ${project.projectId} 🎉  Dry run was successful!`
            );
          } catch {
            hre.log(
              `(${projectIndex}/${jsonData.length}) projectId: ${project.projectId} 💀 Dry run was unsuccessful!`
            );
          }
        }
        projectIndex += 1;
      }
      if (!dryRun) {
        hre.log(chalk.white('\n👷 Waiting for transactions to finalize...'));
        const PROGRESS_BAR = new cliProgress.SingleBar(
          {},
          cliProgress.Presets.shades_classic
        );
        PROGRESS_BAR.start(pendingTransactions.length, 0);

        hre.log(`\n`);
        let successfulTxnCount = 0;
        let failedTxnCount = 0;

        // asynchronously await the completion of all transactions
        const txResults = await Promise.all(
          pendingTransactions.map(async (tx, index) => {
            let txResult;
            let tokenIds;
            if (tx instanceof Error) {
              txResult = tx;
              failedTxnCount += 1;
            } else {
              const result = await tx.wait(); // TODO specify more than one confirmation?
              const txReceipt =
                await removalContract.provider.getTransactionReceipt(
                  result.transactionHash
                );
              tokenIds = parseTransactionLogs({
                contractInstance: removalContract,
                txReceipt,
              })
                .filter((log) => log.name === 'TransferBatch')
                .flatMap((log) =>
                  log.args.ids.map((id: BigNumber) => id.toHexString())
                );
              if (txReceipt.status === 1) {
                successfulTxnCount += 1;
              } else {
                failedTxnCount += 1;
              }
              txResult = txReceipt;
            }

            // TODO get rid of this fake asynchronous delay
            await new Promise((resolve) => {
              setTimeout(resolve, Math.random() * 6000);
            });
            PROGRESS_BAR.increment();
            return {
              txReceiptOrError: txResult,
              tokenIds,
            };
          })
        );
        PROGRESS_BAR.stop();
        hre.log(`\n`);
        hre.log(
          chalk.bold.green(
            `\nMinted ${successfulTxnCount} projects successfully!`
          )
        );
        hre.log(
          failedTxnCount
            ? chalk.bold.red(`Failed to mint ${failedTxnCount} projects.`)
            : chalk.bold.green(`Failed to mint 0 projects.`)
        );
        const mintingResults = jsonData.map((project, index) => {
          const txResult = txResults[index];
          hre.log(
            `(${index + 1}/${jsonData.length}) projectId: ${
              project.projectId
            }, Transaction status: ${
              txResult.txReceiptOrError.status ?? 'error'
            }`
          );

          return {
            ...project,
            txReceiptOrError: txResult.txReceiptOrError,
            tokenIds: txResult.tokenIds,
          };
        });
        writeFileSync(outputFile, JSON.stringify(mintingResults));
        hre.log(chalk.white(`📝 Wrote results to ${outputFile}`));
        hre.log(chalk.white.bold(`🎉 Done!`));
      }
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
