import type { BigNumber } from 'ethers';

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
    it('should mint a batch of removals without listing any', async () => {
      const {
        contracts: { Removal, FIFOMarket },
      } = await setupTest();
      const { supplier } = await hardhat.getNamedAccounts();

      const removalBalances = ['100', '200', '300', '400'];
      const expectedMarketSupply = '0';
      const removalVintages = [2018, 2019, 2020, 2021];
      const listNow = false;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [FIFOMarket.address, listNow]
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
      const tokenIds = (batchMintedEvent?.args?.tokenIds as BigNumber[]).map(
        (tokenId) => tokenId.toNumber()
      );

      const balances = await Promise.all(
        tokenIds.map((tokenId) => {
          return Removal.totalSupply(tokenId);
        })
      );
      balances.forEach((balance, tokenId) => {
        expect(balance).to.equal(
          hardhat.ethers.utils.parseUnits(removalBalances[tokenId]).toString()
        );
      });
      // not listed to the FIFOMarket
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
      const listNow = true;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [FIFOMarket.address, listNow]
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
      const tokenIds = (batchMintedEvent?.args?.tokenIds as BigNumber[]).map(
        (tokenId) => tokenId.toNumber()
      );

      const balances = await Promise.all(
        tokenIds.map((tokenId) => {
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
  describe('Listing removals for sale', () => {
    it('should list pre-minted removals for sale in the atomic marketplace', async () => {
      const {
        contracts: { Removal, FIFOMarket },
      } = await setupTest();
      const { supplier } = await hardhat.getNamedAccounts();

      const removalBalances = ['100', '200', '300'];
      const removalVintages = [2018, 2019, 2020];
      const listNow = false;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [FIFOMarket.address, listNow]
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
      const tokenIds = (batchMintedEvent?.args?.tokenIds as BigNumber[]).map(
        (tokenId) => tokenId.toNumber()
      );

      const accounts = await ethers.getSigners();
      await Removal.connect(accounts[2]).safeBatchTransferFrom(
        supplier,
        FIFOMarket.address,
        tokenIds,
        removalBalances.map((balance) =>
          hardhat.ethers.utils.parseUnits(balance)
        ),
        ethers.utils.formatBytes32String('0x0')
      );

      // market contract should have a balance for each listed tokenId
      const balances = await Promise.all(
        tokenIds.map((tokenId) => {
          return Removal.balanceOf(FIFOMarket.address, tokenId);
        })
      );
      balances.forEach((balance, tokenId) => {
        expect(balance).to.equal(
          hardhat.ethers.utils.parseUnits(removalBalances[tokenId]).toString()
        );
      });
    });
  });
});
