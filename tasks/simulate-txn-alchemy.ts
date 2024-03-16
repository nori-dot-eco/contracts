/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */

import { BigNumber, FixedNumber } from 'ethers';
import { task } from 'hardhat/config';
import { getMarket, getRemoval } from '@/utils/contracts';
import { Alchemy, Network, Utils } from 'alchemy-sdk';

const swapWithoutFeeSpecialOrderTransaction = async () => {
  const network = hre.network.name;
  if (![`localhost`, `mumbai`, `polygon`].includes(network)) {
    throw new Error(
      `Network ${network} is not supported. Please use localhost, mumbai, or polygon.`
    );
  }
  const [signer] = await hre.getSigners();
  const signerAddress = await signer.getAddress();

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

  const polygonRelayerAddress = '0x6fcF5C3E43bE33F4B14BB25B550adb6887C1E48c';

  const supplierWalletAddress = '0xdca851dE155B20CC534b887bD2a1D780D0DEc077';
  const marketBalance = await removalContract.getMarketBalance();
  const marketBalanceInEth = FixedNumber.fromValue(marketBalance, 18);
  console.log(
    'CURRENT MARKET BALANCE (TONNES): ',
    marketBalanceInEth.toString()
  );
  const hasRole = await marketContract.hasRole(
    marketContract.MARKET_ADMIN_ROLE(),
    polygonRelayerAddress
  );
  console.log('RELAYER HAS `MARKET_ADMIN_ROLE`? ', hasRole);
  const latestBlock = await hre.ethers.provider.getBlock('latest');
  const latestBlockGasLimit = Utils.hexStripZeros(
    latestBlock.gasLimit.toHexString()
  );
  const latestFastGasPrice = await hre.ethers.provider.getGasPrice();
  const fastGasPriceHexString = Utils.hexStripZeros(
    latestFastGasPrice.toHexString()
  );
  console.log('LATEST BLOCK GAS LIMIT: ', latestBlockGasLimit);
  console.log('LATEST FAST GAS PRICE: ', fastGasPriceHexString);

  const bayerTokens = await marketContract.getRemovalIdsForSupplier(
    supplierWalletAddress
  );
  const bayerMarketBalances = await removalContract.balanceOfBatch(
    new Array(bayerTokens.length).fill(marketContract.address),
    bayerTokens
  );
  const bayerListedBalance = bayerMarketBalances.reduce(
    (acc, curr) => acc.add(curr),
    BigNumber.from(0)
  );
  console.log(
    'BAYER MARKET BALANCE (TONNES): ',
    FixedNumber.fromValue(bayerListedBalance, 18).toString()
  );

  const purchaseAmountEth = 10;
  const purchaseAmountWei = ethers.utils.parseUnits(
    purchaseAmountEth.toString(),
    18
  );
  console.log('PURCHASE AMOUNT (ETH): ', purchaseAmountEth);
  console.log('PURCHASE AMOUNT (WEI): ', purchaseAmountWei);
  const gasEstimation =
    await marketContract.estimateGas.swapWithoutFeeSpecialOrder(
      signerAddress, // recipient
      polygonRelayerAddress, // purchaser (doesn't matter if they have USDC the price is 0)
      purchaseAmountWei,
      0,
      0,
      ethers.constants.AddressZero,
      []
    );
  console.log('GAS ESTIMATION', gasEstimation);

  const transactionData = marketContract.interface.encodeFunctionData(
    'swapWithoutFeeSpecialOrder',
    [
      signerAddress, // recipient
      polygonRelayerAddress, // purchaser (doesn't matter if they have USDC the price is 0)
      purchaseAmountWei,
      0,
      0,
      ethers.constants.AddressZero,
      [],
    ]
  );

  const transactionInformation = {
    /** The address the transaction is directed to. */
    to: marketContract.address,
    /** The address the transaction is sent from. (This is what's spoofed) */
    from: polygonRelayerAddress,
    /** The gas provided for the transaction execution, as a hex string. */
    gas: latestBlockGasLimit,
    // gas: '0x1e8480', // 2,000,000
    // gas: '0x1312D00', // 20,000,000
    /** The gas price to use as a hex string. */
    gasPrice: fastGasPriceHexString,
    /** The value associated with the transaction as a hex string. */
    value: '0x0',
    /** The data associated with the transaction. */
    data: transactionData,
  };

  const alchemyGasEstimation = await alchemy.transact.estimateGas(
    transactionInformation
  );
  console.log('ALCHEMY GAS ESTIMATION', alchemyGasEstimation.toString());

  const response = await alchemy.transact.simulateExecution(
    transactionInformation
  );

  // const response = await alchemy.transact.simulateAssetChanges({
  //   /** The address the transaction is directed to. */
  //   to: marketContract.address,
  //   /** The address the transaction is sent from. (This is what's spoofed) */
  //   from: polygonRelayerAddress,
  //   /** The gas provided for the transaction execution, as a hex string. */
  //   // gas: latestBlockGasLimit,
  //   // gas: '0x1e8480', // 2,000,000
  //   gas: '0x1312D00', // 20,000,000
  //   /** The gas price to use as a hex string. */
  //   gasPrice: fastGasPriceHexString,
  //   /** The value associated with the transaction as a hex string. */
  //   value: '0x0',
  //   /** The data associated with the transaction. */
  //   data: transactionData,
  // });

  console.log('RESPONSE', response);
};

const checkRoles = async (polygonRelayerAddress: string) => {
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
    polygonRelayerAddress
  );
  console.log(
    'SIGNER HAS `Market.DEFAULT_ADMIN_ROLE`? ',
    hasMarketDefaultAdminRole
  );
  const hasMarketAdminRole = await marketContract.hasRole(
    marketContract.MARKET_ADMIN_ROLE(),
    polygonRelayerAddress
  );
  console.log('SIGNER HAS `Market.MARKET_ADMIN_ROLE`? ', hasMarketAdminRole);

  const hasRemovalAdminRole = await removalContract.hasRole(
    removalContract.DEFAULT_ADMIN_ROLE(),
    polygonRelayerAddress
  );
  console.log('SIGNER HAS `Removal.DEFAULT_ADMIN_ROLE`? ', hasRemovalAdminRole);

  const hasConsignorRole = await removalContract.hasRole(
    removalContract.CONSIGNOR_ROLE(),
    polygonRelayerAddress
  );
  console.log('SIGNER HAS `Removal.CONSIGNOR_ROLE`? ', hasConsignorRole);
};

export const GET_SIMULATE_TXN_TASK = () =>
  ({
    name: 'simulate-txn',
    description: 'Utility to simulate a transaction with the Alchemy API',
    run: async (
      options: {},
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
      const CERTIFICATE_SIZE_TONNES = 10000;
      const CERTIFICATE_SIZE_WEI = ethers.utils.parseUnits(
        CERTIFICATE_SIZE_TONNES.toString(),
        18
      );
      const NUMBER_OF_CERTIFICATES = 10;

      const SUPPLIER_WALLET_ADDRESS =
        '0xdca851dE155B20CC534b887bD2a1D780D0DEc077';

      const RECIPIENT = '0x2D893743B2A94Ac1695b5bB38dA965C49cf68450'; // amie's random address

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

      const polygonRelayerAddress = await signer.getAddress();
      console.log('SIGNER ADDRESS', polygonRelayerAddress);

      // await checkRoles(polygonRelayerAddress);

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

      // certificate retirement stuff ==========================
      let bayerMintedTokens = await removalContract.getOwnedTokenIds(
        SUPPLIER_WALLET_ADDRESS
      );
      console.log(`Bayer has ${bayerMintedTokens.length} minted tokens`);

      let bayerMintedTokenBalances = await removalContract.balanceOfBatch(
        new Array(bayerMintedTokens.length).fill(SUPPLIER_WALLET_ADDRESS),
        bayerMintedTokens
      );

      const bayerMintedBalance = bayerMintedTokenBalances.reduce(
        (acc, curr) => acc.add(curr),
        BigNumber.from(0)
      );
      console.log(
        'BAYER MINTED TOKEN BALANCE(TONNES): ',
        FixedNumber.fromValue(bayerMintedBalance, 18).toString()
      );

      const batchesForRetirement = [];

      for (
        let certificateIndex = 0;
        certificateIndex < NUMBER_OF_CERTIFICATES;
        certificateIndex++
      ) {
        const removalIdsForRetirement = [];
        const balancesForRetirement = [];
        let remainingRetirementSizeWei = CERTIFICATE_SIZE_WEI;
        // move through available bayermintedTokens and assemble list of token id and corresponding balance of token ID to retire
        // then break when we've reached the directRetirementSizeWei
        for (let i = 0; i < bayerMintedTokens.length; i++) {
          const tokenId = bayerMintedTokens[i];
          const balance = bayerMintedTokenBalances[i];
          // skip tokens that were minted with 0 balance!
          if (balance.eq(0)) {
            continue;
          }
          if (remainingRetirementSizeWei.gt(balance)) {
            remainingRetirementSizeWei =
              remainingRetirementSizeWei.sub(balance);
            removalIdsForRetirement.push(tokenId);
            balancesForRetirement.push(balance);
          } else {
            removalIdsForRetirement.push(tokenId);
            balancesForRetirement.push(remainingRetirementSizeWei);
            // slice down the bayerMintedTokens and bayerMintedTokenBalances arrays so we don't use what we've pulled
            bayerMintedTokens = bayerMintedTokens.slice(i + 1);
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
          'SUM OF BALANCES FOR RETIREMENT (TONNES): ',
          FixedNumber.fromValue(sumOfBalancesForRetirement, 18).toString()
        );

        batchesForRetirement.push({
          removalIdsForRetirement,
          balancesForRetirement,
        });
      }

      const firstRemovalOfEachBatch = batchesForRetirement.map(
        (batch) => batch.removalIdsForRetirement[0]
      );
      console.log('FIRST REMOVAL OF EACH BATCH', firstRemovalOfEachBatch);

      const consignorTransferTxnDataArray = batchesForRetirement.map(
        (batch) => {
          return removalContract.interface.encodeFunctionData(
            `consignorBatchTransfer`,
            [
              SUPPLIER_WALLET_ADDRESS,
              polygonRelayerAddress,
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
            from: polygonRelayerAddress,
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

      const retireTxnInfoArray = retireTxnDataArray.map((data, index) => {
        return {
          to: removalContract.address,
          from: polygonRelayerAddress,
          gas: latestBlockGasLimit,
          gasPrice: fastGasPriceHexString,
          value: '0x0',
          data: retireTxnDataArray[index],
        };
      });

      const multicallTxnDataArray = retireTxnDataArray.map(
        (retireTxnData, index) => {
          return removalContract.interface.encodeFunctionData('multicall', [
            [consignorTransferTxnDataArray[index], retireTxnData],
          ]);
        }
      );

      const multicallTxnInfoArray = multicallTxnDataArray.map((data, index) => {
        return {
          to: removalContract.address,
          from: polygonRelayerAddress,
          gas: latestBlockGasLimit,
          gasPrice: fastGasPriceHexString,
          value: '0x0',
          data: multicallTxnDataArray[index],
        };
      });

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
    },
  } as const);

(() => {
  const { name, description, run } = GET_SIMULATE_TXN_TASK();
  task(name, description, run);
})();
