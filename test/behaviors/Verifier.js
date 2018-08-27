import expectThrow from '../helpers/expectThrow';
import {
  deployUpgradeableContract,
  getLatestVersionFromFs,
} from '../helpers/contracts';
import { deployUpgradeableCrc } from './Crc';

const lightwallet = require('eth-signer');

const shouldBehaveLikeVerifier = admin => {
  contract('Verifier', accounts => {
    let crc;
    let verifier;
    let verifierAcc;
    let verify;
    let nonVerifierVerify;
    let crcVerificatonCat;
    let crcAddress;
    let mint;
    let participantRegistry;

    before(async () => {
      const contractRegistry = await artifacts
        .require(
          `./ContractRegistryV${await getLatestVersionFromFs(
            'ContractRegistry'
          )}`
        )
        .new();
      [participantRegistry, , crc] = await deployUpgradeableCrc(
        admin,
        contractRegistry
      );

      const initParams = [
        ['address', 'address', 'address'],
        [contractRegistry.address, participantRegistry.address, admin],
      ];
      [, verifier] = await deployUpgradeableContract(
        artifacts,
        null,
        await artifacts.require(
          `./VerifierV${await getLatestVersionFromFs('Verifier')}`
        ),
        contractRegistry,
        initParams
      );

      crcAddress = await crc.address;
      verifierAcc = accounts[2];
      mint = `0x${lightwallet.txutils._encodeFunctionTxData(
        'mint',
        ['address', 'bytes', 'uint256', 'bytes'],
        [accounts[0], '0x0', 1, '0x0']
      )}`;
      verify = `0x${lightwallet.txutils._encodeFunctionTxData(
        'verify',
        ['uint256', 'bytes', 'uint64'],
        [0, '0x0', 5]
      )}`;
      nonVerifierVerify = `0x${lightwallet.txutils._encodeFunctionTxData(
        'verify',
        ['uint256', 'bytes', 'uint64'],
        [1, '0x0', 5]
      )}`;
      // todojaycen use supplier.forward to mint temporaily using a toggle to allow contract calls from addresses not proxyed through participant identy contract
      await crc.toggleParticipantCalling(false, { from: admin });
      await crc.mint(accounts[0], '0x0', 1, '0x0');
      await crc.mint(accounts[0], '0x0', 1, '0x0');
      // disallow non partipant/verifier calls
      await crc.toggleParticipantCalling(true, { from: admin });
    });
    describe('toggleVerifier', () => {
      const toggles = [false, true];
      toggles.forEach(toggle => {
        it('should enable verifier account', async () => {
          await verifier.toggleVerifier(verifierAcc, toggle, {
            from: admin,
          });
          assert.equal(
            await verifier.verifiers.call([verifierAcc]),
            toggle,
            'did not toggle account permission'
          );
        });
      });
    });

    describe('forward', () => {
      it('should verify 1 CRC using verifier forwarding proxy', async () => {
        await verifier.toggleInterface(
          'IVerifiableCommodity',
          crcAddress,
          true,
          {
            from: admin,
          }
        );

        await verifier.toggleVerifier(verifierAcc, true, {
          from: admin,
        });
        await verifier.forward(crcAddress, 0, verify, 'IVerifiableCommodity', {
          from: verifierAcc,
        });
        crcVerificatonCat = await crc.getCommodityCategoryByIndex(0);
        await assert.equal(crcVerificatonCat.toNumber(), 5, 'crc verify fail');
      });
      it('should fail verifying 1 CRC using a non verifier account via forwarding proxy', async () => {
        await verifier.toggleInterface(
          'IVerifiableCommodity',
          crcAddress,
          true,
          {
            from: admin,
          }
        );
        await verifier.toggleVerifier(accounts[1], false, {
          from: admin,
        });

        await expectThrow(
          verifier.forward(
            crcAddress,
            0,
            nonVerifierVerify,
            'IVerifiableCommodity',
            {
              from: accounts[1],
            }
          )
        );
        crcVerificatonCat = await crc.getCommodityCategoryByIndex(1);
        await assert.equal(
          crcVerificatonCat.toNumber(),
          1,
          'crc verify shouldnt have been succesful'
        );
      });
    });

    describe('toggleParticipantType', () => {
      const toggles = [false, true];
      toggles.forEach(toggle => {
        it('should disable the verifier participant type and fail when verifying', async () => {
          await verifier.toggleParticipantType(toggle, {
            from: admin,
          });
          !toggle
            ? await expectThrow(
                verifier.forward(
                  crcAddress,
                  0,
                  verify,
                  'IVerifiableCommodity',
                  {
                    from: verifierAcc,
                  }
                )
              )
            : verifier.forward(crcAddress, 0, verify, 'IVerifiableCommodity', {
                from: verifierAcc,
              });
        });
      });
    });

    describe('isAllowed', () => {
      it('should check a valid and invalid interface and account permission', async () => {
        await verifier.isAllowed(crcAddress, 'IVerifiableCommodity', {
          from: verifierAcc,
        });
      });
      let toggles = [[true, true, true]];
      toggles.forEach(toggle => {
        it('should set all requisite permissions to true', async () => {
          await verifier.toggleParticipantType(toggle[0], {
            from: admin,
          });
          await verifier.toggleVerifier(verifierAcc, toggle[1], {
            from: admin,
          });
          await verifier.toggleInterface(
            'IVerifiableCommodity',
            crcAddress,
            toggle[2],
            {
              from: admin,
            }
          );
          await verifier.isAllowed(crcAddress, 'IVerifiableCommodity', {
            from: verifierAcc,
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
        it('should set all requisite permissions to false', async () => {
          await verifier.toggleParticipantType(toggle[0], {
            from: admin,
          });
          await verifier.toggleVerifier(verifierAcc, toggle[1], {
            from: admin,
          });
          await verifier.toggleInterface(
            'IVerifiableCommodity',
            crcAddress,
            toggle[2],
            {
              from: admin,
            }
          );
          await expectThrow(
            verifier.isAllowed(crcAddress, 'IVerifiableCommodity', {
              from: verifierAcc,
            })
          );
        });
      });
    });
  });
};

module.exports = { shouldBehaveLikeVerifier };
