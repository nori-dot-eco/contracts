/* globals artifacts */
import expectThrow from '../helpers/expectThrow';
import { getLogs, deployUpgradeableContract } from '../helpers/contracts';
import { ContractRegistryV0_1_0 } from '../helpers/Artifacts';
import { deployUpgradeableParticipantRegistry } from './ParticipantRegistry';

const shouldBehaveLikeCrc = (admin, CrcContract, upgradeable = false) => {
  let crc;
  let crcBalanceAccount0;
  let crcBalanceAccount1;

  before(async () => {
    if (upgradeable) {
      const contractRegistry = await ContractRegistryV0_1_0.new();
      [, , crc] = await deployUpgradeableCrc(
        CrcContract,
        admin,
        contractRegistry
      );
    }
  });

  contract('CRCV0_2_0', accounts => {
    beforeEach(async () => {
      // temporaily using a toggle to allow contract calls from addresses not proxyed through participant identy contract
      await crc.toggleParticipantCalling(false, { from: accounts[0] });
    });

    describe('Ensure CRC can only transfer once', () => {
      it('should mint 1 CRC', async () => {
        await crc.mint(accounts[0], '0x0', 1, '0x0');
        crcBalanceAccount0 = await crc.balanceOf(accounts[0]);
        await assert.equal(crcBalanceAccount0.toNumber(), 1, 'crc mint fail');
      });
      it('should transfer the CRC', async () => {
        await crc.transfer(accounts[1], 0, { from: accounts[0] });
        crcBalanceAccount0 = await crc.balanceOf(accounts[0]);
        await assert.equal(
          crcBalanceAccount0.toNumber(),
          0,
          'crc transfer fail'
        );
        crcBalanceAccount1 = await crc.balanceOf(accounts[1]);
        await assert.equal(
          crcBalanceAccount1.toNumber(),
          1,
          'crc transfer fail'
        );
      });
      it('should fail when transafering retired crc', async () => {
        await expectThrow(crc.transfer(accounts[0], 0, { from: accounts[1] }));
        crcBalanceAccount0 = await crc.balanceOf(accounts[0]);
        await assert.equal(
          crcBalanceAccount0.toNumber(),
          0,
          'crc transfer fail'
        );
        crcBalanceAccount1 = await crc.balanceOf(accounts[1]);
        await assert.equal(
          crcBalanceAccount1.toNumber(),
          1,
          'crc transfer fail'
        );
      });
      it('should fail when trying to authorize a retired crc', async () => {
        await expectThrow(
          crc.authorizeOperator(accounts[2], 0, {
            from: accounts[1],
          })
        );
      });
    });

    describe('After minting a CRC', () => {
      let mintedLogs;
      before(async () => {
        crc.mint(accounts[0], '0x0', 1, '0x0');
        mintedLogs = await getLogs(crc.Minted);
      });

      it('should put a Minted event into the logs', () => {
        assert.equal(
          mintedLogs.length,
          1,
          'Expected one Minted event to have been sent'
        );
      });

      describe('The Minted event', () => {
        it("should include a 'to' arg", () => {
          assert.equal(
            mintedLogs[0].args.to,
            accounts[0],
            'Expected Minted Event "to" arg to be the buyer'
          );
        });

        it("should include an 'amount' arg", () => {
          assert.equal(
            mintedLogs[0].args.amount.toString(),
            1,
            'Expected Minted Event "amount" arg to be the amount minuted'
          );
        });

        it("should include a 'commodityId' arg", () => {
          assert.equal(
            mintedLogs[0].args.commodityId.toString(),
            '1',
            'Expected Minted Event "commodityId" arg to be the generated commodityId'
          );
        });

        it("should include an 'operator' arg", () => {
          assert.equal(
            mintedLogs[0].args.operator,
            accounts[0],
            'Expected Minted Event "operator" arg to be the sender'
          );
        });

        it("should include an 'operatorData' arg", () => {
          assert.equal(
            mintedLogs[0].args.operatorData.toString(),
            '0x',
            'Expected Minted Event "operatorData" arg to be the passed in operatorData'
          );
        });
      });

      describe('when authorizing an operator', () => {
        let authorizedOperatorLogs;
        before(async () => {
          crc.authorizeOperator(accounts[1], mintedLogs[0].args.commodityId);
          authorizedOperatorLogs = await getLogs(crc.AuthorizedOperator);
        });

        it('should log an AuthorizedOperator event', () => {
          assert.equal(
            authorizedOperatorLogs.length,
            1,
            'Expected AuthorizedOperator event to be logged'
          );
        });

        describe('The AuthorizedOperator event', () => {
          let event;
          before(() => {
            event = authorizedOperatorLogs[0];
          });
          it("should include an 'operator' arg", () => {
            assert.equal(
              event.args.operator,
              accounts[1],
              'Expected operator event arg to be the operator that was authorized'
            );
          });

          it("should include a 'tokenHolder' arg", () => {
            assert.equal(
              event.args.tokenHolder,
              accounts[0],
              'Expected tokenHolder event arg to be the owner of the crc'
            );
          });
        });
      });
    });
    context('After minting a CRC', () => {
      describe('balanceOf (V0_2_0)', () => {
        it('should mint 2 CRC bundles valued at a total of 15', async () => {
          await crc.mint(accounts[5], '0x0', 5, '0x0');
          await crc.mint(accounts[5], '0x0', 10, '0x0');

          const crcBalanceAccount5 = await crc.balanceOf(accounts[5]);
          await assert.equal(
            crcBalanceAccount5.toString(),
            15,
            'crc mint fail'
          );
        });
      });
    });
  });
};

const deployUpgradeableCrc = async (CrcContract, admin, contractRegistry) => {
  const [, participantRegistry] = await deployUpgradeableParticipantRegistry(
    admin,
    contractRegistry
  );
  const initParams = [
    ['string', 'string', 'address', 'address', 'address'],
    [
      'Carbon Removal Certificate',
      'CRC',
      contractRegistry.address,
      participantRegistry.address,
      admin,
    ],
  ];
  const [, crc, proxy] = await deployUpgradeableContract(
    artifacts,
    null,
    CrcContract,
    contractRegistry,
    initParams
  );

  return [participantRegistry, proxy, crc];
};

module.exports = { shouldBehaveLikeCrc, deployUpgradeableCrc };
