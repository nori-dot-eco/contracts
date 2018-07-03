/* eslint no-console: "off" */
/**
 * script to generate some sample data for use in truffle develop.
 * After running truffle develop in the root of this package directory:
 *
 *   > require('./geth-scripts/sample-data.js')(global);
 *
 * You can run the above multiple times for added fun!
 */

const ethSigner = require('eth-signer');
const { getLogs } = require('../test/helpers/contracts');

async function withEventLogs(Contracts, func) {
  const watchedEvents = [];
  await Promise.all(
    Contracts.map(async Contract => {
      const contract = await Contract.deployed();
      const events = contract.allEvents();
      watchedEvents.push(events);
      events.watch((err, event) => {
        console.log(
          `${Contract.contractName}.${event.event}(`,
          Object.keys(event.args)
            .reduce(
              (acc, a) => [...acc, `${a}=${event.args[a].toString()}`],
              []
            )
            .join(' ')
        );
      });
    })
  );
  try {
    await func();
  } finally {
    watchedEvents.forEach(events => events.stopWatching());
  }
}

module.exports = async function genSampleData(global) {
  const { NoriV0_1_0, CRCV0, FifoCrcMarketV0_1_0, Supplier, web3 } = global;
  const suppliers = web3.eth.accounts.slice(0, 2);
  const buyers = web3.eth.accounts.slice(2, 4);

  const tonToken = await NoriV0_1_0.deployed();
  const crc = await CRCV0.deployed();
  const fifoCrcMarket = await FifoCrcMarketV0_1_0.deployed();
  const supplier = await Supplier.deployed();

  withEventLogs(
    [NoriV0_1_0, CRCV0, FifoCrcMarketV0_1_0, Supplier],
    async () => {
      console.log('TonToken address:', NoriV0_1_0.address);
      await Promise.all(
        web3.eth.accounts.map(async account => {
          console.log('Minting 100 NORI for', account);
          await tonToken.mint(account, web3.toWei(100), '0x0');
        })
      );

      console.log('Toggling participant type');
      await supplier.toggleParticipantType(true);
      console.log('Toggline interface');
      await supplier.toggleInterface('IMintableCommodity', crc.address, true);

      await Promise.all(
        suppliers.map(async account => {
          console.log('Registering', account, 'as a supplier');
          await supplier.toggleSupplier(account, true);
          console.log('Done Registering', account, 'as a supplier');
        })
      );

      console.log('Toggling crc participant calling');
      await crc.toggleParticpantCalling(true);

      await Promise.all(
        suppliers.map(async account => {
          console.log('Minting 100 CRCs for', account);
          const mint = ethSigner.txutils._encodeFunctionTxData(
            'mint',
            ['address', 'bytes', 'uint256', 'bytes'],
            [account, '0x0', web3.toWei(20), '0x0']
          );
          for (let i = 0; i < 5; i++) {
            await supplier.forward(
              crc.address,
              0,
              `0x${mint}`,
              'IMintableCommodity'
            );
          }
          console.log('Done minting CRCs for', account);
        })
      );

      try {
        await Promise.all(
          suppliers.map(async account => {
            console.log('Listing some CRCs for sale by', account);
            const logs = await getLogs(
              crc.Minted,
              { to: account },
              { fromBlock: 0, toBlock: 'latest' }
            );
            await Promise.all(
              logs.slice(0, 2).map(log => {
                console.log(
                  'Listing CRC',
                  log.args.commodityId.toNumber(),
                  'for sale by',
                  account
                );
                return crc.authorizeOperator(
                  fifoCrcMarket.address,
                  log.args.commodityId,
                  { from: account }
                );
              })
            );
          })
        );
      } catch (e) {
        console.error(e);
        getLogs(crc.AuthorizedOperator).then(console.log);
      }

      await Promise.all(
        buyers.map(async account => {
          console.log('purchasing 10 CRCs for', account);
          await tonToken.authorizeOperator(
            fifoCrcMarket.address,
            web3.toWei(10),
            {
              from: account,
            }
          );
          await tonToken.authorizeOperator(
            fifoCrcMarket.address,
            web3.toWei(10),
            {
              from: account,
            }
          );
        })
      );
      console.log('All done...');
    }
  );
};
