/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */
import { sign } from 'crypto';

import cliProgress from 'cli-progress';
import { task, types } from 'hardhat/config';
import { BigNumber, ethers } from 'ethers';
import chalk from 'chalk';
import { readJsonSync, writeJsonSync } from 'fs-extra';

import { parseTransactionLogs } from '@/utils/events';
import { getRemoval } from '@/utils/contracts';
import type { FireblocksSigner } from '@/plugins/fireblocks/fireblocks-signer';

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
      const network = await hre.network.name;
      if (![`localhost`, `mumbai`, `polygon`].includes(network)) {
        throw new Error(
          `Network ${network} is not supported. Please use localhost, mumbai, or polygon.`
        );
      }

      const jsonData = readJsonSync(file);

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
            .parseUnits(BigNumber.from(amount).div(1_000_000).toString())
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
            // subIdentifier: (project.projectId % 1000) + index,
            subIdentifier: removal.subIdentifier,
          };
          return removalData;
        });
        if (!dryRun) {
          let pendingTx: ethers.ContractTransaction;
          try {
            // TODO on a live network we probably don't need to do this??
            // make sure we're using the right gas price
            const gasPrice = await signer.getGasPrice();
            // hre.log(`Gas price: ${gasPrice.toString()}`);

            pendingTx = await removalContract.mintBatch(
              signerAddress, // mint to the consigner
              amounts,
              removals,
              project.projectId,
              project.scheduleStartTime,
              project.holdbackPercentage,
              {
                gasPrice,
              }
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
            writeJsonSync(outputFile, outputData);
            throw error;
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
        projectIndex += 1;
      }

      if (!dryRun) {
        PROGRESS_BAR.stop();
        hre.log(
          chalk.bold.green(`\nMinted ${jsonData.length} projects successfully!`)
        );
        writeJsonSync(outputFile, outputData);
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
