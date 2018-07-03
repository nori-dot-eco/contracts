import expectThrow from '../helpers/expectThrow';
import {
  ContractRegistryV0_1_0,
  SupplierV0_1_0,
  CRCV0,
} from '../helpers/Artifacts';
import { deployUpgradeableContract } from '../helpers/contracts';
import { deployUpgradeableCrc } from './Crc';

const lightwallet = require('eth-signer');

const shouldBehaveLikeSupplier = admin => {
  contract('SupplierV0_1_0', accounts => {
    let crc;
    let supplier;
    let supplierAcc;
    let mint;
    let nonSupplierMint;
    let supplierCrcBal;
    let crcAddress;
    let participantRegistry;

    before(async () => {
      const contractRegistry = await ContractRegistryV0_1_0.new();
      [participantRegistry, , crc] = await deployUpgradeableCrc(
        CRCV0,
        admin,
        contractRegistry
      );

      const initParams = [
        ['address', 'address', 'address'],
        [contractRegistry.address, participantRegistry.address, admin],
      ];
      [, supplier] = await deployUpgradeableContract(
        artifacts,
        null,
        SupplierV0_1_0,
        contractRegistry,
        initParams
      );

      crcAddress = await crc.address;
      supplierAcc = admin;
      mint = `0x${lightwallet.txutils._encodeFunctionTxData(
        'mint',
        ['address', 'bytes', 'uint256', 'bytes'],
        [supplierAcc, '0x0', 1, '0x0']
      )}`;
      nonSupplierMint = `0x${lightwallet.txutils._encodeFunctionTxData(
        'mint',
        ['address', 'bytes', 'uint256', 'bytes'],
        [accounts[1], '0x0', 1, '0x0']
      )}`;
      // temporaily using a toggle to allow contract calls from addresses not proxyed through participant identy contract
      await crc.toggleParticipantCalling(true, { from: admin });
    });
    describe('toggleSupplier', () => {
      const toggles = [false, true];
      toggles.forEach(toggle => {
        it('should enable supplier account', async () => {
          await supplier.toggleSupplier(supplierAcc, toggle, {
            from: supplierAcc,
          });
          assert.equal(
            await supplier.suppliers.call([supplierAcc], { from: supplierAcc }),
            toggle,
            'did not toggle account permission'
          );
        });
      });
    });

    describe('forward', () => {
      it('should mint 1 CRC using supplier forwarding proxy', async () => {
        await supplier.toggleInterface('IMintableCommodity', crcAddress, true, {
          from: supplierAcc,
        });

        await supplier.toggleSupplier(supplierAcc, true, {
          from: supplierAcc,
        });
        await supplier.forward(crcAddress, 0, mint, 'IMintableCommodity', {
          from: supplierAcc,
        });
        supplierCrcBal = await crc.balanceOf(supplierAcc);
        await assert.equal(supplierCrcBal.toNumber(), 1, 'crc mint fail');
      });
      it('should fail minting 1 CRC using a non supplier account via forwarding proxy', async () => {
        await supplier.toggleInterface('IMintableCommodity', crcAddress, true, {
          from: supplierAcc,
        });
        await supplier.toggleSupplier(accounts[1], false, {
          from: supplierAcc,
        });

        await expectThrow(
          supplier.forward(
            crcAddress,
            0,
            nonSupplierMint,
            'IMintableCommodity',
            {
              from: accounts[1],
            }
          )
        );
        const nonSupplierCrcBal = await crc.balanceOf(accounts[1]);
        await assert.equal(nonSupplierCrcBal.toNumber(), 0, 'crc mint fail');
      });
    });

    describe('toggleParticipantType', () => {
      const toggles = [false, true];
      toggles.forEach(toggle => {
        it('should disable the supplier participant type and fail when minting', async () => {
          await supplier.toggleParticipantType(toggle, {
            from: supplierAcc,
          });
          toggle === false
            ? await expectThrow(
                supplier.forward(crcAddress, 0, mint, 'IMintableCommodity', {
                  from: supplierAcc,
                })
              )
            : supplier.forward(crcAddress, 0, mint, 'IMintableCommodity', {
                from: supplierAcc,
              });
        });
      });
    });

    describe('isAllowed', () => {
      it('should check a valid and invalid interface and account permission', async () => {
        await supplier.isAllowed(crcAddress, 'IMintableCommodity', {
          from: supplierAcc,
        });
      });
      let toggles = [[true, true, true]];
      toggles.forEach(toggle => {
        it('should set valid permissions and not fail', async () => {
          await supplier.toggleParticipantType(toggle[0], {
            from: supplierAcc,
          });
          await supplier.toggleSupplier(supplierAcc, toggle[1], {
            from: supplierAcc,
          });
          await supplier.toggleInterface(
            'IMintableCommodity',
            crcAddress,
            toggle[2],
            {
              from: supplierAcc,
            }
          );
          await supplier.isAllowed(crcAddress, 'IMintableCommodity', {
            from: supplierAcc,
          });
        });
      });
      toggles = [
        [true, true, false],
        [true, false, false],
        [false, false, false],
        [false, false, true],
        [false, true, true],
      ];
      toggles.forEach(toggle => {
        it('should set invalid permissions and fail', async () => {
          await supplier.toggleParticipantType(toggle[0], {
            from: supplierAcc,
          });
          await supplier.toggleSupplier(supplierAcc, toggle[1], {
            from: supplierAcc,
          });
          await supplier.toggleInterface(
            'IMintableCommodity',
            crcAddress,
            toggle[2],
            {
              from: supplierAcc,
            }
          );
          await expectThrow(
            supplier.isAllowed(crcAddress, 'IMintableCommodity', {
              from: supplierAcc,
            })
          );
        });
      });
    });
  });
};

module.exports = {
  shouldBehaveLikeSupplier,
};
