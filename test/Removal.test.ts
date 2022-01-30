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
        contracts: { Removal },
      } = await setupTest();
      const { supplier } = await hardhat.getNamedAccounts();

      const removalBalance = '100';

      await Removal.mintBatch(
        supplier,
        [hardhat.ethers.utils.parseUnits(removalBalance)],
        [2018],
        hardhat.ethers.utils.formatBytes32String('0x0')
      );

      const balance = await Removal.totalSupply(0);

      expect(balance).to.equal(
        hardhat.ethers.utils.parseUnits(removalBalance).toString()
      );
    });
  });
  describe('Getting the tokenIds for a group fo removals', () => {
    it('should get the correct tokenIds given a unique parcel identifier and the removal vintage', async () => {
      const {
        contracts: { Removal },
      } = await setupTest();
      const { supplier } = await hardhat.getNamedAccounts();

      const removalBalances = ['100', '200', '300', '400'];
      const removalVintages = [2018, 2019, 2020, 2021];
      const targetTokenIdIndices = [1, 3];
      const arbitraryCallData = 'someParcelIdentifier';
      await Removal.mintBatch(
        supplier,
        removalBalances.map((balance) =>
          hardhat.ethers.utils.parseUnits(balance)
        ),
        removalVintages,
        hardhat.ethers.utils.formatBytes32String(arbitraryCallData)
      );

      const parcelIdentifiers = targetTokenIdIndices.map((_) =>
        hardhat.ethers.utils.formatBytes32String(arbitraryCallData)
      );
      const vintages: number[] = removalVintages.filter((vintage) =>
        targetTokenIdIndices.includes(removalVintages.indexOf(vintage))
      );
      const tokenIds: number[] = (
        await Removal.tokenIdsForRemovals(parcelIdentifiers, vintages)
      ).map((id) => id.toNumber());

      expect(tokenIds).to.eql(targetTokenIdIndices);

      const firstReturnedTokenId = Number(tokenIds[0].toString());
      const balance = await Removal.totalSupply(firstReturnedTokenId);
      expect(balance).to.equal(
        hardhat.ethers.utils
          .parseUnits(removalBalances[targetTokenIdIndices[0]])
          .toString()
      );
    });
  });
  describe('Listing removals for sale', () => {
    it('should list removals for sale in the atomic marketplace and the FIFOMarket contract should have a balance for those token ids', async () => {
      const {
        contracts: { Removal, FIFOMarket },
      } = await setupTest();
      const { supplier } = await hardhat.getNamedAccounts();

      const removalBalances = ['100', '200', '300', '400'];
      const removalVintages = [2018, 2019, 2020, 2021];
      const targetTokenIdIndices = [1, 3]; // list for sale token ids 1 and 3
      const arbitraryCallData = 'someParcelIdentifier';
      await Removal.mintBatch(
        supplier,
        removalBalances.map((balance) =>
          hardhat.ethers.utils.parseUnits(balance)
        ),
        removalVintages,
        hardhat.ethers.utils.formatBytes32String(arbitraryCallData)
      );

      const parcelIdentifiers = targetTokenIdIndices.map((_) =>
        hardhat.ethers.utils.formatBytes32String(arbitraryCallData)
      );
      const vintagesToList: number[] = removalVintages.filter((vintage) =>
        targetTokenIdIndices.includes(removalVintages.indexOf(vintage))
      );
      const tokenIdsToList: number[] = (
        await Removal.tokenIdsForRemovals(parcelIdentifiers, vintagesToList)
      ).map((id) => id.toNumber());
      const amountsToList: string[] = removalBalances.filter((balance) =>
        targetTokenIdIndices.includes(removalBalances.indexOf(balance))
      );

      const accounts = await ethers.getSigners();
      await Removal.connect(accounts[2]).safeBatchTransferFrom(
        supplier,
        FIFOMarket.address,
        tokenIdsToList,
        amountsToList,
        ethers.utils.formatBytes32String('0x0')
      );

      const firstListedTokenId = targetTokenIdIndices[0];
      const secondListedTokenId = targetTokenIdIndices[1];
      const balance1 = await Removal.balanceOf(
        FIFOMarket.address,
        firstListedTokenId
      );
      const balance2 = await Removal.balanceOf(
        FIFOMarket.address,
        secondListedTokenId
      );

      expect(balance1).to.equal(removalBalances[firstListedTokenId]);
      expect(balance2).to.equal(removalBalances[secondListedTokenId]);
    });
  });
});
