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
    it.only('should mint a batch of removals without listing any', async () => {
      const {
        contracts: { Removal, FIFOMarket },
      } = await setupTest();
      const { supplier } = await hardhat.getNamedAccounts();

      const removalBalances = ['100', '200', '300', '400'];
      const expectedMarketSupply = '0';
      const removalVintages = [2018, 2019, 2020, 2021];
      const parcelIdentifier = hardhat.ethers.utils.formatBytes32String(
        'someParcelIdentifier'
      );
      const listNow = false;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes32', 'bool'],
        [FIFOMarket.address, parcelIdentifier, listNow]
      );

      const transactionResponse = await Removal.mintBatch(
        supplier,
        removalBalances.map((balance) =>
          hardhat.ethers.utils.parseUnits(balance)
        ),
        removalVintages,
        packedData
      );

      const transactionReceipt = await transactionResponse.wait();
      const batchMintedEvent = transactionReceipt?.events?.filter((event) => {
        return event.event === 'BatchMinted';
      })[0];
      console.log(batchMintedEvent);
      console.log(batchMintedEvent?.args?.tokenIds.toString());

      // console.log(transactionReceipt?.events?.[0]);
      // console.log(transactionReceipt?.events?.[1]);
      // console.log(transactionReceipt?.events?.[1].args?.tokenIds.toString());

      const balances = await Promise.all(
        [0, 1, 2, 3].map((tokenId) => {
          return Removal.totalSupply(tokenId);
        })
      );
      balances.forEach((balance, tokenId) => {
        expect(balance).to.equal(
          hardhat.ethers.utils.parseUnits(removalBalances[tokenId]).toString()
        );
      });
      // but not listed to the FIFOMarket
      const marketTotalSupply = await FIFOMarket.numberOfNrtsInQueue();
      expect(marketTotalSupply).to.equal(
        hardhat.ethers.utils.parseUnits(expectedMarketSupply).toString()
      );
    });
    it('should mint and list a batch of removals in the same transaction', async () => {
      const {
        contracts: { Removal, FIFOMarket },
      } = await setupTest();
      const { supplier } = await hardhat.getNamedAccounts();

      const removalBalances = ['100', '200', '300', '400'];
      const expectedMarketSupply = '1000';
      const removalVintages = [2018, 2019, 2020, 2021];
      const parcelIdentifier = hardhat.ethers.utils.formatBytes32String(
        'someParcelIdentifier'
      );
      const listNow = true;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes32', 'bool'],
        [FIFOMarket.address, parcelIdentifier, listNow]
      );
      await Removal.mintBatch(
        supplier,
        removalBalances.map((balance) =>
          hardhat.ethers.utils.parseUnits(balance)
        ),
        removalVintages,
        packedData
      );

      const balances = await Promise.all(
        [0, 1, 2, 3].map((tokenId) => {
          return Removal.totalSupply(tokenId);
        })
      );
      balances.forEach((balance, tokenId) => {
        expect(balance).to.equal(
          hardhat.ethers.utils.parseUnits(removalBalances[tokenId]).toString()
        );
      });
      const marketTotalSupply = await FIFOMarket.numberOfNrtsInQueue();
      expect(marketTotalSupply).to.equal(
        hardhat.ethers.utils.parseUnits(expectedMarketSupply).toString()
      );
    });
  });
  describe('Getting the tokenIds for a group of removals', () => {
    it('should get the correct tokenIds given a unique parcel identifier and the removal vintage', async () => {
      const {
        contracts: { Removal, FIFOMarket },
      } = await setupTest();
      const { supplier } = await hardhat.getNamedAccounts();

      const removalBalances = ['100', '200', '300', '400'];
      const removalVintages = [2018, 2019, 2020, 2021];
      const targetTokenIdIndices = [1, 3];
      const parcelIdentifier = hardhat.ethers.utils.formatBytes32String(
        'someParcelIdentifier'
      );
      const listNow = false;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes32', 'bool'],
        [FIFOMarket.address, parcelIdentifier, listNow]
      );
      await Removal.mintBatch(
        supplier,
        removalBalances.map((balance) =>
          hardhat.ethers.utils.parseUnits(balance)
        ),
        removalVintages,
        packedData
      );

      const parcelIdentifiers = targetTokenIdIndices.map(
        (_) => parcelIdentifier
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
    it('should list pre-minted removals for sale in the atomic marketplace', async () => {
      const {
        contracts: { Removal, FIFOMarket },
      } = await setupTest();
      const { supplier } = await hardhat.getNamedAccounts();

      const tokenIdsToList = [0, 1, 2];
      const removalBalances = ['100', '200', '300'];
      const removalVintages = [2018, 2019, 2020];
      const parcelIdentifier = hardhat.ethers.utils.formatBytes32String(
        'someParcelIdentifier'
      );
      const listNow = false;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes32', 'bool'],
        [FIFOMarket.address, parcelIdentifier, listNow]
      );
      await Removal.mintBatch(
        supplier,
        removalBalances.map((balance) =>
          hardhat.ethers.utils.parseUnits(balance)
        ),
        removalVintages,
        packedData
      );

      const accounts = await ethers.getSigners();
      await Removal.connect(accounts[2]).safeBatchTransferFrom(
        supplier,
        FIFOMarket.address,
        tokenIdsToList,
        removalBalances.map((balance) =>
          hardhat.ethers.utils.parseUnits(balance)
        ),
        ethers.utils.formatBytes32String('0x0')
      );

      // market contract should have a balance for each listed tokenId
      const balances = await Promise.all(
        tokenIdsToList.map((tokenId) => {
          return Removal.balanceOf(FIFOMarket.address, tokenId);
        })
      );
      balances.forEach((balance, tokenId) => {
        expect(balance).to.equal(
          hardhat.ethers.utils.parseUnits(removalBalances[tokenId]).toString()
        );
      });
    });
    it('should list a specific subset of pre-minted removals using their identifiers', async () => {
      const {
        contracts: { Removal, FIFOMarket },
      } = await setupTest();
      const { supplier } = await hardhat.getNamedAccounts();

      // mint 4 different token ids
      const removalBalances = ['100', '200', '300', '400'];
      const removalVintages = [2018, 2019, 2020, 2021];
      // list for sale token ids 1 and 3
      const targetTokenIdIndices = [1, 3];
      const parcelIdentifier = hardhat.ethers.utils.formatBytes32String(
        'someParcelIdentifier'
      );
      const listNow = false;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes32', 'bool'],
        [FIFOMarket.address, parcelIdentifier, listNow]
      );
      await Removal.mintBatch(
        supplier,
        removalBalances.map((balance) =>
          hardhat.ethers.utils.parseUnits(balance)
        ),
        removalVintages,
        packedData
      );

      const parcelIdentifiers = targetTokenIdIndices.map(
        (_) => parcelIdentifier
      );
      const vintagesToList: number[] = removalVintages.filter((vintage) =>
        targetTokenIdIndices.includes(removalVintages.indexOf(vintage))
      );
      // get token ids given the identifying information for the removals to list
      const tokenIdsToList: number[] = (
        await Removal.tokenIdsForRemovals(parcelIdentifiers, vintagesToList)
      ).map((id) => id.toNumber());
      const amountsToList: string[] = removalBalances.filter((balance) =>
        targetTokenIdIndices.includes(removalBalances.indexOf(balance))
      );

      // list these specific token ids
      const accounts = await ethers.getSigners();
      await Removal.connect(accounts[2]).safeBatchTransferFrom(
        supplier,
        FIFOMarket.address,
        tokenIdsToList,
        amountsToList,
        ethers.utils.formatBytes32String('0x0')
      );

      // check that the market has a balance for the listed token ids
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

      // and no balance for the other two
      expect(await Removal.balanceOf(FIFOMarket.address, 0)).to.equal('0');
      expect(await Removal.balanceOf(FIFOMarket.address, 2)).to.equal('0');
    });
  });
});
