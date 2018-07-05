import expectThrow from '../helpers/expectThrow';
import token from '../helpers/ether';
import { getLogs, deployUpgradeableContract } from '../helpers/contracts';
import { NoriV0_1_0, FifoCrcMarketV0_1_0, CRCV0 } from '../helpers/Artifacts';
import { upgradeToV0 } from './UnstructuredUpgrades';
import { deployUpgradeableCrc } from './Crc';

const shouldBehaveLikeFifoCrcMarketV0 = admin => {
  // test state
  let noriToken;
  let fifoCrcMarket;
  let crc;
  let buyersNoriBal;
  let suppliersNoriBal;
  let buyersCrcBal;
  let suppliersCrcBal;
  let fifomarketAddr;
  let buyer;
  let supplier;
  let contractRegistry;
  let participantRegistry;

  // test parameters
  const fifoOrder = [2, 0, 1];
  const crcValue = 1;
  const noriToMint = 6;
  const crcToMint = 3;

  contract('FifoCrcMarketV0_1_0', accounts => {
    before(async () => {
      [noriToken, , , contractRegistry] = await upgradeToV0(
        admin,
        NoriV0_1_0,
        false
      );
      [participantRegistry, , crc] = await deployUpgradeableCrc(
        CRCV0,
        admin,
        contractRegistry
      );

      buyer = accounts[0];
      supplier = accounts[1];

      const initParams = [
        ['address', 'address[]', 'address'],
        [contractRegistry.address, [crc.address, noriToken.address], admin],
      ];
      [, fifoCrcMarket] = await deployUpgradeableContract(
        artifacts,
        null,
        FifoCrcMarketV0_1_0,
        contractRegistry,
        initParams
      );

      buyersNoriBal = 0;
      suppliersNoriBal = 0;
      buyersCrcBal = 0;
      suppliersCrcBal = 0;
      fifomarketAddr = await fifoCrcMarket.address;
    });
    beforeEach(async () => {
      // temporaily using a toggle to allow contract calls from addresses not proxyed through participant identy contract
      await crc.toggleParticipantCalling(false, { from: accounts[0] });
    });
    describe('Test different possible sale scenarios for CRCs:NORI', () => {
      describe('Mint NORI and CRCs', () => {
        it(`should mint ${noriToMint} NORI`, async () => {
          noriToken.mint(buyer, token(noriToMint), '0x0');
          buyersNoriBal += noriToMint;
          assert.equal(
            await noriToken.balanceOf(buyer),
            token(buyersNoriBal),
            'NORI mint fail'
          );
        });

        it(`should mint ${crcToMint} CRCs with a value of ${crcValue}`, async () => {
          for (let i = 0; i < crcToMint; i++) {
            crc.mint(supplier, '', token(crcValue), '');
          }
          suppliersCrcBal += crcToMint;
          assert.equal(
            await crc.balanceOf(supplier),
            suppliersCrcBal,
            'crc mint fail'
          );
        });
      });

      describe(`When creating ${
        fifoOrder.length
      } CRC sales by making the market contract an authorized operator`, () => {
        let saleCreatedLogs;
        before(async () => {
          fifoOrder.forEach(index => {
            crc.authorizeOperator(fifomarketAddr, index, {
              from: supplier,
            });
          });
          saleCreatedLogs = await getLogs(
            fifoCrcMarket.SaleCreated,
            {},
            { fromBlock: 0, toBlock: 'latest' }
          );
        });

        it(`should create sales with CRC IDs of ${fifoOrder}`, async () => {
          await Promise.all(
            fifoOrder.map(async index => {
              assert.equal(
                await crc.isOperatorForOne(fifomarketAddr, index),
                true,
                'Sale failed'
              );
            })
          );
        });

        it(`should log ${fifoOrder.length} SaleCreated events`, () => {
          assert.equal(
            saleCreatedLogs.length,
            fifoOrder.length,
            'No SaleCreated events were logged'
          );
        });

        describe('The SaleCreated event', () => {
          let event;
          before(() => {
            event = saleCreatedLogs[0];
          });
          it('should have a "tokenId" arg', () => {
            assert.equal(
              event.args.tokenId,
              fifoOrder[0],
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
              supplier,
              'SaleCreated event has incorrect "seller" value'
            );
          });
          it('should have a "value" arg', () => {
            assert.equal(
              event.args.value,
              token(crcValue),
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

        describe('When the market contract is made an authorized operator of NORI', () => {
          let saleSuccessfulLogs;
          before(async () => {
            fifoOrder.forEach(() => {
              noriToken.authorizeOperator(fifomarketAddr, token(crcValue), {
                from: buyer,
              });
              buyersNoriBal -= crcValue;
              suppliersNoriBal += crcValue;
              buyersCrcBal += crcValue;
            });
            saleSuccessfulLogs = await getLogs(
              fifoCrcMarket.SaleSuccessful,
              {},
              {
                fromBlock: 0,
                toBlock: 'latest',
              }
            );
          });

          it('should transfer listed CRCs from supplier to buyer and NORI from buyer to supplier', async () => {
            await fifoOrder.map(async index => {
              assert.equal(
                buyer,
                await crc.ownerOf(index),
                'First account doesnt own the crc'
              );
            });
          });

          it(`should log ${fifoOrder.length} SaleSuccessful events`, () => {
            assert.equal(
              saleSuccessfulLogs.length,
              fifoOrder.length,
              'Wrong number of SaleSuccessful events were logged'
            );
          });

          describe('The SaleSuccessful event', () => {
            let event;
            before(() => {
              event = saleSuccessfulLogs[0];
            });

            it('should have a "tokenId" arg', () => {
              assert.equal(
                event.args.tokenId,
                fifoOrder[0],
                'Incorrect value for "tokenId" arg'
              );
            });
            it('should have a "value" arg', () => {
              assert.equal(
                event.args.value.toString(),
                token(crcValue),
                'Incorrect value for "value" arg'
              );
            });
            it('should have a "buyer" arg', () => {
              assert.equal(
                event.args.buyer,
                buyer,
                'Incorrect value for "buyer" arg'
              );
            });
          });
        });
      });

      // Crc splitting test
      describe('Create a CRC sale worth more than the buyers balance testing split functionality', () => {
        const buyAmount = 3;
        const saleAmount = 8;
        const crcIdToSplit = 3;
        it('should mint a CRC', async () => {
          await crc.mint(supplier, '0x0', token(saleAmount), '0x0');
          suppliersCrcBal += 1;
          assert.equal(
            await crc.balanceOf(supplier),
            suppliersCrcBal,
            'crc mint fail'
          );
        });
        // sell crc
        it(`should create sale with CRC ID ${crcIdToSplit}`, async () => {
          await crc.authorizeOperator(fifomarketAddr, crcIdToSplit, {
            from: supplier,
          });
        });

        // buy crc
        it('should buy CRC by transfering crc to buyer and NORI to supplier', async () => {
          await noriToken.authorizeOperator(fifomarketAddr, token(buyAmount), {
            from: buyer,
          });
          buyersNoriBal -= buyAmount;
          suppliersNoriBal += buyAmount;
          buyersCrcBal += crcValue;

          assert.equal(
            supplier,
            await crc.ownerOf(crcIdToSplit),
            'supplier doesnt own the original crc'
          );
          assert.equal(
            buyer,
            await crc.ownerOf(crcIdToSplit + 1),
            'buyer doesnt own the newly split crc'
          );
          assert.equal(
            await noriToken.balanceOf(buyer),
            buyersNoriBal,
            'Buyer didnt spend tokens'
          );
          assert.equal(
            await noriToken.balanceOf(supplier),
            token(suppliersNoriBal),
            'Seller didnt recieve payment'
          );
          assert.equal(
            await crc.getCommodityValueByIndex(crcIdToSplit),
            token(saleAmount - buyAmount),
            'CRC is the wrong value'
          );
          assert.equal(
            await crc.getCommodityValueByIndex(crcIdToSplit + 1),
            token(buyAmount),
            'CRC is the wrong value'
          );
        });

        describe('Make sure you cant buy your own crcs', () => {
          it('should fail trying to buy your own crc', async () => {
            assert.equal(
              await noriToken.balanceOf(supplier),
              token(suppliersNoriBal),
              'Invalid Balance'
            );
            assert.equal(
              await fifoCrcMarket.getSaleSeller.call(crcIdToSplit),
              supplier,
              'supplier is not the seller'
            );
            await expectThrow(
              noriToken.authorizeOperator(
                fifomarketAddr,
                token(saleAmount - buyAmount),
                {
                  from: supplier,
                }
              )
            );
          });
        });
      });
    });
  });
};

module.exports = { shouldBehaveLikeFifoCrcMarketV0 };
