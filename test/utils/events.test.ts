import type { Removal } from '@/types/typechain-types';
import { parseTransactionLogs } from '@/utils/events';
import { marketSwapTransactionReceipt } from '@/test/fixtures/transaction-receipts';
import { abi as removalAbi } from '@/artifacts/Removal.sol/Removal.json';
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
    });
    if (removalLogs[0].name !== 'TransferBatch') {
      expect.fail('Invalid event name');
    } else {
      expect(removalLogs[0].args.ids.length).to.equal(1);
      expect(removalLogs[0].args.vals.length).to.equal(1);
      expect(removalLogs[0].args.ids[0]).to.eq(
        hre.ethers.BigNumber.from(
          '28323994154581855794530986173263081099665759625301584093990944131103326209'
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
});
