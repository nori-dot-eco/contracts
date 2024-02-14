/* eslint-disable no-await-in-loop -- need to submit transactions synchronously to avoid nonce collisions */

import { BigNumber, FixedNumber } from 'ethers';
import { task } from 'hardhat/config';

import { getLogger } from '@/utils/log';
import { getMarket, getRemoval } from '@/utils/contracts';
import { Alchemy, Network, Utils } from 'alchemy-sdk';

export const GET_SIMULATE_TXN_TASK = () =>
  ({
    name: 'simulate-txn',
    description: 'Utility to simulate a transaction with the Alchemy API',
    run: async (
      options: {},
      _: CustomHardHatRuntimeEnvironment
    ): Promise<void> => {
      const logger = getLogger({
        prefix: undefined,
        hre,
      });
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

      const polygonRelayerAddress =
        '0x6fcF5C3E43bE33F4B14BB25B550adb6887C1E48c';

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

      const purchaseAmountEth = 9_000;
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
    },
  } as const);

(() => {
  const { name, description, run } = GET_SIMULATE_TXN_TASK();
  task(name, description, run);
})();
