import { readFileSync, writeFileSync } from 'fs';

import { task, types } from 'hardhat/config';
import chalk from 'chalk';
import { ethers } from 'ethers';

import type { FireblocksSigner } from '../plugins/fireblocks/fireblocks-signer';

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
      // hre.log({ jsonData });

      const [signer] = await hre.getSigners();
      const signerAddress = await signer.getAddress();
      const { getRemoval } = await import('@/utils/contracts');
      const removalContract = await getRemoval({
        hre,
        signer,
      });
      hre.log(`Removal contract address: ${removalContract.address}`);
      hre.log(`Signer address: ${signerAddress}`);
      // const fireblocksSigner = removalContract.signer as FireblocksSigner;

      if (!dryRun) {
        hre.log(
          chalk.bold.white(
            `✨ Listing unsold removals for ${jsonData.length} projects...`
          )
        );
      } else {
        hre.log(
          chalk.bold.white(
            `DRY RUN 🌵 Listing unsold removals for ${jsonData.length} projects...`
          )
        );
      }

      const allMigratedRemovalIds = jsonData.flatMap(
        (project) => project.tokenIds
      );
      if (allMigratedRemovalIds.includes(undefined)) {
        hre.log(
          chalk.bold.red(
            `❌ Some migrated projects have undefined token ids. Please check the input file for transaction errors during minting. Exiting...`
          )
        );
        return;
      }

      hre.log(chalk.white(`👀 Querying unsold removal balances...`));

      const remainingBalanceData = await Promise.all(
        allMigratedRemovalIds.map(async (tokenId) => {
          const balance = await removalContract.balanceOf(
            signerAddress,
            tokenId
          );
          return { tokenId, balance };
        })
      );
      // filter out token ids that have a balance of 0
      const listableData = remainingBalanceData.filter((data) =>
        data.balance.gt(0)
      );

      const listableTokenIds = listableData.map((data) => data.tokenId);
      const listableBalances = listableData.map((data) => data.balance);
      // sum the listable balances and convert to ether
      const totalListableBalance = listableBalances.reduce(
        (accumulator, balance) => accumulator.add(balance),
        ethers.BigNumber.from(0)
      );
      const totalListableBalanceInEther =
        ethers.utils.formatEther(totalListableBalance);

      hre.log(
        chalk.white(
          `🔎 Found ${listableTokenIds.length} removal tokens with a total listable balance of ${totalListableBalanceInEther} NRTs`
        )
      );
      // if there are no listable token ids, exit
      if (listableTokenIds.length === 0) {
        hre.log(
          chalk.white(
            `👋 No listable token ids found (no non-zero balances), exiting without listing any removals...`
          )
        );
        return;
      }
      if (!dryRun) {
        hre.log(chalk.white(`🤞 Submitting multicall consign transaction...`));
        let txResult;
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
          hre.log(`txHash: ${chalk.green(pendingTx.hash)}`);
          hre.log(chalk.white('\n👷 Waiting for transaction to finalize...'));

          const result = await pendingTx.wait(); // TODO specify more than one confirmation?
          const txReceipt =
            await removalContract.provider.getTransactionReceipt(
              result.transactionHash
            );
          // if the status is 1, log a success message, otherwise log a failure
          if (txReceipt.status === 1) {
            hre.log(
              chalk.green(
                `✅ Successfully listed ${totalListableBalanceInEther} NRTs across ${listableTokenIds.length} removals!`
              )
            );
          } else {
            hre.log(
              chalk.red(
                `❌ Failed to list the removals! Check out the transaction receipt in the output.`
              )
            );
          }
          txResult = txReceipt;
        } catch (error) {
          hre.log(
            chalk.red('❌ Error submitting multicall consign transaction: '),
            error
          );
          txResult = error;
        }
        writeFileSync(
          outputFile,
          JSON.stringify(
            {
              listedTokenIds: listableTokenIds,
              listedBalances: listableBalances,
              txReceiptOrError: txResult,
            },
            null,
            2
          )
        );
        hre.log(chalk.white(`📝 Wrote results to ${outputFile}`));
        hre.log(chalk.white.bold(`🎉 Done!`));
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
