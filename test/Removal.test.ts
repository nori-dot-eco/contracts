import type {
  Certificate,
  Certificate__factory,
  FIFOMarket,
  FIFOMarket__factory,
  NORI,
  NORI__factory,
  Removal,
  Removal__factory,
} from '../typechain-types';

import { expect, hardhat } from '@/test/helpers';

const setupTest = hardhat.deployments.createFixture(async (hre) => {
  const { getNamedAccounts, upgrades, run, ethers } = hre;
  await run('deploy:erc1820');
  const { noriWallet } = await getNamedAccounts();
  const NORI = await ethers.getContractFactory<NORI__factory>('NORI');
  const Removal = await ethers.getContractFactory<Removal__factory>('Removal');
  const Certificate = await ethers.getContractFactory<Certificate__factory>(
    'Certificate'
  );
  const FIFOMarket = await ethers.getContractFactory<FIFOMarket__factory>(
    'FIFOMarket'
  );
  const noriInstance = await upgrades.deployProxy<NORI>(NORI, []);
  const removalInstance = await upgrades.deployProxy<Removal>(Removal, [], {
    initializer: 'initialize()',
  });
  const certificateInstance = await upgrades.deployProxy<Certificate>(
    Certificate,
    [],
    {
      initializer: 'initialize()',
    }
  );
  const fifoMarketInstance = await upgrades.deployProxy<FIFOMarket>(
    FIFOMarket,
    [
      removalInstance.address,
      noriInstance.address,
      certificateInstance.address,
      noriWallet,
      15,
    ],
    {
      initializer: 'initialize(address,address,address,address,uint256)',
    }
  );
  return {
    contracts: {
      NORI: noriInstance,
      Removal: removalInstance,
      Certificate: certificateInstance,
      FIFOMarket: fifoMarketInstance,
    },
  };
});

describe('Removal', () => {
  describe('Minting removals', () => {
    it('should mint a batch of removals', async () => {
      const {
        contracts: { NORI, Removal, Certificate, FIFOMarket },
      } = await setupTest();
      const { supplier, buyer, noriWallet } = await hardhat.getNamedAccounts();

      const firstRemovalBalance = '100';

      await Removal.mintBatch(
          supplier,
          [hardhat.ethers.utils.parseUnits(firstRemovalBalance)],
          [2018],
          hardhat.ethers.utils.formatBytes32String('0x0')
        );

      const balance = await Removal.totalSupply(0);

      expect(balance).to.equal(
        hardhat.ethers.utils
          .parseUnits(firstRemovalBalance)
          .toString()
      );
    });
  });
  describe('Getting the tokenId for a unique identifier', () => {
    it('should get the correct tokenId given a unique identifier', async () => {
      const {
        contracts: { NORI, Removal, Certificate, FIFOMarket },
      } = await setupTest();
      const { supplier, buyer, noriWallet } = await hardhat.getNamedAccounts();

      const firstRemovalBalance = '100';
      const uniqueIdSeed = "supplierandparcel";
      await Removal.mintBatch(
          supplier,
          [hardhat.ethers.utils.parseUnits(firstRemovalBalance)],
          [2018],
          hardhat.ethers.utils.formatBytes32String(uniqueIdSeed)
        );

      // TODO: trying to figure out the right way in javascript land to use the data present in `data` and `vintages`
      // to come up with the same sort of unique identifier that the Removal contract itself could compute, to use this as a unique ID by which to get
      // a vintage's token ID.

      // Alternatively, maybe `mintBatch` can be altered to take an additional array alongside amounts and vintages that contains the unique ID that will
      // be used as a mapping key to keep track of tokenIds... It seems this wasn't possible because of the need to conform to interfaces like 1155.

      const tokenIdForUniqueId = await Removal.tokenIdForRemoval(uniqueId);
      console.log("tokenIdForUniqueId: ", tokenIdForUniqueId);
      const balance = await Removal.totalSupply(tokenIdForUniqueId);

      expect(balance).to.equal(
        hardhat.ethers.utils
          .parseUnits(firstRemovalBalance)
          .toString()
      );
    });
  });
});
