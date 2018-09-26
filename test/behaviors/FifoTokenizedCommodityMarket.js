/* globals network */
import {
  setupEnvForTests,
  encodeCall,
  callFunctionAsMultiAdmin,
} from '../helpers/utils';
import expectThrow from '../helpers/expectThrow';

const { getLogs } = require('../helpers/contracts');
const {
  crcConfig,
  participantRegistryConfig,
  contractRegistryConfig,
  supplierConfig,
  verifierConfig,
  fifoCrcMarketConfig,
  noriConfig,
  riskMitigationAccountConfig,
} = require('../helpers/contractConfigs');

let participantRegistry,
  crc,
  supplier,
  fifoCrcMarket,
  verifier,
  nori,
  multiAdmin;
const {
  buyer0,
  buyer1,
  supplier0,
  verifier0,
  admin0,
} = require('../helpers/getNamedAccounts')(web3);

const mint = (to, value) =>
  encodeCall(
    'mint',
    ['address', 'bytes', 'uint256', 'bytes'],
    [to, '0x0', value, '0x0']
  );

const verify = (crcId, score) =>
  encodeCall('verify', ['uint256', 'bytes', 'uint64'], [crcId, '0x0', score]);

const testFifoSaleBehavior = () => {
  contract(`FifoTokenizedCommodityMarket`, accounts => {
    beforeEach(async () => {
      ({
        multiAdmin,
        deployedContracts: [
          ,
          // contractRegistry
          { upgradeableContractAtProxy: participantRegistry },
          { upgradeableContractAtProxy: supplier },
          { upgradeableContractAtProxy: verifier },
          { upgradeableContractAtProxy: crc },
          { upgradeableContractAtProxy: nori },
          ,
          // riskMitigationAccount
          { upgradeableContractAtProxy: fifoCrcMarket },
        ],
      } = await setupEnvForTests(
        [
          contractRegistryConfig,
          participantRegistryConfig,
          supplierConfig,
          verifierConfig,
          crcConfig,
          noriConfig,
          riskMitigationAccountConfig,
          fifoCrcMarketConfig,
        ],
        admin0,
        { network, artifacts, accounts, web3 }
      ));
      // enable supplier functionality
      await callFunctionAsMultiAdmin(
        multiAdmin,
        participantRegistry,
        0,
        'toggleParticipantType',
        ['Supplier', supplier.address, true]
      );
      await callFunctionAsMultiAdmin(
        multiAdmin,
        supplier,
        0,
        'toggleSupplier',
        [supplier0, true]
      );
      await callFunctionAsMultiAdmin(
        multiAdmin,
        supplier,
        0,
        'toggleInterface',
        ['IMintableCommodity', crc.address, true]
      );
      // enable verifier functionality
      await callFunctionAsMultiAdmin(
        multiAdmin,
        participantRegistry,
        0,
        'toggleParticipantType',
        ['Verifier', verifier.address, true]
      );
      await callFunctionAsMultiAdmin(
        multiAdmin,
        verifier,
        0,
        'toggleVerifier',
        [verifier0, true]
      );
      await callFunctionAsMultiAdmin(
        multiAdmin,
        verifier,
        0,
        'toggleInterface',
        ['IVerifiableCommodity', crc.address, true]
      );
    });

    context('Create a sale using authorizeOperator', () => {
      beforeEach(async () => {
        // mint crc[0] with a value of 100 using supplier0's account
        await supplier.forward(
          crc.address,
          0,
          mint(supplier0, 100),
          'IMintableCommodity',
          {
            from: supplier0,
          }
        );
        // verify crc[0] with a 100% rating using verifier0's account
        await verifier.forward(
          crc.address,
          0,
          verify(0, 100),
          'IVerifiableCommodity',
          {
            from: verifier0,
          }
        );
        // list crc[0] for sale
        await crc.authorizeOperator(fifoCrcMarket.address, 0, {
          from: supplier0,
        });
      });

      describe('revokeOperator', () => {
        it('should cancel the sale in the market', async () => {
          assert.equal(
            await crc.allowanceForAddress(fifoCrcMarket.address, supplier0),
            100
          );
          await crc.revokeOperator(fifoCrcMarket.address, 0, {
            from: supplier0,
          });
          assert.equal(
            await crc.allowanceForAddress(fifoCrcMarket.address, supplier0),
            0
          );
        });
      });
    });

    context(
      'Create a CRC sale from a supplier account, then purchase part of that CRC using a buyer account',
      () => {
        beforeEach(async () => {
          await nori.mint(buyer0, web3.toWei('100'), '');
          await nori.mint(buyer1, web3.toWei('100'), '');

          await supplier.forward(
            crc.address,
            0,
            mint(supplier0, web3.toWei('100')),
            'IMintableCommodity',
            {
              from: supplier0,
            }
          );
          await crc.authorizeOperator(fifoCrcMarket.address, 0, {
            from: supplier0,
          });
        });

        it('should split the CRC by using the market contract when the buyer purchases only part of the listed sale', async () => {
          await nori.authorizeOperator(
            fifoCrcMarket.address,
            web3.toWei('50'),
            {
              from: buyer0,
            }
          );

          assert.equal(
            await crc.allowanceForAddress(fifoCrcMarket.address, supplier0),
            web3.toWei('50')
          );
          assert.equal(await crc.balanceOf(buyer0), web3.toWei('50'));
        });

        it('should split the CRC by using the market contract when the buyer0 purchases only part of the listed sale. Buyer1 should be able to buy the remainder in two purchases', async () => {
          await nori.authorizeOperator(
            fifoCrcMarket.address,
            web3.toWei('50'),
            {
              from: buyer0,
            }
          );
          await nori.authorizeOperator(
            fifoCrcMarket.address,
            web3.toWei('25'),
            {
              from: buyer1,
            }
          );
          await nori.authorizeOperator(
            fifoCrcMarket.address,
            web3.toWei('25'),
            {
              from: buyer1,
            }
          );
          assert.equal(
            await crc.allowanceForAddress(fifoCrcMarket.address, supplier0),
            0
          );

          assert.equal(await crc.balanceOf(supplier0), 0);
          assert.equal(await crc.balanceOf(buyer0), web3.toWei('50'));
          assert.equal(await crc.balanceOf(buyer1), web3.toWei('50'));
          assert.equal(await crc.ownerOf(0), buyer1);
          assert.equal(await crc.ownerOf(1), buyer0);
          assert.equal(await crc.ownerOf(2), buyer1);
        });
      }
    );

    describe('SaleCreated (event)', () => {
      let saleCreatedLogs;
      let event;
      beforeEach(async () => {
        await supplier.forward(
          crc.address,
          0,
          mint(supplier0, web3.toWei('1')),
          'IMintableCommodity',
          {
            from: supplier0,
          }
        );
        await crc.authorizeOperator(fifoCrcMarket.address, 0, {
          from: supplier0,
        });

        saleCreatedLogs = await getLogs(
          fifoCrcMarket.SaleCreated,
          {},
          { fromBlock: 0, toBlock: 'latest' }
        );
        event = saleCreatedLogs[0];
      });

      it(`should log 1 SaleCreated events`, () => {
        assert.equal(
          saleCreatedLogs.length,
          1,
          'No SaleCreated events were logged'
        );
      });
      it('should have a "tokenId" arg', () => {
        assert.equal(
          event.args.tokenId,
          0,
          'SaleCreated event has incorrect tokenId value'
        );
      });
      it('should have a "category" arg', () => {
        assert.equal(
          event.args.category,
          1,
          'SaleCreated event has incorrect "category" value'
        );
      });
      it('should have a "saleType" arg', () => {
        assert.equal(
          event.args.saleType,
          2,
          'SaleCreated event has incorrect "saleType" value'
        );
      });
      it('should have a "seller" arg', () => {
        assert.equal(
          event.args.seller,
          supplier0,
          'SaleCreated event has incorrect "seller" value'
        );
      });
      it('should have a "value" arg', () => {
        assert.equal(
          event.args.value,
          web3.toWei('1'),
          'SaleCreated event has incorrect "value" value'
        );
      });
      it('should have a "misc" arg', () => {
        assert.equal(
          event.args.misc,
          '0x',
          'SaleCreated event has incorrect "misc" value'
        );
      });
      it('should have a "startedAt" arg', () => {
        assert.isBelow(
          Math.abs(
            Math.floor(new Date().getTime() / 1000) -
              event.args.startedAt.toNumber()
          ),
          60, // we can't stub out time, but it should be within 60 seconds of this check
          'SaleCreated event has incorrect "startedAt" value'
        );
      });
    });

    describe('SaleSuccessful (event)', () => {
      let saleSuccessfulLogs, event;
      beforeEach(async () => {
        await supplier.forward(
          crc.address,
          0,
          mint(supplier0, web3.toWei('50')),
          'IMintableCommodity',
          {
            from: supplier0,
          }
        );
        await crc.authorizeOperator(fifoCrcMarket.address, 0, {
          from: supplier0,
        });
        await nori.mint(buyer0, web3.toWei('1'), '');
        await nori.authorizeOperator(fifoCrcMarket.address, web3.toWei('1'), {
          from: buyer0,
        });

        saleSuccessfulLogs = await getLogs(
          fifoCrcMarket.SaleSuccessful,
          {},
          {
            fromBlock: 0,
            toBlock: 'latest',
          }
        );
        event = saleSuccessfulLogs[0];
      });

      it('should transfer listed CRCs from supplier to buyer and NORI from buyer to supplier', async () => {
        assert.equal(
          buyer0,
          await crc.ownerOf(1),
          'First account doesnt own the crc'
        );
      });

      it(`should log 1 SaleSuccessful events`, () => {
        assert.equal(
          saleSuccessfulLogs.length,
          1,
          'Wrong number of SaleSuccessful events were logged'
        );
      });

      it('should have a "tokenId" arg', () => {
        assert.equal(
          event.args.tokenId,
          0,
          'Incorrect value for "tokenId" arg'
        );
      });
      it('should have a "value" arg', () => {
        assert.equal(
          event.args.value,
          web3.toWei('1'),
          'Incorrect value for "value" arg'
        );
      });
      it('should have a "buyer" arg', () => {
        assert.equal(
          event.args.buyer,
          buyer0,
          'Incorrect value for "buyer" arg'
        );
      });
    });

    context('Make sure you cant buy your own crcs', () => {
      it('should fail trying to buy your own crc', async () => {
        await nori.mint(supplier0, web3.toWei('1'), '');
        await supplier.forward(
          crc.address,
          0,
          mint(supplier0, web3.toWei('1')),
          'IMintableCommodity',
          {
            from: supplier0,
          }
        );
        await crc.authorizeOperator(fifoCrcMarket.address, 0, {
          from: supplier0,
        });
        await expectThrow(
          nori.authorizeOperator(fifoCrcMarket.address, web3.toWei('1'), {
            from: supplier0,
          })
        );
      });
    });
  });
};

module.exports = {
  testFifoSaleBehavior,
};
