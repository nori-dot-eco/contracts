/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */
import cliProgress from 'cli-progress';
import { task, types } from 'hardhat/config';
import type { ContractReceipt } from 'ethers';
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
  outputData,
  inputData,
  certificateContract,
}: {
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

const validateMigrateEvent = ({
  txResult,
  removalContract,
  hre,
  certificateIndex,
  inputData,
  recipient,
}: {
  txResult: ContractReceipt;
  removalContract: Removal;
  hre: CustomHardHatRuntimeEnvironment;
  certificateIndex: number;
  inputData: InputData[];
  recipient: string;
}): void => {
  const eventLog: {
    certificateId: number;
    removalAmounts: number[];
    removalIds: number[];
    certificateAmount: number;
    certificateRecipient: string;
  } = parseTransactionLogs({
    contractInstance: removalContract,
    txReceipt: txResult,
    eventNames: ['Migrate'],
  }).map((log) => ({
    certificateId: log.args.certificateId.toNumber(),
    removalAmounts: log.args.removalAmounts.map((a: BigNumber) =>
      Number(hre.ethers.utils.formatUnits(a.mul(1_000_000), 18))
    ),
    removalIds: log.args.removalIds.map((id) => id.toNumber()),
    certificateAmount: Number(
      hre.ethers.utils.formatUnits(
        log.args.certificateAmount.mul(1_000_000),
        18
      )
    ),
    certificateRecipient: log.args.certificateRecipient,
  }))[0];
  const datastoreCertificate = inputData[certificateIndex];
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
  if (eventLog.certificateId !== certificateIndex) {
    throw new Error(
      `Unexpected certificate ID. Expected: ${certificateIndex} , Got: ${eventLog.certificateId}`
    );
  }
};

const validateEvents = ({
  txResult,
  removalContract,
  hre,
  certificateIndex,
  inputData,
  recipient,
}: {
  txResult: ContractReceipt;
  removalContract: Removal;
  hre: CustomHardHatRuntimeEnvironment;
  logger: ReturnType<typeof getLogger>;
  certificateIndex: number;
  inputData: InputData[];
  recipient: string;
}): void => {
  validateMigrateEvent({
    txResult,
    removalContract,
    hre,
    certificateIndex,
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

      let certificateIndex = 0;
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
            hre.ethers.constants.HashZero,
          ];
        }
        const migrationFunction =
          dryRun === true
            ? removalContract.callStatic.migrate
            : removalContract.migrate;
        const gasPrice = await signer.getGasPrice(); // TODO we probably don't need to do this on a live network
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
            const txResult = await pendingTx.wait(1); // TODO specify more than one confirmation?
            txReceipt = await removalContract.provider.getTransactionReceipt(
              txResult.transactionHash
            );
            tokenId = parseTransactionLogs({
              contractInstance: removalContract,
              txReceipt,
              eventNames: ['Migrate'],
            }).map((log) => log.args.certificateId.toNumber())[0];
            if (txReceipt.status !== 1) {
              logger.error(
                `❌ Transaction ${pendingTx.hash} failed with failure status ${txReceipt.status} - exiting early`
              );
              return;
            }
            validateEvents({
              txResult,
              removalContract,
              hre,
              logger,
              certificateIndex,
              inputData,
              recipient: signerAddress,
            });
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
      logger.success(`\nMigrated ${inputData.length} certificates!`);
      writeJsonSync(outputFileName, outputData);
      logger.info(`📝 Wrote results to ${outputFileName}`);
      if (!Boolean(dryRun)) {
        const summary = await summarize({
          outputData,
          certificateContract,
          inputData,
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
          inputData,
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
