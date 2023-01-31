/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */
import cliProgress from 'cli-progress';
import { task, types } from 'hardhat/config';
import type { ContractReceipt, ContractTransaction } from 'ethers';
import { BigNumber, FixedNumber } from 'ethers';
import { readJsonSync, writeJsonSync } from 'fs-extra';
import type { TransactionReceipt } from '@ethersproject/providers';

import type { Certificate, Removal } from '../types/typechain-types';

import { getLogger } from '@/utils/log';
import { parseTransactionLogs } from '@/utils/events';
import { Zero } from '@/constants/units';
import type { FireblocksSigner } from '@/plugins/fireblocks/fireblocks-signer';
import { getCertificate, getRemoval } from '@/utils/contracts';

export interface MigrateCertificatesTaskOptions {
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
  txReceipt?: { transactionHash?: string; status?: number };
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
  outputData,
  inputData,
  certificateContract,
}: {
  outputData: MigratedCertificates;
  inputData: InputData[];
  certificateContract: Certificate;
}): Promise<Summary> => {
  const multicallData = outputData.map((certificate) =>
    certificateContract.interface.encodeFunctionData('getPurchaseAmount', [
      certificate.tokenId!,
    ])
  );
  const allCertificateBalances = (
    await certificateContract.callStatic.multicall(multicallData)
  ).map((balance) => BigNumber.from(balance));
  const sumOfCertificateAmountsOnChain = allCertificateBalances.reduce(
    (total, next) => total.add(next),
    Zero
  );
  const totalCertificateSupplyOnChain = {
    sum: sumOfCertificateAmountsOnChain,
    certificates: allCertificateBalances,
  };
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

const validateMigrateEvents = ({
  txResult,
  removalContract,
  hre,
  startingCertificateIndex,
  certificateBatchSize,
  inputData,
  recipient,
}: {
  txResult: ContractReceipt;
  removalContract: Removal;
  hre: CustomHardHatRuntimeEnvironment;
  startingCertificateIndex: number;
  certificateBatchSize: number;
  inputData: InputData[];
  recipient: string;
}): void => {
  const eventLogs: {
    certificateId: number;
    removalAmounts: number[];
    removalIds: string[];
    certificateAmount: number;
    certificateRecipient: string;
  }[] = parseTransactionLogs({
    contractInstance: removalContract,
    txReceipt: txResult,
    eventNames: ['Migrate'],
  }).map((log) => ({
    certificateId: log.args.certificateId.toNumber(),
    removalAmounts: log.args.removalAmounts.map((a: BigNumber) =>
      Number(hre.ethers.utils.formatUnits(a.mul(1_000_000), 18))
    ),
    removalIds: log.args.removalIds.map((id) => id.toString()),
    certificateAmount: Number(
      hre.ethers.utils.formatUnits(
        log.args.certificateAmount.mul(1_000_000),
        18
      )
    ),
    certificateRecipient: log.args.certificateRecipient,
  }));
  if (eventLogs.length !== certificateBatchSize) {
    throw new Error(
      `Unexpected number of Migrate events. Expected: ${certificateBatchSize} , Got: ${eventLogs.length}`
    );
  }
  for (const [index, eventLog] of eventLogs.entries()) {
    const datastoreCertificate = inputData[startingCertificateIndex + index];
    const offChainAmountsMatchOnchainAmounts =
      JSON.stringify(eventLog.removalAmounts) ===
      JSON.stringify(datastoreCertificate.amounts);
    const offChainIdsMatchOnchainIds =
      JSON.stringify(eventLog.removalAmounts) ===
      JSON.stringify(datastoreCertificate.amounts);
    if (!offChainAmountsMatchOnchainAmounts) {
      throw new Error(
        `Removal amounts do not match for certificate ${eventLog.certificateId}. Expected: ${datastoreCertificate.amounts} , Got: ${eventLog.removalAmounts}`
      );
    }
    if (!offChainIdsMatchOnchainIds) {
      throw new Error(
        `Removal ids do not match for certificate ${eventLog.certificateId}. Expected: ${datastoreCertificate.ids} , Got: ${eventLog.removalIds}`
      );
    }
    if (eventLog.certificateAmount !== datastoreCertificate.data.gramsOfNrts) {
      throw new Error(
        `Unexpected certificate amount. Expected: ${datastoreCertificate.data.gramsOfNrts} , Got: ${eventLog.certificateAmount}`
      );
    }
    if (eventLog.certificateRecipient !== recipient) {
      throw new Error(
        `Unexpected certificate recipient. Expected: ${recipient} , Got: ${eventLog.certificateRecipient}`
      );
    }
    if (eventLog.certificateId !== startingCertificateIndex + index) {
      throw new Error(
        `Unexpected certificate ID. Expected: ${
          startingCertificateIndex + index
        } , Got: ${eventLog.certificateId}`
      );
    }
  }
};

const validateEvents = ({
  txResult,
  removalContract,
  hre,
  startingCertificateIndex,
  certificateBatchSize,
  inputData,
  recipient,
}: {
  txResult: ContractReceipt;
  removalContract: Removal;
  hre: CustomHardHatRuntimeEnvironment;
  logger: ReturnType<typeof getLogger>;
  startingCertificateIndex: number;
  certificateBatchSize: number;
  inputData: InputData[];
  recipient: string;
}): void => {
  validateMigrateEvents({
    txResult,
    removalContract,
    hre,
    startingCertificateIndex,
    certificateBatchSize,
    inputData,
    recipient,
  });
  // Removal.TransferBatch(
  //  address operator: 0x465d5a3f...18463
  //  address from: 0x465d5a3f...18463
  //  address to: Certificate
  //  uint256[] ids:  [
  //   28323967194641633453876643918753535290164133550933281571131057227227500424
  //   ]
  //  uint256[] values:  [
  //   1000000000000000000
  //   ]
  // )
  // Certificate.Transfer(
  //  address from: AddressZero
  //  address to: 0x465d5a3f...18463
  //  uint256 tokenId: 404
  // )
  // Certificate.ReceiveRemovalBatch(
  //  address from: Removal
  //  address recipient: 0x465d5a3f...18463
  //  uint256 certificateId: 404
  //  uint256 certificateAmount: 1000000000000000000
  //  uint256[] removalIds:  [
  //   28323967194641633453876643918753535290164133550933281571131057227227500424
  //   ]
  //  uint256[] removalAmounts:  [
  //   1000000000000000000
  //   ]
  //  address purchasingTokenAddress: AddressZero
  //  uint256 priceMultiple: 0
  // )
};

const validateState = async ({
  logger,
  summary,
  removalContract,
  certificateContract,
  recipient,
  inputData,
}: {
  logger: ReturnType<typeof getLogger>;
  summary: Summary;
  removalContract: Removal;
  certificateContract: Certificate;
  recipient: string;
  inputData: InputData[];
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
  const expectedTokenIds = Array.from(
    Array.from({
      // eslint-disable-next-line unicorn/no-await-expression-member -- script
      length: (await certificateContract.totalMinted()).toNumber(),
    }).keys()
  );
  const [
    marketBalance,
    totalMinted,
    totalSupply,
    balanceOfRecipient,
    purchaseAmounts,
    tokensOwnedByRecipient,
  ] = await Promise.all([
    removalContract.getMarketBalance(),
    certificateContract.totalMinted(),
    certificateContract.totalSupply(),
    certificateContract.balanceOf(recipient),
    certificateContract.callStatic.multicall(
      expectedTokenIds.map((id) =>
        certificateContract.interface.encodeFunctionData('getPurchaseAmount', [
          id,
        ])
      )
    ),
    certificateContract.tokensOfOwner(recipient),
  ]);
  if (!marketBalance.eq(Zero)) {
    throw new Error(
      `Unexpected market balance! Expected 0, got ${marketBalance}`
    );
  }
  if (!totalMinted.eq(BigNumber.from(inputData.length))) {
    throw new Error(
      `Unexpected certificate total minted! Expected: ${inputData.length}, got: ${totalMinted}.`
    );
  }
  if (!totalSupply.eq(BigNumber.from(inputData.length))) {
    throw new Error(
      `Unexpected certificate total supply! Expected: ${inputData.length}, got: ${totalSupply}.`
    );
  }
  if (!balanceOfRecipient.eq(BigNumber.from(inputData.length))) {
    throw new Error(
      `Unexpected certificate balance of recipient! Expected: ${inputData.length}, got: ${balanceOfRecipient}.`
    );
  }
  if (
    JSON.stringify(
      purchaseAmounts.map((a) => BigNumber.from(a).mul(1_000_000).toString())
    ) !== JSON.stringify(inputData.flatMap((d) => d.data.gramsOfNrtsInWei))
  ) {
    throw new Error(`Unexpected certificate purchase amount!`);
  }
  if (
    JSON.stringify(tokensOwnedByRecipient.map((id) => id.toNumber())) !==
    JSON.stringify(expectedTokenIds)
  ) {
    throw new Error(`Unexpected owner of certificate!`);
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
      const originalInputData: MigratedCertificates = readJsonSync(file);
      let inputData = originalInputData;
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
      let outputData: MigratedCertificates = [];

      const alreadyMigrated = (await certificateContract.totalMinted())
        // eslint-disable-next-line unicorn/no-await-expression-member -- script
        .toNumber();
      logger.info(
        `Found ${alreadyMigrated} certificates already migrated. Minting remaining ${
          inputData.length - alreadyMigrated
        } certificates...`
      );
      if (alreadyMigrated > 0) {
        let alreadyMintedResults;
        try {
          alreadyMintedResults = readJsonSync(outputFile);
        } catch (error) {
          logger.error(
            `${alreadyMigrated} certificates have already been migrated, but no ${outputFile} file found... Something is wrong -- where are the existing results?`
          );
          throw error;
        }
        if (alreadyMintedResults.length !== alreadyMigrated) {
          logger.error(
            `${alreadyMigrated} certificates have already been migrated, but the ${outputFile} file contains ${alreadyMintedResults.length} results... Something is wrong -- why is there a mismatch?`
          );
          throw new Error(
            `${alreadyMigrated} certificates have already been migrated, but the ${outputFile} file contains ${alreadyMintedResults.length} results... Something is wrong -- why is there a mismatch?`
          );
        }
        outputData = outputData.concat(alreadyMintedResults);
      }

      inputData = inputData.slice(alreadyMigrated);
      const multicallBatches = [];
      const batchSize = 98; // 98 appears to be the max number of certificates that can be migrated in a single multicall transaction without blowing gas limit
      for (let i = 0; i < inputData.length; i += batchSize) {
        multicallBatches.push(inputData.slice(i, i + batchSize));
      }
      // multicallBatches = multicallBatches.slice(0, 3);
      logger.info(
        `✨ Migrating ${inputData.length} legacy certificates using ${multicallBatches.length} multicall transactions and batch size ${batchSize}...`
      );
      const PROGRESS_BAR = new cliProgress.SingleBar(
        {},
        cliProgress.Presets.shades_classic
      );
      PROGRESS_BAR.start(multicallBatches.length, 0);

      const TIMEOUT_DURATION = 60 * 1000 * 2; // 2 minutes
      // multicallBatches = multicallBatches.slice(0, 3); // if needed to try smaller batches
      let batchIndex = 0;
      for (const batch of multicallBatches) {
        const multicallData = batch.map((certificate) => {
          const amounts = certificate.amounts.map((amount) =>
            BigNumber.from(FixedNumber.from(amount)).div(1_000_000)
          );
          const ids = certificate.ids;
          const totalAmount = BigNumber.from(
            FixedNumber.from(certificate.data.gramsOfNrts)
          )
            .div(1_000_000)
            .toString();
          return removalContract.interface.encodeFunctionData('migrate', [
            ids,
            amounts,
            signerAddress,
            totalAmount,
          ]);
        });
        const migrationFunction =
          dryRun === true
            ? removalContract.callStatic.multicall
            : removalContract.multicall;

        // Enable this code to simulate a timeout on batch 3 if running localhost
        // if (batchIndex === 2 && network === 'localhost') {
        //   logger.info(`🚧 Intentionally timing out on third batch`);
        //   migrationFunction = async (_multicallData: any) => {
        //     console.log('Calling the timeout fake migrate function...');
        //     await new Promise((resolve) =>
        //       // eslint-disable-next-line no-promise-executor-return -- script
        //       setTimeout(resolve, TIMEOUT_DURATION * 2)
        //     ); // will time out
        //     return Promise.resolve(['Timeout']);
        //   };
        // }
        let pendingTx: Awaited<ReturnType<typeof migrationFunction>>;

        let txReceipt: TransactionReceipt | undefined;
        let tokenIds = [];
        for (
          let i = alreadyMigrated + batchIndex * batchSize;
          i < alreadyMigrated + batchIndex * batchSize + batch.length;
          i += 1
        ) {
          tokenIds.push(i);
        }
        try {
          let maybePendingTx;
          if (network === 'localhost' && dryRun === false) {
            // have to manually set gas price and limit on localhost for non-dry-run
            const gasPrice = await signer.getGasPrice();
            const gasLimit = await removalContract.estimateGas.multicall(
              multicallData
            );
            maybePendingTx = await callWithTimeout(
              migrationFunction(multicallData, { gasPrice, gasLimit }),
              TIMEOUT_DURATION
            );
          } else {
            // all other cases
            maybePendingTx = await callWithTimeout(
              migrationFunction(multicallData),
              TIMEOUT_DURATION
            );
          }

          if (maybePendingTx === undefined) {
            throw new Error(`No pending transaction returned`);
          } else {
            pendingTx = maybePendingTx;
          }
          if (pendingTx !== undefined && dryRun === false) {
            pendingTx = pendingTx as ContractTransaction; // real multicall returns this type but callstatic is different
            logger.info(`📝 Awaiting transaction: ${pendingTx.hash}`);
            const txResult =
              network === `localhost`
                ? ((await callWithTimeout(
                    pendingTx.wait(),
                    TIMEOUT_DURATION
                  )) as ContractReceipt)
                : ((await callWithTimeout(
                    pendingTx.wait(2),
                    TIMEOUT_DURATION
                  )) as ContractReceipt); // TODO what is the correct number of confirmations for mainnet?
            logger.info('Getting txReceipt...');
            txReceipt = (await callWithTimeout(
              removalContract.provider.getTransactionReceipt(
                txResult.transactionHash
              ),
              TIMEOUT_DURATION
            )) as TransactionReceipt;

            if (txReceipt.status !== 1) {
              logger.error(
                `❌ Transaction ${pendingTx.hash} failed with failure status ${txReceipt.status} - exiting early`
              );
              return;
            }
            logger.info('Getting tokenIds...');
            tokenIds = parseTransactionLogs({
              contractInstance: removalContract,
              txReceipt,
              eventNames: ['Migrate'],
            }).map((log) => log.args.certificateId.toNumber());
            if (tokenIds.length !== batch.length) {
              throw new Error(
                `Unexpected number of certificate token IDs found for migrate transaction. Expected ${batch.length} but got ${tokenIds.length}`
              );
            }
            logger.info('Validating events...');
            validateEvents({
              txResult,
              removalContract,
              hre,
              logger,
              startingCertificateIndex:
                alreadyMigrated + batchIndex * batchSize,
              certificateBatchSize: batch.length,
              inputData: originalInputData,
              recipient: signerAddress,
            });
          }
          PROGRESS_BAR.increment();
          let certificateIndex = 0;
          for (const certificate of batch) {
            outputData.push({
              ...certificate,
              txReceipt: {
                transactionHash: txReceipt?.transactionHash,
                status: txReceipt?.status,
              },
              tokenId: tokenIds![certificateIndex],
            });
            certificateIndex += 1;
          }
        } catch (error) {
          PROGRESS_BAR.stop();
          logger.error(
            `❌ Error minting certificates ${batchIndex * batchSize} - ${
              batchIndex * batchSize + batchSize - 1
            }. Exiting early.`
          );
          logger.error(error);
          // TODO we may not want to write these errors for each certificate... but rather just print it out
          // otherwise it affects the number of certificate entries in the output file and causes a mis-match with
          // the number of certificates that have actually been migrated on-chain when the script is run again
          // Therefore commenting it out for now.
          // for (const certificate of batch) {
          //   outputData.push({
          //     ...certificate,
          //     error,
          //   });
          // }
          logger.info(`Writing current output results to ${outputFileName}`);
          writeJsonSync(outputFileName, outputData);
          return;
        }
        batchIndex += 1;
      }
      PROGRESS_BAR.stop();
      logger.success(`\nMigrated ${inputData.length} certificates!`);
      writeJsonSync(outputFileName, outputData);
      logger.info(`📝 Wrote results to ${outputFileName}`);
      if (!Boolean(dryRun)) {
        const summary = await summarize({
          outputData,
          certificateContract,
          inputData: originalInputData,
        });
        printSummary({
          logger,
          outputFileName,
          hre,
          summary,
        });
        await validateState({
          logger,
          summary,
          removalContract,
          certificateContract,
          recipient: signerAddress,
          inputData: originalInputData,
        });
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
