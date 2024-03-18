import { BigNumber } from 'ethers';
import { task, types } from 'hardhat/config';
import { Utils } from 'alchemy-sdk';
import { readJsonSync, writeJsonSync } from 'fs-extra';

import { getMarket, getRemoval } from '@/utils/contracts';

export const GET_RETIRE_CERTIFICATES_TASK = () =>
  ({
    name: 'retire-certificates',
    description: 'Utility to retire large Bayer certificates',
    run: async (
      options: {
        batchindex: number;
      },
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
      const { batchindex = 0 } = options;
      const batchfilename = 'bayer_batches_for_retirement.csv';
      const CERTIFICATE_SIZE_TONNES = 10_000;
      const CERTIFICATE_SIZE_WEI = ethers.utils.parseUnits(
        CERTIFICATE_SIZE_TONNES.toString(),
        18
      );
      const BLOCK_CONFIRMATIONS = 5;

      const RECIPIENT = '0xFD2F3314886914d87Ba7F22802601a0031c78d4f'; // Default certificate recipient

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

      // Gas stuff ==========================
      const latestFastGasPrice = await hre.ethers.provider.getGasPrice();
      const fastGasPriceHexString = Utils.hexStripZeros(
        latestFastGasPrice.toHexString()
      );

      const rawBatchData = readJsonSync(batchfilename);

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

      const timestamp = new Date().toISOString();
      // Do the retirement ========================================
      const retirementOutputFilename = `${batchindex}_retirement_txn_receipt_${timestamp}.json`;
      let pendingTx;
      let maybePendingTx;
      let txReceipt;
      maybePendingTx = await removalContract.retire(
        batches[batchindex].removalIdsForRetirement,
        batches[batchindex].balancesForRetirement,
        RECIPIENT, // recipient
        CERTIFICATE_SIZE_WEI,
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
          `📝 Awaiting retire transaction for batch ${batchindex}
              }: ${pendingTx.hash}`
        );
        const txResult = await pendingTx.wait(BLOCK_CONFIRMATIONS);
        console.info('Getting txReceipt...');
        txReceipt = await removalContract.provider.getTransactionReceipt(
          txResult.transactionHash
        );
        if (txReceipt.status !== 1) {
          console.error(
            `❌ Transaction ${pendingTx.hash} failed with failure status ${txReceipt.status} - exiting early`
          );
          writeJsonSync(retirementOutputFilename, txReceipt);
          throw new Error(
            'Transaction failed with unsuccessful status - exiting early'
          );
        }
      }
      writeJsonSync(retirementOutputFilename, txReceipt);
    },
  } as const);

(() => {
  const { name, description, run } = GET_RETIRE_CERTIFICATES_TASK();
  task(name, description, run).addParam(
    'batchindex',
    'which batch to retire',
    undefined,
    types.int,
    false
  );
})();
