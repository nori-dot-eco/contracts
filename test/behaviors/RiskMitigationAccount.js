/* globals network */
import {
  setupEnvForTests,
  encodeCall,
  callFunctionAsMultiAdmin,
} from '../helpers/utils';

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
  nori,
  multiAdmin,
  verifier,
  riskMitigationAccount;
const {
  buyer0,
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

const shouldBehaveLikeARiskMitigationAccount = () => {
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
          { upgradeableContractAtProxy: riskMitigationAccount },
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
      // mint crc[0] with a value of 100 using supplier0's account
      await supplier.forward(
        crc.address,
        0,
        mint(supplier0, web3.toWei('100')),
        'IMintableCommodity',
        {
          from: supplier0,
        }
      );
      // verify crc[0] with a 50% rating using verifier0's account
      await verifier.forward(
        crc.address,
        0,
        verify(0, 50),
        'IVerifiableCommodity',
        {
          from: verifier0,
        }
      );
      // create a sale in the fifo market for crc[0] using supplier0's account
      await crc.authorizeOperator(fifoCrcMarket.address, 0, {
        from: supplier0,
      });
      // mint 100 NORI tokens
      await nori.mint(buyer0, web3.toWei('100'), '');
      // purchase the crc[0] for sale using the buyer's account
      await nori.authorizeOperator(fifoCrcMarket.address, web3.toWei('100'), {
        from: buyer0,
      });
    });

    context(
      'After selling CRC[0] with a rating of 50%, supplier0 should have 50 NORI tokens, and the risk mitigation account should have 50 assigned to supplier0',
      () => {
        describe('getRestrictedBalance', () => {
          it('should return a restricted NORI balance of 50', async () => {
            const restrictedBalance = await riskMitigationAccount.getRestrictedBalance.call(
              supplier0
            );
            const unrestrictedBalance = await nori.balanceOf(supplier0);
            const buyerBalance = await nori.balanceOf(buyer0);
            assert.equal(
              restrictedBalance,
              web3.toWei('50'),
              `expected a restricted NORI balance of 50, but got
              ${restrictedBalance.toString()}`
            );
            assert.equal(
              unrestrictedBalance,
              web3.toWei('50'),
              `expected an unrestricted NORI balance of 50, but got
              ${unrestrictedBalance.toString()}`
            );
            assert.equal(
              buyerBalance,
              0,
              `expected a NORI balance of 0, but got
              ${buyerBalance.toString()}`
            );
          });
        });
      }
    );
  });
};

module.exports = {
  shouldBehaveLikeARiskMitigationAccount,
};
