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

      const [signer] = await hre.getSigners();
      const signerAddress = await signer.getAddress();
      const removalContract = await getRemoval({
        hre,
        signer,
      });
      hre.log(`Removal contract address: ${removalContract.address}`);
      hre.log(`Signer address: ${signerAddress}`);
      // const fireblocksSigner = removalContract.signer as FireblocksSigner;

      let PROGRESS_BAR;
      const outputData = [];

      if (!dryRun) {
        hre.log(
          chalk.bold.white(
            `✨ Minting removals for ${jsonData.length} projects...`
          )
        );
        PROGRESS_BAR = new cliProgress.SingleBar(
          {},
          cliProgress.Presets.shades_classic
        );
        PROGRESS_BAR.start(jsonData.length, 0);
        hre.log(`\n`);
      } else {
        hre.log(
          chalk.bold.white(
            `DRY RUN 🌵 Minting removals for ${jsonData.length} projects...`
          )
        );
      }
      // submit all mintBatch transactions serially to avoid nonce collision!
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
            methodology: Number(removal.methodology),
            // methodologyVersion: Number(removal.methodologyVersion),
            methodologyVersion: 0, // TODO is this ever going to be different across legacy removals? depends on methodology version work
            vintage: Number(removal.vintage),
            country: asciiStringToHexString(removal.country),
            subdivision: asciiStringToHexString(removal.subdivision),
            supplierAddress: '0x9A232b2f5FbBf857d153Af8B85c16CBDB4Ffb667', // TODO need real supplier address on the project
            subIdentifier: (project.projectId % 1000) + index,
            // subIdentifer: removal.subIdentifier,
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
              project.scheduleStartTime,
              project.holdbackPercentage
            );
            const result = await pendingTx.wait(); // TODO specify more than one confirmation?
            const txReceipt =
              await removalContract.provider.getTransactionReceipt(
                result.transactionHash
              );
            const tokenIds = parseTransactionLogs({
              contractInstance: removalContract,
              txReceipt,
            })
              .filter((log) => log.name === 'TransferBatch')
              .flatMap((log) =>
                log.args.ids.map((id: BigNumber) => id.toHexString())
              );
            if (txReceipt.status !== 1) {
              // log an error that this transaction hash failed and we are exiting early
              hre.log(
                chalk.red(
                  `❌ Transaction ${pendingTx.hash} failed with failure status ${txReceipt.status} - exiting early`
                )
              );
              return;
            }
            // TODO remove this random sleep
            await new Promise((resolve) =>
              setTimeout(resolve, Math.floor(Math.random() * 2000))
            );
            PROGRESS_BAR.increment();
            outputData.push({
              ...project,
              txReceipt,
              tokenIds,
            });
          } catch (error) {
            hre.log(
              chalk.red(
                `❌ Error minting project ${project.projectId} (number ${projectIndex}/${jsonData.length}) - exiting early`
              )
            );
            PROGRESS_BAR.stop();
            hre.log(error);
            outputData.push({
              ...project,
              error,
            });
            writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
            return;
          }
        } else {
          // dry run
          try {
            await removalContract.callStatic.mintBatch(
              signerAddress, // mint to the consigner
              amounts,
              removals,
              project.projectId,
              project.scheduleStartTime,
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
        console.log({ projectIndex });
        projectIndex += 1;
      }

      if (!dryRun) {
        PROGRESS_BAR.stop();
        hre.log(`\n`);
        hre.log(
          chalk.bold.green(`\nMinted ${jsonData.length} projects successfully!`)
        );

        writeFileSync(outputFile, JSON.stringify(outputData, undefined, 2));
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
