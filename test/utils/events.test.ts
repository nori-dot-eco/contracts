import type { Removal, BridgedPolygonNORI } from '@/types/typechain-types';
import { parseTransactionLogs } from '@/utils/events';
import { marketSwapTransactionReceipt } from '@/test/fixtures/transaction-receipts';
import { abi as removalAbi } from '@/artifacts/Removal.sol/Removal.json';
import { abi as bpNoriAbi } from '@/artifacts/BridgedPolygonNORI.sol/BridgedPolygonNORI.json';
import { expect } from '@/test/helpers';

describe('events', () => {
  it("parses events using the contract instance's ABI", async () => {
    const certificateAddress = '0x96107D037594Cca4E7ce68f87346957BD726b3EE';
    const marketAddress = marketSwapTransactionReceipt.to;
    const removalAddress = marketSwapTransactionReceipt.logs[8].address;
    const [signer] = await hre.getSigners();
    const removal = new hre.ethers.Contract(
      removalAddress,
      removalAbi,
      signer
    ) as Removal;
    const removalLogs = parseTransactionLogs({
      contractInstance: removal,
      txReceipt: marketSwapTransactionReceipt,
      eventNames: ['TransferBatch'],
    });
    if (removalLogs[0].name !== 'TransferBatch') {
      expect.fail('Invalid event name');
    } else {
      expect(removalLogs[0].args.ids.length).to.equal(1);
      expect(removalLogs[0].args.vals.length).to.equal(1);
      expect(removalLogs[0].args.ids[0]).to.eq(
        hre.ethers.BigNumber.from(
          '28323994154569157217720298918077841297662610516141809028926793389283737601' // matches the token ID in marketSwapTransactionReceipt
        )
      );
      expect(removalLogs[0].args.vals[0]).to.eq(
        hre.ethers.BigNumber.from('8695652173913043478')
      );
      expect(removalLogs[0].name).to.equal('TransferBatch');
      expect(removalLogs[0].args.operator).to.equal(marketAddress);
      expect(removalLogs[0].args.from).to.equal(marketAddress);
      expect(removalLogs[0].args.to).to.equal(certificateAddress);
    }
  });
  it('returns an empty array when attempting to parse events using an invalid event name', async () => {
    const removalAddress = marketSwapTransactionReceipt.logs[8].address;
    const [signer] = await hre.getSigners();
    const removal = new hre.ethers.Contract(
      removalAddress,
      removalAbi,
      signer
    ) as Removal;
    const removalLogs = parseTransactionLogs({
      contractInstance: removal,
      txReceipt: marketSwapTransactionReceipt,
      // @ts-expect-error -- this is testing for an invalid event name
      eventNames: ['InvalidEventName'],
    });
    expect(removalLogs).to.have.lengthOf(0);
  });
  it('returns an all events array when attempting to parse events using no filter', async () => {
    const bpNoriAddress = marketSwapTransactionReceipt.logs[0].address;
    const [signer] = await hre.getSigners();
    const bpNori = new hre.ethers.Contract(
      bpNoriAddress,
      bpNoriAbi,
      signer
    ) as BridgedPolygonNORI;
    const bpNoriLogs = parseTransactionLogs({
      contractInstance: bpNori,
      txReceipt: marketSwapTransactionReceipt,
    });
    expect(bpNoriLogs).to.have.lengthOf(7);
  });
});
