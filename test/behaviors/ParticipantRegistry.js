/* globals artifacts */
import { UnstructuredOwnedUpgradeabilityProxy } from '../helpers/Artifacts';
import {
  deployUpgradeableContract,
  getLatestVersionFromFs,
} from '../helpers/contracts';

const Web3 = require('web3');

const deployUpgradeableParticipantRegistry = async (
  admin,
  contractRegistry
) => {
  const proxy = await UnstructuredOwnedUpgradeabilityProxy.new(
    contractRegistry.address
  );
  const initParams = [
    ['address', 'address'],
    [contractRegistry.address, admin],
  ];
  const [, participantRegistry] = await deployUpgradeableContract(
    artifacts,
    proxy,
    await artifacts.require(
      `./ParticipantRegistryV${await getLatestVersionFromFs(
        'ParticipantRegistry'
      )}`
    ),
    contractRegistry,
    initParams
  );
  return [proxy, participantRegistry];
};

const shouldBehaveLikeParticipantRegistry = admin => {
  contract('ParticipantRegistry', () => {
    let participantRegistry;
    let supplier;
    let web3;
    before(async () => {
      const contractRegistry = await artifacts
        .require(
          `./ContractRegistryV${await getLatestVersionFromFs(
            'ContractRegistry'
          )}`
        )
        .new();
      [, participantRegistry] = await deployUpgradeableParticipantRegistry(
        admin,
        contractRegistry
      );
      [, supplier] = await deployUpgradeableContract(
        artifacts,
        null,
        await artifacts.require(
          `./SupplierV${await getLatestVersionFromFs('Supplier')}`
        ),
        contractRegistry,
        [
          ['address', 'address', 'address'],
          [contractRegistry.address, participantRegistry.address, admin],
        ],
        { from: admin }
      );

      web3 = await new Web3();
    });
    describe('toggleParticipantType', () => {
      const toggles = [true, false];
      toggles.forEach(toggle => {
        it('should toggle participantType permissions', async () => {
          await participantRegistry.toggleParticipantType(
            'Supplier',
            supplier.address,
            toggle,
            {
              from: admin,
            }
          );
          assert.equal(
            await participantRegistry.participantTypes.call(
              web3.sha3('Supplier'),
              supplier.address,
              {
                from: admin,
              }
            ),
            toggle,
            'did not toggle participant type'
          );
        });
      });
    });
  });
};

module.exports = {
  shouldBehaveLikeParticipantRegistry,
  deployUpgradeableParticipantRegistry,
};
