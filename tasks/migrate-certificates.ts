/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */
import cliProgress from 'cli-progress';
import { task, types } from 'hardhat/config';
import { BigNumber, FixedNumber } from 'ethers';
import { readJsonSync, writeJsonSync } from 'fs-extra';
import type { TransactionReceipt } from '@ethersproject/providers';

import type { Certificate } from '../typechain-types';

import { getLogger } from '@/utils/log';
import { parseTransactionLogs } from '@/utils/events';
import { AddressZero, Zero } from '@/constants/units';
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

interface MigratedCertificate {
  key: string;
  data: {
    gramsOfNrts: number;
    gramsOfNrtsInWei: string;
  };
  ids: string[];
  amounts: number[];
  txReceipt?: TransactionReceipt;
  tokenId?: number;
  error?: any;
}

type MigratedCertificates = MigratedCertificate[];

interface Summary {
  totalCertificateSupplyOnChain: {
    sum: BigNumber;
    certificates: BigNumber[];
  };
  expectedTotalCertificateSupply: number;
}

interface InputData {
  key: string;
  ids: string[];
  amounts: number[];
  data: {
    gramsOfNrts: number;
    gramsOfNrtsInWei: string;
  };
}

const summarize = async ({
  hre,
  logger,
  outputData,
  inputData,
  certificateContract,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  logger: ReturnType<typeof getLogger>;
  outputData: MigratedCertificates;
  inputData: InputData[];
  certificateContract: Certificate;
}): Promise<Summary> => {
  const totalCertificateSupplyOnChain = await outputData.reduce(
    async (summary, certificate) => {
      const updatedSummary = await summary;
      const certificateIdAmount = await certificateContract.getPurchaseAmount(
        certificate.tokenId!
      );
      updatedSummary.certificates.push(certificateIdAmount);
      updatedSummary.sum = updatedSummary.sum.add(certificateIdAmount);
      return updatedSummary;
    },
    Promise.resolve({ sum: Zero, certificates: [] as BigNumber[] })
  );
  const expectedTotalCertificateSupply = inputData
    .map((d) => d.amounts)
    .reduce((total, next) => {
      return total + next.reduce((t, n) => t + n, 0);
    }, 0);
  return {
    totalCertificateSupplyOnChain,
    expectedTotalCertificateSupply,
  };
};

const validate = async ({
  hre,
  logger,
  summary,
}: {
  hre: CustomHardHatRuntimeEnvironment;
  logger: ReturnType<typeof getLogger>;
  summary: Summary;
}): Promise<void> => {
  const onChainSupplyTonnesInWei = summary.totalCertificateSupplyOnChain.sum;
  const offChainSupplyTonnesInWei = BigNumber.from(
    FixedNumber.from(summary.expectedTotalCertificateSupply)
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
  inputData,
  outputFileName,
  outputData,
  hre,
  summary,
}: {
  logger: ReturnType<typeof getLogger>;
  inputData: InputData[];
  outputFileName: string;
  outputData: MigratedCertificates;
  hre: CustomHardHatRuntimeEnvironment;
  summary: Summary;
}): void => {
  logger.info(`\n\nMigration summary:`);
  logger.table({
    'Output file name': { value: outputFileName },
    'Certificate count': {
      value:
        summary.totalCertificateSupplyOnChain.certificates.length.toLocaleString(),
    },
    'Total Certificate supply on-chain (tonnes)': {
      value: Number(
        hre.ethers.utils.formatUnits(
          summary.totalCertificateSupplyOnChain.sum,
          18
        )
      ).toLocaleString(),
    },
  });
};

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
      const logger = getLogger({
        prefix: dryRun === true ? '[DRY RUN]' : undefined,
        hre,
      });
      const outputFileName =
        dryRun === true ? `dryRun-${outputFile}` : outputFile;
      const network = await hre.network.name;
      if (![`localhost`, `mumbai`, `polygon`].includes(network)) {
        throw new Error(
          `Network ${network} is not supported. Please use localhost, mumbai, or polygon.`
        );
      }

      const inputData: MigratedCertificates = readJsonSync(file);

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
      logger.info(`Removal contract address: ${removalContract.address}`);

      logger.info(
        `Certificate contract address: ${certificateContract.address}`
      );

      logger.info(`Signer address: ${signerAddress}`);
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
      const outputData: MigratedCertificates = [];
      logger.info(`✨ Migrating ${inputData.length} legacy certificates...`);
      const PROGRESS_BAR = new cliProgress.SingleBar(
        {},
        cliProgress.Presets.shades_classic
      );
      PROGRESS_BAR.start(inputData.length, 0);

      let certificateIndex = 1;
      for (const certificate of inputData) {
        let amounts = certificate.amounts.map((amount) =>
          BigNumber.from(FixedNumber.from(amount)).div(1_000_000)
        );
        let ids = certificate.ids;
        const totalAmount = BigNumber.from(
          FixedNumber.from(certificate.data.gramsOfNrts)
        )
          .div(1_000_000)
          .toString();
        // TODO - this is just to bypass the 4 empty certificates in the input and double check
        // that we can migrate certificates with 0-amounts...
        // for the real deal we need those to have updated certificate sources
        if (amounts.length === 0) {
          amounts = [Zero];
          // TODO can this token ID just be 0?
          ids = [
            // '0x1007e2555349419a232b2f5fbbf857d153af8b85c16cbdb4ffb6678d7e5f93',
            AddressZero,
          ];
        }
        const migrationFunction =
          dryRun === true
            ? removalContract.callStatic.migrate
            : removalContract.migrate;
        // TODO we probably don't need to do this on a live network
        // make sure we're using the right gas price
        const gasPrice = await signer.getGasPrice();
        // hre.log(`Gas price: ${gasPrice.toString()}`);

        let pendingTx: Awaited<ReturnType<typeof migrationFunction>>;
        try {
          pendingTx = await migrationFunction(
            ids,
            amounts,
            signerAddress, // TODO use Nori admin address, which may also be the signer?
            totalAmount,
            { gasPrice }
          );
          let txReceipt: TransactionReceipt | undefined;
          let tokenId: number | undefined = certificateIndex;
          if (pendingTx !== undefined) {
            const result = await pendingTx.wait(); // TODO specify more than one confirmation?
            txReceipt = await removalContract.provider.getTransactionReceipt(
              result.transactionHash
            );
            tokenId = parseTransactionLogs({
              contractInstance: removalContract,
              txReceipt,
            })
              .filter((log) => log.name === 'Migrate')
              .flatMap((log) => log.args.certificateId.toNumber())[0];
            if (txReceipt.status !== 1) {
              // log an error that this transaction hash failed and we are exiting early
              logger.error(
                `❌ Transaction ${pendingTx.hash} failed with failure status ${txReceipt.status} - exiting early`
              );
              return;
            }
          }
          PROGRESS_BAR.increment();
          outputData.push({
            ...certificate,
            txReceipt,
            tokenId,
          });
        } catch (error) {
          PROGRESS_BAR.stop();
          logger.error(
            `❌ Error minting certificate ${
              JSON.parse(certificate.key).id
            } (number ${certificateIndex}/${inputData.length}) - exiting early`
          );

          hre.log(error);
          outputData.push({
            ...certificate,
            error,
          });
          writeJsonSync(outputFileName, outputData);
          return;
        }
        certificateIndex += 1;
      }
      PROGRESS_BAR.stop();
      logger.success(
        `\nMigrated ${inputData.length} certificates successfully!`
      );
      writeJsonSync(outputFileName, outputData);
      logger.info(`📝 Wrote results to ${outputFileName}`);
      if (!Boolean(dryRun)) {
        const summary = await summarize({
          hre,
          logger,
          outputData,
          certificateContract,
          inputData,
        });
        printSummary({
          logger,
          outputData,
          outputFileName,
          inputData,
          hre,
          summary,
        });
        await validate({ summary, hre, logger });
      } else {
        logger.info(
          `📝 Skipping validation and summary as it is not possible to do either in a dry run`
        );
      }
      logger.success(`🎉 Done!`);
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
