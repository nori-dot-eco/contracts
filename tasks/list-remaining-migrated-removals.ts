import { readFileSync, writeFileSync } from 'fs';

import { divide } from 'mathjs';
import { task, types } from 'hardhat/config';
import type { BigNumber, ethers } from 'ethers';
import type { Signer } from '@ethersproject/abstract-signer';
import chalk from 'chalk';
import { parseTransactionLogs } from '@nori-dot-com/contracts/utils/events';

import type { FireblocksSigner } from '../plugins/fireblocks/fireblocks-signer';

import { getMarket } from '@/utils/contracts';

interface ListMigratedRemovalsTaskOptions {
  file: string;
  outputFile?: string;
  dryRun?: boolean;
}

type ParsedListMigratedRemovalsTaskOptions = RequiredKeys<
  ListMigratedRemovalsTaskOptions,
  'file'
>;

export const GET_LIST_MIGRATED_REMOVALS_TASK = () =>
  ({
    name: 'list-remaining-migrated-removals',
    description:
      'Utility to list migrated removals for sale that were not included in migrated certificates',
    run: async (
      options: ListMigratedRemovalsTaskOptions,
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
      const {
        file,
        outputFile = 'listed-migrated-removals.json',
        dryRun,
      } = options as ParsedListMigratedRemovalsTaskOptions;
      const jsonData = JSON.parse(readFileSync(file, 'utf8'));
      console.log({ jsonData });

      const [signer] = await hre.getSigners();
      const signerAddress = await signer.getAddress();
      console.log({ signerAddress });
      const { getRemoval } = await import('@/utils/contracts');
      const removalContract = await getRemoval({
        hre,
        signer,
      });
      const marketContract = await getMarket({
        hre,
        signer,
      });
      hre.log(`Removal contract address: ${removalContract.address}`);
      hre.log(`Market contract address: ${marketContract.address}`);

      // const fireblocksSigner = removalContract.signer as FireblocksSigner;

      // get all token ids that were migrated
      const migratedTokenIds = jsonData.flatMap((project) => project.tokenIds);
      console.log({ migratedTokenIds });
      const remainingBalanceData = await Promise.all(
        migratedTokenIds.map(async (tokenId) => {
          const balance = await removalContract.balanceOf(
            signerAddress,
            tokenId
          );
          return { tokenId, balance };
        })
      );
      console.log({ remainingBalanceData });
      // filter out token ids that have a balance of 0
      const listableData = remainingBalanceData.filter((data) =>
        data.balance.gt(0)
      );
      console.log({ listableData });

      const listableTokenIds = listableData.map((data) => data.tokenId);
      const listableBalances = listableData.map((data) => data.balance);
      if (!dryRun) {
        let pendingTx: ethers.ContractTransaction;
        try {
          pendingTx = await removalContract.multicall(
            listableTokenIds.map((id, index) =>
              removalContract.interface.encodeFunctionData('consign', [
                signerAddress,
                id,
                listableBalances[index],
              ])
            )
          );

          await removalContract.safeBatchTransferFrom(
            signerAddress, // mint to the consigner
            marketContract.address,
            listableTokenIds,
            listableBalances,
            '0x'
          );
          const result = await pendingTx.wait(); // TODO specify more than one confirmation?
          const txReceipt =
            await removalContract.provider.getTransactionReceipt(
              result.transactionHash
            );
          console.log({ txReceipt });
          // todo - parse logs? what to write?
        } catch (error) {
          console.error('Error submitting safeBatchTransferFrom');
          console.error(error);
        }
      } else {
        // dry run
        try {
          await removalContract.callStatic.multicall(
            listableTokenIds.map((id, index) =>
              removalContract.interface.encodeFunctionData('consign', [
                signerAddress,
                id,
                listableBalances[index],
              ])
            )
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
      //     writeFileSync(outputFile, JSON.stringify(mintingResults));
    },
  } as const);

(() => {
  const { name, description, run } = GET_LIST_MIGRATED_REMOVALS_TASK();
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
