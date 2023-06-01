import { readFileSync, writeFileSync } from 'fs';

import { task, types } from 'hardhat/config';
import chalk from 'chalk';
import type { ContractTransaction } from 'ethers';
import { BigNumber, ethers } from 'ethers';
import { readJsonSync, writeJsonSync } from 'fs-extra';

import type { FireblocksSigner } from '../plugins/fireblocks/fireblocks-signer';

import { Zero } from '@/constants/units';
import { getRemoval } from '@/utils/contracts';

export interface ListMigratedRemovalsTaskOptions {
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
      const network = await hre.network.name;
      if (![`localhost`, `mumbai`, `polygon`].includes(network)) {
        throw new Error(
          `Network ${network} is not supported. Please use localhost, mumbai, or polygon.`
        );
      }

      const jsonData = readJsonSync(file, 'utf8');

      const [signer] = await hre.getSigners();
      const signerAddress = await signer.getAddress();
      const removalContract = await getRemoval({
        hre,
        signer,
      });
      hre.log(`Removal contract address: ${removalContract.address}`);
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
      if (dryRun) {
        hre.log(
          chalk.bold.white(
            `DRY RUN 🌵 Listing unsold removals for ${jsonData.length} projects...`
          )
        );
      } else {
        hre.log(
          chalk.bold.white(
            `✨ Listing unsold removals for ${jsonData.length} projects...`
          )
        );
      }

      const allMigratedRemovalIds = jsonData.flatMap(
        (project: any) => project.tokenIds
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

      const multicallDataForBalances = allMigratedRemovalIds.map(
        (tokenId: any) =>
          removalContract.interface.encodeFunctionData('balanceOf', [
            signerAddress,
            tokenId,
          ])
      );
      const stringRemainingBalances =
        await removalContract.callStatic.multicall(multicallDataForBalances);
      const remainingBalances = stringRemainingBalances.map((amount) =>
        BigNumber.from(amount)
      );
      const remainingBalanceData = remainingBalances.map((balance, index) => ({
        tokenId: allMigratedRemovalIds[index],
        balance,
      }));

      // filter out token ids that have a balance of 0
      const listableData = remainingBalanceData.filter((data) =>
        data.balance.gt(0)
      );

      const listableTokenIds = listableData.map((data) => data.tokenId);
      const listableBalances = listableData.map((data) => data.balance);
      // sum the listable balances and convert to ether
      const totalListableBalance = listableBalances.reduce(
        (accumulator, balance) => accumulator.add(balance),
        Zero
      );
      const totalListableBalanceInEther =
        ethers.utils.formatEther(totalListableBalance);

      hre.log(
        chalk.white(
          `🔎 Found ${listableTokenIds.length} listable removal tokens with a total listable balance of ${totalListableBalanceInEther} NRTs`
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
      if (dryRun) {
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
      } else {
        hre.log(chalk.white(`🤞 Submitting multicall consign transaction...`));
        let txReceipt: ethers.providers.TransactionReceipt;
        let pendingTx: ContractTransaction;
        let maybePendingTx;
        try {
          if (network === `localhost` && dryRun === false) {
            // localhost non-dry-run requires manually setting gas price
            const gasPrice = await signer.getGasPrice();
            maybePendingTx = await removalContract.multicall(
              listableTokenIds.map((id, index) =>
                removalContract.interface.encodeFunctionData('consign', [
                  signerAddress,
                  id,
                  listableBalances[index],
                ])
              ),
              { gasPrice }
            );
          } else {
            maybePendingTx = await removalContract.multicall(
              listableTokenIds.map((id, index) =>
                removalContract.interface.encodeFunctionData('consign', [
                  signerAddress,
                  id,
                  listableBalances[index],
                ])
              )
            );
          }

          if (maybePendingTx === undefined) {
            throw new Error(`No pending transaction returned`);
          } else {
            pendingTx = maybePendingTx as ContractTransaction;
          }
          hre.log(`txHash: ${chalk.green(pendingTx.hash)}`);
          hre.log(chalk.white('\n👷 Waiting for transaction to finalize...'));
          const result = await pendingTx.wait(2); // TODO specify more than one confirmation?

          txReceipt = await removalContract.provider.getTransactionReceipt(
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
        } catch (error) {
          hre.log(
            chalk.red('❌ Error submitting multicall consign transaction: '),
            error
          );
          writeJsonSync(outputFile, {
            listedTokenIds: listableTokenIds,
            listedBalances: listableBalances,
            error,
          });
          throw error;
        }
        writeJsonSync(outputFile, {
          listedTokenIds: listableTokenIds,
          listedBalances: listableBalances,
          txReceipt,
        });
        hre.log(chalk.white(`📝 Wrote results to ${outputFile}`));
        hre.log(chalk.white.bold(`🎉 Done!`));
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
