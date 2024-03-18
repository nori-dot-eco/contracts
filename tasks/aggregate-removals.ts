/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { BigNumber } from 'ethers';
import { task, types } from 'hardhat/config';
import { Utils } from 'alchemy-sdk';
import { readJsonSync, writeJsonSync } from 'fs-extra';

import { getMarket, getRemoval } from '@/utils/contracts';

export const GET_AGGREGATE_REMOVALS_TASK = () =>
  ({
    name: 'aggregate-removals',
    description: 'Utility to aggregate removals to a consignor',
    run: async (
      options: {
        aggregateremovals: boolean;
        batchfilename: string;
      },
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
      const {
        aggregateremovals,
        batchfilename = 'bayer_batches_for_retirement.csv',
      } = options;
      const BLOCK_CONFIRMATIONS = 5;
      const SUPPLIER_WALLET_ADDRESS =
        '0xdca851dE155B20CC534b887bD2a1D780D0DEc077'; // Bayer

      const network = hre.network.name;
      if (![`localhost`, `mumbai`, `polygon`].includes(network)) {
        throw new Error(
          `Network ${network} is not supported. Please use localhost, mumbai, or polygon.`
        );
      }
      const [signer] = await hre.getSigners();

      const marketContract = await getMarket({
        hre,
        signer,
      });
      const removalContract = await getRemoval({
        hre,
        signer,
      });
      console.log('MARKET CONTRACT ADDRESS', marketContract.address);

      const signerAddress = await signer.getAddress();
      console.log('SIGNER ADDRESS', signerAddress);

      // await checkRoles(signerAddress);

      // Gas stuff ==========================
      const latestFastGasPrice = await hre.ethers.provider.getGasPrice();
      const fastGasPriceHexString = Utils.hexStripZeros(
        latestFastGasPrice.toHexString()
      );
      // console.log('LATEST BLOCK GAS LIMIT: ', latestBlockGasLimit);
      // console.log('LATEST FAST GAS PRICE: ', fastGasPriceHexString);

      // Get token data =============================================
      // const bayerMintedTokens = await removalContract.getOwnedTokenIds(
      //   SUPPLIER_WALLET_ADDRESS
      // );
      // console.log(`Bayer has ${bayerMintedTokens.length} minted tokens`);

      const rawBatchData = readJsonSync(batchfilename);
      console.log('RAW BATCH DATA', rawBatchData.slice(0, 5));

      const batches = rawBatchData.map((batch) => {
        return {
          removalIdsForRetirement: batch.removalIds.map((id) => {
            return BigNumber.from(id);
          }),
          balancesForRetirement: batch.balances.map((balance) => {
            return ethers.utils.parseUnits(balance.toString(), 18);
          }),
        };
      });
      console.log('BATCH DATA', batches);

      if (aggregateremovals) {
        const timestamp = new Date().toISOString();
        // Aggregate removals with consignor ========================
        const aggregationOutputFilename = `aggregation_txn_receipts_${timestamp}.json`;
        const aggregationTransactionOutput = [];
        let pendingTx;
        let maybePendingTx;
        let txReceipt;
        for (let i = 0; i < batches.length; i++) {
          maybePendingTx =
            await removalContract.callStatic.consignorBatchTransfer(
              SUPPLIER_WALLET_ADDRESS,
              signerAddress,
              batches[i].removalIdsForRetirement,
              batches[i].balancesForRetirement,
              {
                gasPrice: fastGasPriceHexString,
              }
            );
          if (maybePendingTx === undefined) {
            throw new Error(`No pending transaction returned`);
          } else {
            pendingTx = maybePendingTx;
          }
          if (pendingTx !== undefined) {
            console.info(
              `📝 Awaiting aggregation transaction ${i}/${batches.length}: ${pendingTx.hash}`
            );
            const txResult = await pendingTx.wait(BLOCK_CONFIRMATIONS);
            console.info('Getting txReceipt...');
            txReceipt = await removalContract.provider.getTransactionReceipt(
              txResult.transactionHash
            );
            aggregationTransactionOutput.push(txReceipt);
            if (txReceipt.status !== 1) {
              console.error(
                `❌ Transaction ${pendingTx.hash} failed with failure status ${txReceipt.status} - exiting early`
              );
              writeJsonSync(
                aggregationOutputFilename,
                aggregationTransactionOutput
              );
              throw new Error(
                'Transaction failed with unsuccessful status - exiting early'
              );
            }
          }
        }
        console.log(
          'Successfully aggregated all batches of removals to consignor! Writing transaction receipts to file...'
        );
        writeJsonSync(aggregationOutputFilename, aggregationTransactionOutput);
      }
    },
  } as const);

(() => {
  const { name, description, run } = GET_AGGREGATE_REMOVALS_TASK();
  task(name, description, run)
    .addFlag('aggregateremovals', 'Aggregate removals to consignor')
    .addParam(
      'batchfilename',
      'Path to the file containing the batch data',
      undefined,
      types.string,
      false
    );
})();
