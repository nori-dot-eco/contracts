/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */
import { readFileSync, writeFileSync } from 'fs';

import cliProgress from 'cli-progress';
import { divide } from '@nori-dot-com/math';
import { task, types } from 'hardhat/config';
import { ethers } from 'ethers';
import chalk from 'chalk';
import { parseTransactionLogs } from '@nori-dot-com/contracts/utils/events';

import type { FireblocksSigner } from '../plugins/fireblocks/fireblocks-signer';

import { getCertificate } from '@/utils/contracts';

interface MigrateCertificatesTaskOptions {
  file: string;
  outputFile?: string;
  dryRun?: boolean;
}

type ParsedMigrateCertificatesTaskOptions = RequiredKeys<
  MigrateCertificatesTaskOptions,
  'file'
>;

export const GET_MIGRATE_CERTIFICATES_TASK = () =>
  ({
    name: 'migrate-certificates',
    description: 'Utility to migrate legacy certificates',
    run: async (
      options: MigrateCertificatesTaskOptions,
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
      const {
        file,
        outputFile = 'migrated-certificates.json',
        dryRun,
      } = options as ParsedMigrateCertificatesTaskOptions;
      const jsonData = JSON.parse(readFileSync(file, 'utf8'));
      // hre.log({ jsonData });

      const [signer] = await hre.getSigners();
      const signerAddress = await signer.getAddress();
      const { getRemoval } = await import('@/utils/contracts');
      const removalContract = await getRemoval({
        hre,
        signer,
      });
      const certificateContract = await getCertificate({
        hre,
        signer,
      });
      hre.log(`Removal contract address: ${removalContract.address}`);
      hre.log(`Certificate contract address: ${certificateContract.address}`);
      hre.log(`Signer address: ${signerAddress}`);
      // const fireblocksSigner = removalContract.signer as FireblocksSigner;

      // submit all migrate transactions serially to avoid nonce collision!
      let certificateIndex = 1;
      const pendingTransactions = [];
      if (!dryRun) {
        hre.log(
          chalk.bold.white(
            `✨ Migrating ${jsonData.length} legacy certificates...`
          )
        );
        hre.log(chalk.white(`🤞 Submitting transactions...`));
      } else {
        hre.log(
          chalk.bold.white(
            `DRY RUN 🌵 Migrating ${jsonData.length} legacy certificates...`
          )
        );
      }

      for (const certificate of jsonData) {
        const amounts = certificate.amounts.map((amount: string) =>
          ethers.utils
            .parseUnits(divide(Number(amount), 1_000_000).toString())
            .toString()
        );

        if (!dryRun) {
          let pendingTx: ethers.ContractTransaction;
          try {
            pendingTx = await removalContract.migrate(
              certificate.ids,
              amounts,
              signerAddress, // TODO use Nori admin address, which may also be the signer?
              ethers.utils
                .parseUnits(certificate.data.numberOfNrts.toString())
                .toString()
            );
            pendingTransactions.push(pendingTx);
            hre.log(
              `(${certificateIndex}/${jsonData.length}) datastore ID: ${
                certificate.id
              } txHash: ${chalk.green(pendingTx.hash)}`
            );
          } catch (error) {
            hre.log(
              `(${certificateIndex}/${jsonData.length}) datastore ID: ${
                certificate.id
              } ${chalk.red('error')}`
            );
            pendingTransactions.push(error);
          }
        } else {
          // dry run
          try {
            await removalContract.callStatic.migrate(
              certificate.ids,
              amounts,
              signerAddress, // TODO make sure this is the Nori admin address that can transfer certificates
              ethers.utils
                .parseUnits(certificate.data.numberOfNrts.toString())
                .toString()
            );
            hre.log(
              `(${certificateIndex}/${jsonData.length}) projectId: ${certificate.id} 🎉  Dry run was successful!`
            );
          } catch {
            hre.log(
              `(${certificateIndex}/${jsonData.length}) projectId: ${certificate.id} 💀 Dry run was unsuccessful!`
            );
          }
        }
        certificateIndex += 1;
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

        const txResults = await Promise.all(
          pendingTransactions.map(async (tx) => {
            let txResult;
            let tokenId;
            if (tx instanceof Error) {
              txResult = tx;
              failedTxnCount += 1;
            } else {
              const result = await tx.wait(); // TODO specify more than one confirmation?
              const txReceipt =
                await removalContract.provider.getTransactionReceipt(
                  result.transactionHash
                );
              tokenId = parseTransactionLogs({
                contractInstance: removalContract,
                txReceipt,
              })
                .filter((log) => log.name === 'Migrate')
                .flatMap((log) => log.args.certificateId.toNumber())[0];

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
              tokenId,
            };
          })
        );
        PROGRESS_BAR.stop();
        hre.log(`\n`);
        hre.log(
          chalk.bold.green(
            `\nMigrated ${successfulTxnCount} certificates successfully!`
          )
        );
        hre.log(
          failedTxnCount
            ? chalk.bold.red(
                `Failed to migrate ${failedTxnCount} certificates.`
              )
            : chalk.bold.green(`Failed to migrate 0 certificates.`)
        );

        const migrateResults = jsonData.map((certificate, index) => {
          const resultForCertificate = txResults[index];
          hre.log(
            `(${index + 1}/${jsonData.length}) datastoreId: ${
              certificate.id
            } Transaction status: ${
              resultForCertificate.txReceiptOrError.status ?? 'error'
            } Token ID: ${resultForCertificate.tokenId}`
          );
          return {
            ...certificate,
            ...resultForCertificate,
          };
        });
        writeFileSync(outputFile, JSON.stringify(migrateResults));
        hre.log(chalk.white(`📝 Wrote results to ${outputFile}`));
        hre.log(chalk.white.bold(`🎉 Done!`));
      }
    },
  } as const);

(() => {
  const { name, description, run } = GET_MIGRATE_CERTIFICATES_TASK();
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
