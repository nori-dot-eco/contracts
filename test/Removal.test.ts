import type { BigNumber } from 'ethers';

import type { Contracts } from '@/test/helpers';
import { getDeployments, expect, hardhat } from '@/test/helpers';
import { hre } from '@/utils/hre';

const setupTest = hre.deployments.createFixture(
  async (): Promise<Contracts> => {
    await hre.deployments.fixture(); // ensure you start from a fresh deployments
    return getDeployments({ hre });
  }
);

describe('Removal', () => {
  describe('Minting removals', () => {
    it('should mint a batch of removals without listing any', async () => {
      const { fifoMarket, removal } = await setupTest();
      const { supplier } = await hardhat.getNamedAccounts();

      const removalBalances = ['100', '200', '300', '400'];
      const expectedMarketSupply = '0';
      const removalVintages = [2018, 2019, 2020, 2021];
      const listNow = false;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [fifoMarket.address, listNow]
      );

      const transactionResponse = await removal.mintBatch(
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
          return removal.totalSupply(tokenId);
        })
      );
      balances.forEach((balance, tokenId) => {
        expect(balance).to.equal(
          hardhat.ethers.utils.parseUnits(removalBalances[tokenId]).toString()
        );
      });
      // not listed to the fifoMarket
      const marketTotalSupply = await fifoMarket.numberOfNrtsInQueue();
      expect(marketTotalSupply).to.equal(
        hardhat.ethers.utils.parseUnits(expectedMarketSupply).toString()
      );
    });
    it('should mint and list a batch of removals in the same transaction', async () => {
      const { fifoMarket, removal } = await setupTest();

      const { supplier } = await hardhat.getNamedAccounts();

      const removalBalances = ['100', '200', '300', '400'];
      const expectedMarketSupply = '1000';
      const removalVintages = [2018, 2019, 2020, 2021];
      const listNow = true;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [fifoMarket.address, listNow]
      );
      const transactionResponse = await removal.mintBatch(
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
          return removal.totalSupply(tokenId);
        })
      );
      balances.forEach((balance, tokenId) => {
        expect(balance).to.equal(
          hardhat.ethers.utils.parseUnits(removalBalances[tokenId]).toString()
        );
      });
      const marketTotalSupply = await fifoMarket.numberOfNrtsInQueue();
      expect(marketTotalSupply).to.equal(
        hardhat.ethers.utils.parseUnits(expectedMarketSupply).toString()
      );
    });
  });
  describe('Listing removals for sale', () => {
    it('should list pre-minted removals for sale in the atomic marketplace', async () => {
      const { fifoMarket, removal } = await setupTest();

      const { supplier } = await hardhat.getNamedAccounts();

      const removalBalances = ['100', '200', '300'];
      const removalVintages = [2018, 2019, 2020];
      const listNow = false;
      const packedData = hardhat.ethers.utils.defaultAbiCoder.encode(
        ['address', 'bool'],
        [fifoMarket.address, listNow]
      );
      const transactionResponse = await removal.mintBatch(
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
      await expect(removal.connect(accounts[2]).safeBatchTransferFrom(
        supplier,
        fifoMarket.address,
        tokenIds,
        removalBalances.map((balance) =>
          hardhat.ethers.utils.parseUnits(balance)
        ),
        ethers.utils.formatBytes32String('0x0')
      )).to.emit(removal, "BatchListed").withArgs(tokenIds);

      // market contract should have a balance for each listed tokenId
      const balances = await Promise.all(
        tokenIds.map((tokenId) => {
          return removal.balanceOf(fifoMarket.address, tokenId);
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
