/* globals network */
import { setupEnvForTests, encodeCall } from '../helpers/utils';

const {
  crcConfig,
  participantRegistryConfig,
  contractRegistryConfig,
  supplierConfig,
  fifoCrcMarketConfig,
  noriConfig,
} = require('../helpers/contractConfigs');
const getNamedAccounts = require('../helpers/getNamedAccounts');

let participantRegistry, crc, supplier, fifoCrcMarket;

const mint = (to, value) =>
  encodeCall(
    'mint',
    ['address', 'bytes', 'uint256', 'bytes'],
    [to, '0x0', value, '0x0']
  );

const testFifoSaleBehavior = () => {
  contract(`FifoTokenizedCommodityMarket`, accounts => {
    beforeEach(async () => {
      global.console.log = () => {};
      ({
        deployedContracts: [
          ,
          { upgradeableContractAtProxy: participantRegistry },
          { upgradeableContractAtProxy: supplier },
          { upgradeableContractAtProxy: crc },
          ,
          { upgradeableContractAtProxy: fifoCrcMarket },
        ],
      } = await setupEnvForTests(
        [
          contractRegistryConfig,
          participantRegistryConfig,
          supplierConfig,
          crcConfig,
          noriConfig,
          fifoCrcMarketConfig,
        ],
        getNamedAccounts(web3).admin0,
        { network, artifacts, accounts, web3 }
      ));
    });

    context('Create a sale using authorizeOperator', () => {
      beforeEach(async () => {
        await participantRegistry.toggleParticipantType(
          'Supplier',
          supplier.address,
          true
        );
        await supplier.toggleSupplier(getNamedAccounts(web3).supplier0, true);
        await supplier.toggleInterface('IMintableCommodity', crc.address, true);
        await supplier.forward(
          crc.address,
          0,
          mint(getNamedAccounts(web3).supplier0, 100),
          'IMintableCommodity',
          {
            from: getNamedAccounts(web3).supplier0,
          }
        );
        await crc.authorizeOperator(fifoCrcMarket.address, 0, {
          from: getNamedAccounts(web3).supplier0,
        });
      });

      describe('revokeOperator', () => {
        it('should cancel the sale in the market', async () => {
          await assert.equal(
            await crc.allowanceForAddress(
              fifoCrcMarket.address,
              getNamedAccounts(web3).supplier0
            ),
            100
          );
          await crc.revokeOperator(fifoCrcMarket.address, 0, {
            from: getNamedAccounts(web3).supplier0,
          });
          await assert.equal(
            await crc.allowanceForAddress(
              fifoCrcMarket.address,
              getNamedAccounts(web3).supplier0
            ),
            0
          );
        });
      });
    });
  });
};

module.exports = {
  testFifoSaleBehavior,
};
