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

let participantRegistry, basicCommodity, supplier;

const mint = (to, value) =>
  encodeCall(
    'mint',
    ['address', 'bytes', 'uint256', 'bytes'],
    [to, '0x0', value, '0x0']
  );

const testBasicCommodityFunctions = () => {
  contract(`BasicCommodity`, accounts => {
    beforeEach(async () => {
      ({
        deployedContracts: [
          ,
          { upgradeableContractAtProxy: participantRegistry },
          { upgradeableContractAtProxy: supplier },
          { upgradeableContractAtProxy: basicCommodity },
          ,
          ,
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

    context('Tests for commodities behavior in initial state', () => {
      describe('getTotalSupply', () => {
        it('should handle a case with no supply', async () => {
          await assert.equal(await basicCommodity.getTotalSupply(1), 0);
        });
      });
    });

    context(
      'Enable the minting and supplier interfaces needed for third party operator scenarios and mint 1 crc',
      () => {
        beforeEach(async () => {
          await participantRegistry.toggleParticipantType(
            'Supplier',
            supplier.address,
            true
          );
          await supplier.toggleSupplier(getNamedAccounts(web3).supplier0, true);
          await supplier.toggleInterface(
            'IMintableCommodity',
            basicCommodity.address,
            true
          );
          await supplier.forward(
            basicCommodity.address,
            0,
            mint(getNamedAccounts(web3).supplier0, 100),
            'IMintableCommodity',
            {
              from: getNamedAccounts(web3).supplier0,
            }
          );
          await basicCommodity.authorizeOperator(
            getNamedAccounts(web3).admin0,
            0,
            {
              from: getNamedAccounts(web3).supplier0,
            }
          );
        });
        describe('authorizeOperator', () => {
          it('should have an allowance of 100 for supplier0', async () => {
            await supplier.forward(
              basicCommodity.address,
              0,
              mint(getNamedAccounts(web3).supplier0, 100),
              'IMintableCommodity',
              {
                from: getNamedAccounts(web3).supplier0,
              }
            );
            await basicCommodity.authorizeOperator(
              getNamedAccounts(web3).admin0,
              1,
              {
                from: getNamedAccounts(web3).supplier0,
              }
            );
            await assert.equal(
              await basicCommodity.allowanceForAddress(
                getNamedAccounts(web3).admin0,
                getNamedAccounts(web3).supplier0
              ),
              200
            );
          });
        });
        describe('revokeOperator', () => {
          it('should have an allowance of 0 for supplier0', async () => {
            await basicCommodity.revokeOperator(
              getNamedAccounts(web3).admin0,
              0,
              {
                from: getNamedAccounts(web3).supplier0,
              }
            );
            await assert.equal(
              await basicCommodity.allowanceForAddress(
                getNamedAccounts(web3).admin0,
                getNamedAccounts(web3).supplier0
              ),
              0
            );
          });
        });
        describe('allowanceForAddress', () => {
          it('should have an allowance of 100 for supplier0', async () => {
            await assert.equal(
              await basicCommodity.allowanceForAddress(
                getNamedAccounts(web3).admin0,
                getNamedAccounts(web3).supplier0
              ),
              100
            );
          });
        });
        describe('cumulativeAllowanceOf', () => {
          it('should have a cumulative allowance of 100 CRCs', async () => {
            await assert.equal(
              await basicCommodity.cumulativeAllowanceOf(
                getNamedAccounts(web3).admin0
              ),
              100
            );
          });
        });
        describe('bundleAllowanceForAddress', () => {
          it('should have an operator bundle balance of 1 for supplier0', async () => {
            await assert.equal(
              await basicCommodity.bundleAllowanceForAddress(
                getNamedAccounts(web3).admin0,
                getNamedAccounts(web3).supplier0
              ),
              1
            );
          });
        });
        context('After sending the approved crc', () => {
          describe('operatorSendOne', () => {
            it('should allow operator to send 1 CRC', async () => {
              await basicCommodity.operatorSendOne(
                getNamedAccounts(web3).supplier0,
                getNamedAccounts(web3).supplier1,
                0,
                '0x0',
                '0x0',
                {
                  from: getNamedAccounts(web3).admin0,
                }
              );
              await assert.equal(
                await basicCommodity.cumulativeAllowanceOf(
                  getNamedAccounts(web3).admin0
                ),
                0
              );
              await assert.equal(
                await basicCommodity.allowanceForAddress(
                  getNamedAccounts(web3).admin0,
                  getNamedAccounts(web3).supplier0
                ),
                0
              );
              await assert.equal(
                await basicCommodity.bundleAllowanceForAddress(
                  getNamedAccounts(web3).admin0,
                  getNamedAccounts(web3).supplier0
                ),
                0
              );
            });
          });
        });
      }
    );
  });
};

module.exports = {
  testBasicCommodityFunctions,
};
