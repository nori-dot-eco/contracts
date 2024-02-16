import { task, types } from 'hardhat/config';
import chalk from 'chalk';
import type { ContractTransaction } from 'ethers';
import { BigNumber, ethers } from 'ethers';
import { readFileSync, writeJsonSync } from 'fs-extra';

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

export const GET_SIMULATE_LISTING_TASK = () =>
  ({
    name: 'simulate-list-removals',
    description: 'Utility to simulating listing removals for sale',
    run: async (
      options: ListMigratedRemovalsTaskOptions,
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
      const {
        file,
        outputFile = `listed-migrated-removals-${new Date()
          .toISOString()
          .replaceAll(':', '_')}.json`,
        dryRun,
      } = options as ParsedListMigratedRemovalsTaskOptions;
      const network = await hre.network.name;
      if (![`localhost`, `mumbai`, `polygon`].includes(network)) {
        throw new Error(
          `Network ${network} is not supported. Please use localhost, mumbai, or polygon.`
        );
      }

      const fileContent = readFileSync(file, 'utf8');
      // console.log('fileContent: ', fileContent);

      const removalIdsToList = fileContent
        .split('\n')
        .map((line) => line.trim());

      // console.log('removalIdsToList: ', removalIdsToList);

      const [signer] = await hre.getSigners();
      const signerAddress = await signer.getAddress();
      const removalContract = await getRemoval({
        hre,
        signer,
      });
      hre.log(`Removal contract address: ${removalContract.address}`);
      hre.log(`Signer address: ${signerAddress}`);
      const signerHasConsignorRole = await removalContract.hasRole(
        await removalContract.CONSIGNOR_ROLE(),
        signerAddress
      );
      if (!signerHasConsignorRole) {
        throw new Error(
          `Signer does not have the CONSIGNOR role in the removal contract`
        );
      }
      hre.log(
        chalk.bold.white(
          `DRY RUN 🌵 Listing ${removalIdsToList.length} removals...`
        )
      );

      hre.log(chalk.white(`👀 Querying unsold removal balances...`));

      const supplierWalletAddress =
        '0xdca851dE155B20CC534b887bD2a1D780D0DEc077';

      const multicallDataForBalances = await Promise.all(
        removalIdsToList.map(async (tokenId: any) => {
          // const decodedId = await removalContract.decodeRemovalIdV0(tokenId);
          return removalContract.interface.encodeFunctionData('balanceOf', [
            supplierWalletAddress,
            tokenId,
          ]);
        })
      );
      const stringRemainingBalances =
        await removalContract.callStatic.multicall(multicallDataForBalances);
      const remainingBalances = stringRemainingBalances.map((amount) =>
        BigNumber.from(amount)
      );
      const remainingBalanceData = remainingBalances.map((balance, index) => ({
        tokenId: removalIdsToList[index],
        balance,
      }));

      // filter out token ids that have a balance of 0
      const zeroAmountRemovals = remainingBalanceData.filter((data) =>
        data.balance.eq(0)
      );
      console.log('zeroAmountRemovals: ', zeroAmountRemovals);
      const listableData = remainingBalanceData.filter((data) =>
        data.balance.gt(0)
      );

      const listableTokenIds = listableData.map((data) => data.tokenId);
      console.log('listableTokenIds: ', listableTokenIds);
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
      const encodedTransactionData = listableTokenIds.map((id, index) =>
        removalContract.interface.encodeFunctionData('consign', [
          supplierWalletAddress,
          id,
          listableBalances[index],
        ])
      );
      const gasEstimation = await removalContract.estimateGas.multicall(
        encodedTransactionData
      );
      console.log('GAS ESTIMATION', gasEstimation);
      try {
        await removalContract.callStatic.multicall(encodedTransactionData);
        hre.log(chalk.bold.bgWhiteBright.black(`🎉  Dry run was successful!`));
      } catch (error) {
        hre.log(chalk.bold.bgRed.black(`💀 Dry run was unsuccessful!`, error));
      }
    },
  } as const);

(() => {
  const { name, description, run } = GET_SIMULATE_LISTING_TASK();
  task(name, description, run).addParam(
    'file',
    'JSON removal data to read',
    undefined,
    types.string,
    false
  );
})();
