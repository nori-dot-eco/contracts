/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */
import { readFileSync, writeFileSync } from 'fs';

import { divide } from 'mathjs';
import { task, types } from 'hardhat/config';
import type { BigNumber } from 'ethers';
import { ethers } from 'ethers';
import type { Signer } from '@ethersproject/abstract-signer';
import chalk from 'chalk';
import { parseTransactionLogs } from '@nori-dot-com/contracts/utils/events';

import type { FireblocksSigner } from '../plugins/fireblocks/fireblocks-signer';

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
      // console.log({ jsonData });

      const [signer] = await hre.getSigners();
      const signerAddress = await signer.getAddress();
      // console.log({ signerAddress });
      const { getRemoval } = await import('@/utils/contracts');
      const removalContract = await getRemoval({
        hre,
        signer,
      });
      hre.log(`Removal contract address: ${removalContract.address}`);
      // const fireblocksSigner = removalContract.signer as FireblocksSigner;

      // submit all mintBatch transactions serially to avoid nonce collision!
      const pendingTransactions = [];
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
            ), // TODO we only want the state code here
            supplierAddress: '0x9A232b2f5FbBf857d153Af8B85c16CBDB4Ffb667', // TODO need real supplier address on the project
            subIdentifier: (project.projectId % 1000) + index, // TODO get from removal
          };
          // console.log({ index, removalData });
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
              1_665_441_893,
              project.holdbackPercentage
            );
            pendingTransactions.push(pendingTx);
          } catch (error) {
            console.error('Error submitting mintBatch');
            console.error(error);
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
              1_665_441_893, // default to now
              project.holdbackPercentage
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
      if (!dryRun) {
        // asynchronously await the completion of all transactions
        // TODO - proper error handling for the case where one of the transaction had failed and therefor the pending txn is undefined?
        const txResults = await Promise.all(
          pendingTransactions.map(async (tx, index) => {
            const result = await tx.wait(); // TODO specify more than one confirmation?
            const txReceipt =
              await removalContract.provider.getTransactionReceipt(
                result.transactionHash
              );
            // TODO make sure the status on this receipt is 1 (success)?
            // console.log({ txReceipt });
            const tokenIds = parseTransactionLogs({
              contractInstance: removalContract,
              txReceipt,
            })
              .filter((log) => log.name === 'TransferBatch')
              .flatMap((log) =>
                log.args.ids.map((id: BigNumber) => id.toHexString())
              );
            console.log({ tokenIds });
            return {
              txReceipt,
              tokenIds,
            };
          })
        );
        const mintingResults = jsonData.map((project, index) => {
          const txResult = txResults[index];
          return {
            ...project,
            txReceipt: txResult.txReceipt,
            tokenIds: txResult.tokenIds,
          };
        });
        writeFileSync(outputFile, JSON.stringify(mintingResults));
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
