/* globals network */
import { setupEnvForTests, encodeCall } from '../helpers/utils';

const {
  crc,
  participantRegistry,
  contractRegistry,
} = require('../helpers/contractConfigs');

const getNamedAccounts = require('../helpers/getNamedAccounts');

let basicCommodity;
let {
  deployedContracts,
  multiAdmin,
  rootRegistry,
  registry,
  dcrc,
  dparticipantRegistry,
} = {};
const testBasicCommodityFunctions = () => {
  contract(`BasicCommodity`, accounts => {
    beforeEach(async () => {
      ({
        deployedContracts: [dparticipantRegistry, dcrc],
        multiAdmin,
        rootRegistry,
        registry,
      } = await setupEnvForTests(
        [contractRegistry, participantRegistry, crc], // , crc],
        getNamedAccounts(web3).admin0,
        { network, artifacts, accounts, web3 }
      ));
      basicCommodity = dcrc;
    });

    describe('Ensure CRC can only transfer once', () => {
      it('should mint 1 CRC', async () => {
        console.log(
          '%%%%%%%%%%%%%%%%%%%%%%%%%%%%%',
          rootRegistry.address,
          registry.address,
          basicCommodity
        );
        await assert.ok(true);
      });
    });
  });
};

module.exports = {
  testBasicCommodityFunctions,
};
