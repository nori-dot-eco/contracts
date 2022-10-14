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
      // console.log({ jsonData });

      const [signer] = await hre.getSigners();
      const signerAddress = await signer.getAddress();
      // console.log({ signerAddress });
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
      // const fireblocksSigner = removalContract.signer as FireblocksSigner;

      // submit all migrate transactions serially to avoid nonce collision!
      const pendingTransactions = [];
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
          } catch (error) {
            console.error('Error submitting migrate transaction', error);
          }
        } else {
          // dry run
          try {
            await removalContract.callStatic.migrate(
              certificate.ids,
              amounts,
              '0x9A232b2f5FbBf857d153Af8B85c16CBDB4Ffb667', // TODO use Nori admin address
              ethers.utils.parseUnits(certificate.data.numberOfNrts).toString()
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
        const results = await Promise.all(
          pendingTransactions.map(async (tx) => {
            const txResult = await tx.wait(); // TODO specify more than one confirmation?
            const txReceipt =
              await removalContract.provider.getTransactionReceipt(
                txResult.transactionHash
              );
            const certificateIdFromMigrateEvent = parseTransactionLogs({
              contractInstance: removalContract,
              txReceipt,
            })
              .filter((log) => log.name === 'Migrate')
              .flatMap((log) => log.args.certificateId.toNumber());
            // const certificateIdFromReceiveRemovalBatchEvent =
            //   parseTransactionLogs({
            //     contractInstance: certificateContract,
            //     txReceipt,
            //   })
            //     .filter((log) => log.name === 'ReceiveRemovalBatch')
            //     .flatMap((log) => log.args.certificateId.toNumber());
            console.log({
              tokenId: certificateIdFromMigrateEvent[0],
              // certificateIdFromReceiveRemovalBatchEvent,
            });
            // TODO make sure the status on this receipt is 1 (success)?
            return {
              txReceipt,
              tokenId: certificateIdFromMigrateEvent[0],
            };
          })
        );
        const migrateResults = jsonData.map((certificate, index) => {
          const resultForCertificate = results[index];
          return {
            ...certificate,
            ...resultForCertificate,
          };
        });
        writeFileSync(outputFile, JSON.stringify(migrateResults));
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

// TODO: add a task to verify the migration was successful?
