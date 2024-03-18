/* eslint-disable no-restricted-syntax */
import { BigNumber, FixedNumber } from 'ethers';
import { task } from 'hardhat/config';
import { Alchemy, Network, Utils } from 'alchemy-sdk';
import { readFileSync, writeJsonSync } from 'fs-extra';

import { getMarket, getRemoval } from '@/utils/contracts';

const checkRoles = async (signerAddress: string) => {
  const [signer] = await hre.getSigners();
  const marketContract = await getMarket({
    hre,
    signer,
  });
  const removalContract = await getRemoval({
    hre,
    signer,
  });
  const hasMarketDefaultAdminRole = await marketContract.hasRole(
    marketContract.DEFAULT_ADMIN_ROLE(),
    signerAddress
  );
  console.log(
    'SIGNER HAS `Market.DEFAULT_ADMIN_ROLE`?',
    hasMarketDefaultAdminRole
  );
  const hasMarketAdminRole = await marketContract.hasRole(
    marketContract.MARKET_ADMIN_ROLE(),
    signerAddress
  );
  console.log('SIGNER HAS `Market.MARKET_ADMIN_ROLE`?', hasMarketAdminRole);

  const hasRemovalAdminRole = await removalContract.hasRole(
    removalContract.DEFAULT_ADMIN_ROLE(),
    signerAddress
  );
  console.log('SIGNER HAS `Removal.DEFAULT_ADMIN_ROLE`?', hasRemovalAdminRole);

  const hasConsignorRole = await removalContract.hasRole(
    removalContract.CONSIGNOR_ROLE(),
    signerAddress
  );
  console.log('SIGNER HAS `Removal.CONSIGNOR_ROLE`?', hasConsignorRole);
};

export const GET_CREATE_BATCHES_TASK = () =>
  ({
    name: 'create-batches',
    description:
      'Utility to create batches for Bayer retirement and simulate gas requirements.',
    run: async (
      options: {
        simulateonly: boolean;
      },
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
      const { simulateonly } = options;
      const CERTIFICATE_SIZE_TONNES = 10_000;
      const CERTIFICATE_SIZE_WEI = ethers.utils.parseUnits(
        CERTIFICATE_SIZE_TONNES.toString(),
        18
      );
      const NUMBER_OF_CERTIFICATES = 10;
      const SUPPLIER_WALLET_ADDRESS =
        '0xdca851dE155B20CC534b887bD2a1D780D0DEc077'; // Bayer

      const RECIPIENT = '0xFD2F3314886914d87Ba7F22802601a0031c78d4f'; // Default certificate recipient

      const network = hre.network.name;
      if (![`localhost`, `mumbai`, `polygon`].includes(network)) {
        throw new Error(
          `Network ${network} is not supported. Please use localhost, mumbai, or polygon.`
        );
      }
      const [signer] = await hre.getSigners();

      const settings = {
        apiKey: process.env.ALCHEMY_API_KEY,
        network: Network.MATIC_MAINNET,
      };
      const alchemy = new Alchemy(settings);

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
      const latestBlock = await hre.ethers.provider.getBlock('latest');
      const latestBlockGasLimit = Utils.hexStripZeros(
        latestBlock.gasLimit.toHexString()
      );
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

      const rawTokenIdData = readFileSync(
        './bayer_candidate_removals.csv',
        'utf-8'
      );

      // split bayerCandidateRemovals into an array of tokenIds on newlines
      const bayerCandidateRemovals = rawTokenIdData.split('\r\n').map((id) => {
        return BigNumber.from(id);
      });
      console.log(
        'BAYER CANDIDATE REMOVALS',
        bayerCandidateRemovals.slice(0, 5)
      );
      let bayerMintedTokenBalances = await removalContract.balanceOfBatch(
        Array.from({ length: bayerCandidateRemovals.length }).fill(
          SUPPLIER_WALLET_ADDRESS
        ) as string[],
        bayerCandidateRemovals
      );

      const multicallData = bayerCandidateRemovals.map((tokenId) => {
        return removalContract.interface.encodeFunctionData(
          'decodeRemovalIdV0',
          [tokenId]
        );
      });
      const multicallResponse = await removalContract.callStatic.multicall(
        multicallData
      );

      const decodedRemovalIds = multicallResponse.map((response) => {
        return removalContract.interface.decodeFunctionResult(
          'decodeRemovalIdV0',
          response
        )[0];
      });

      const bayerMintedBalance = bayerMintedTokenBalances.reduce(
        (acc, curr) => acc.add(curr),
        BigNumber.from(0)
      );
      console.log(
        'BAYER MINTED TOKEN BALANCE(TONNES):',
        FixedNumber.fromValue(bayerMintedBalance, 18).toString()
      );

      const zippedBayerMintedTokens = await Promise.all(
        bayerCandidateRemovals.map(async (tokenId, index) => {
          return {
            tokenId,
            vintage: decodedRemovalIds[index].vintage,
            balance: bayerMintedTokenBalances[index],
          };
        })
      );

      let sortedZippedBayerMintedTokens = zippedBayerMintedTokens.sort(
        (a, b) => {
          return a.vintage - b.vintage;
        }
      );

      // Assemble batches =============================================
      const batchesForRetirement = [];

      for (
        let certificateIndex = 0;
        certificateIndex < NUMBER_OF_CERTIFICATES;
        certificateIndex += 1
      ) {
        const removalIdsForRetirement = [];
        const balancesForRetirement = [];
        const vintagesForRetirement = [];
        let remainingRetirementSizeWei = CERTIFICATE_SIZE_WEI;
        // move through available bayermintedTokens and assemble list of token id and corresponding balance of token ID to retire
        // then break when we've reached the directRetirementSizeWei
        for (const [
          i,
          sortedZippedBayerMintedToken,
        ] of sortedZippedBayerMintedTokens.entries()) {
          const tokenId = sortedZippedBayerMintedToken.tokenId;
          const balance = sortedZippedBayerMintedToken.balance;
          const vintage = sortedZippedBayerMintedToken.vintage;
          // skip tokens that were minted with 0 balance!
          if (balance.eq(0)) {
            continue;
          }
          if (remainingRetirementSizeWei.gt(balance)) {
            remainingRetirementSizeWei =
              remainingRetirementSizeWei.sub(balance);
            removalIdsForRetirement.push(tokenId);
            balancesForRetirement.push(balance);
            vintagesForRetirement.push(vintage);
          } else {
            removalIdsForRetirement.push(tokenId);
            balancesForRetirement.push(remainingRetirementSizeWei);
            vintagesForRetirement.push(vintage);
            // slice down the array as we consume it so we don't use what we've pulled
            sortedZippedBayerMintedTokens = sortedZippedBayerMintedTokens.slice(
              i + 1
            );
            bayerMintedTokenBalances = bayerMintedTokenBalances.slice(i + 1);
            break;
          }
        }

        const sumOfBalancesForRetirement = balancesForRetirement.reduce(
          (acc, curr) => acc.add(curr),
          BigNumber.from(0)
        );
        if (!sumOfBalancesForRetirement.eq(CERTIFICATE_SIZE_WEI)) {
          throw new Error(
            `Sum of balances for retirement ${FixedNumber.fromValue(
              sumOfBalancesForRetirement,
              18
            ).toString()} does not equal direct retirement size ${FixedNumber.fromValue(
              CERTIFICATE_SIZE_WEI,
              18
            ).toString()}`
          );
        }

        console.log(
          'SUM OF BALANCES FOR RETIREMENT (TONNES):',
          FixedNumber.fromValue(sumOfBalancesForRetirement, 18).toString()
        );

        batchesForRetirement.push({
          removalIdsForRetirement,
          balancesForRetirement,
          vintagesForRetirement,
        });
      }

      const firstVintageOfEachBach = batchesForRetirement.map(
        (batch) => batch.vintagesForRetirement[0]
      );
      console.log('FIRST VINTAGE OF EACH BATCH', firstVintageOfEachBach);

      // write the batch data to an output file, titled "bayer_batches_for_retirement.json" but include a timestamp so we don't overwrite:
      const outputData = batchesForRetirement.map((batch) => {
        return {
          removalIds: batch.removalIdsForRetirement.map((id) => id.toString()),
          balances: batch.balancesForRetirement.map((balance) =>
            FixedNumber.fromValue(balance, 18).toString()
          ),
        };
      });
      const timestamp = new Date().toISOString();
      const outputFilename = `bayer_batches_for_retirement_${timestamp}.json`;
      writeJsonSync(outputFilename, outputData);

      // Transaction simulation ==========================
      if (simulateonly) {
        const consignorTransferTxnDataArray = batchesForRetirement.map(
          (batch) => {
            return removalContract.interface.encodeFunctionData(
              `consignorBatchTransfer`,
              [
                SUPPLIER_WALLET_ADDRESS,
                signerAddress,
                batch.removalIdsForRetirement,
                batch.balancesForRetirement,
              ]
            );
          }
        );

        const consignorTransferTxnInfoArray = consignorTransferTxnDataArray.map(
          (data, index) => {
            return {
              /** The address the transaction is directed to. */
              to: removalContract.address,
              /** The address the transaction is sent from. (This is what's spoofed) */
              from: signerAddress,
              /** The gas provided for the transaction execution, as a hex string. */
              gas: latestBlockGasLimit,
              // gas: '0x1e8480', // 2,000,000
              // gas: '0x1312D00', // 20,000,000
              /** The gas price to use as a hex string. */
              gasPrice: fastGasPriceHexString,
              /** The value associated with the transaction as a hex string. */
              value: '0x0',
              /** The data associated with the transaction. */
              data: consignorTransferTxnDataArray[index],
            };
          }
        );
        const consignorTransferGasEstimates = await Promise.all(
          consignorTransferTxnInfoArray.map(async (txnInfo) => {
            return await alchemy.transact.estimateGas(txnInfo);
          })
        );
        console.log(
          'CONSIGNOR TRANSFER GAS ESTIMATES',
          consignorTransferGasEstimates
        );
        console.log('='.repeat(50));

        const retireTxnDataArray = batchesForRetirement.map((batch) => {
          return removalContract.interface.encodeFunctionData('retire', [
            batch.removalIdsForRetirement,
            batch.balancesForRetirement,
            RECIPIENT, // recipient
            CERTIFICATE_SIZE_WEI,
          ]);
        });

        const multicallTxnDataArray = retireTxnDataArray.map(
          (retireTxnData, index) => {
            return removalContract.interface.encodeFunctionData('multicall', [
              [consignorTransferTxnDataArray[index], retireTxnData],
            ]);
          }
        );

        const multicallTxnInfoArray = multicallTxnDataArray.map(
          (data, index) => {
            return {
              to: removalContract.address,
              from: signerAddress,
              gas: latestBlockGasLimit,
              gasPrice: fastGasPriceHexString,
              value: '0x0',
              data: multicallTxnDataArray[index],
            };
          }
        );

        // const response = await alchemy.transact.simulateExecutionBundle([
        //   consignorBatchTransferTransactionInfo,
        //   retireTransactionInfo,
        // ]);

        const multicallGasEstimates = await Promise.all(
          multicallTxnInfoArray.map(async (txnInfo) => {
            return await alchemy.transact.estimateGas(txnInfo);
          })
        );

        console.log('MULTICALL GAS ESTIMATES', multicallGasEstimates);

        const gasDiffs = multicallGasEstimates.map((gasEstimate, index) => {
          return gasEstimate.sub(consignorTransferGasEstimates[index]);
        });
        const commaFormattedGasDiffs = gasDiffs
          .map((gasDiff) => gasDiff.toString())
          .map((numberString) => Number(numberString).toLocaleString());

        console.log('GAS DIFFS', commaFormattedGasDiffs);
        // const response = await alchemy.transact.simulateExecution(
        //   multicallTransactionInfo
        // );
        // console.log('RESPONSE', response);
      }
    },
  } as const);

(() => {
  const { name, description, run } = GET_CREATE_BATCHES_TASK();
  task(name, description, run).addFlag(
    'simulateonly',
    'Simulate everything and get gas diffs'
  );
})();
