/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */
import cliProgress from 'cli-progress';
import { task, types } from 'hardhat/config';
import { BigNumber, ethers } from 'ethers';
import chalk from 'chalk';
import { parseTransactionLogs } from '@nori-dot-com/contracts/utils/events';
import { readJsonSync, writeJsonSync } from 'fs-extra';

import type { FireblocksSigner } from '@/plugins/fireblocks/fireblocks-signer';
import { getCertificate, getRemoval } from '@/utils/contracts';

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
      const certificateContract = await getCertificate({
        hre,
        signer,
      });
      hre.log(`Removal contract address: ${removalContract.address}`);
      hre.log(`Certificate contract address: ${certificateContract.address}`);
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
            `✨ Migrating ${jsonData.length} legacy certificates...`
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
            `DRY RUN 🌵 Migrating ${jsonData.length} legacy certificates...`
          )
        );
      }

      let certificateIndex = 1;
      for (const certificate of jsonData) {
        let amounts = certificate.amounts.map((amount: string) =>
          ethers.utils
            .parseUnits(BigNumber.from(amount).div(1_000_000).toString())
            .toString()
        );
        let ids = certificate.ids;
        const totalAmount = ethers.utils
          .parseUnits(
            BigNumber.from(certificate.data.gramsOfNrts)
              .div(1_000_000)
              .toString()
          )
          .toString();
        // TODO - this is just to bypass the 4 empty certificates in the input and double check
        // that we can migrate certificates with 0-amounts...
        // for the real deal we need those to have updated certificate sources
        if (amounts.length === 0) {
          amounts = [0];
          // TODO can this token ID just be 0?
          ids = [
            // '0x1007e2555349419a232b2f5fbbf857d153af8b85c16cbdb4ffb6678d7e5f93',
            '0x00000000000000000000000000000000000000000000000000000000000000',
          ];
        }

        if (!dryRun) {
          // TODO we probably don't need to do this on a live network
          // make sure we're using the right gas price
          const gasPrice = await signer.getGasPrice();
          // hre.log(`Gas price: ${gasPrice.toString()}`);

          let pendingTx: ethers.ContractTransaction;
          try {
            pendingTx = await removalContract.migrate(
              ids,
              amounts,
              signerAddress, // TODO use Nori admin address, which may also be the signer?
              totalAmount,
              { gasPrice }
            );
            const result = await pendingTx.wait(); // TODO specify more than one confirmation?
            const txReceipt =
              await removalContract.provider.getTransactionReceipt(
                result.transactionHash
              );
            const tokenId = parseTransactionLogs({
              contractInstance: removalContract,
              txReceipt,
            })
              .filter((log) => log.name === 'Migrate')
              .flatMap((log) => log.args.certificateId.toNumber())[0];

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
              ...certificate,
              txReceipt,
              tokenId,
            });
          } catch (error) {
            PROGRESS_BAR.stop();
            hre.log(
              chalk.red(
                `❌ Error minting certificate ${certificate.id} (number ${certificateIndex}/${jsonData.length}) - exiting early`
              )
            );
            hre.log(error);
            outputData.push({
              ...certificate,
              error,
            });
            writeJsonSync(outputFile, outputData);
            return;
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
        PROGRESS_BAR.stop();
        hre.log(
          chalk.bold.green(
            `\nMigrated ${jsonData.length} certificates successfully!`
          )
        );
        writeJsonSync(outputFile, outputData);
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
