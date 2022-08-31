import { upgrades } from 'hardhat';

import { expect, setupTest, advanceTime } from '@/test/helpers';
import type {
  LockedNORI,
  LockedNORIV1,
  MockERC777,
  LockedNORIHelper,
} from '@/typechain-types';

describe('LockedNORI V1 to V2 upgrade', () => {
  it('works before and after upgrading', async () => {
    const { bpNori, hre } = await setupTest();

    const recipient = hre.namedAccounts.investor1;
    const GRANT_AMOUNT = ethers.utils.parseEther('100');

    const helperFactory = await hre.ethers.getContractFactory(
      'LockedNORIHelper'
    );
    const helper = (await helperFactory.deploy()) as LockedNORIHelper;
    await helper.deployed();

    const MockERC777Factory = await hre.ethers.getContractFactory('MockERC777');
    const erc777 = (await upgrades.deployProxy(
      MockERC777Factory as any, // todo
      [],
      {
        initializer: 'initialize()',
      }
    )) as any as MockERC777;

    const LockedNORIFactory = await hre.ethers.getContractFactory('LockedNORIV1');
    const lNori = (await upgrades.deployProxy(
      LockedNORIFactory as any, // todo
      [erc777.address],
      { initializer: 'initialize(address)' }
    )) as any as LockedNORIV1;
    await lNori.grantRole(await lNori.TOKEN_GRANTER_ROLE(), helper.address);

    // Create state in LockedNORI v1
    await helper.createSimpleGrantFromNow(
      lNori.address,
      ethers.utils.parseEther('100'),
      recipient
    );
    const createdGrantDetail: LockedNORI.TokenGrantDetailStruct =
      await helper.get(lNori.address, recipient);
    await helper.assertSimplePastGrant(lNori.address, createdGrantDetail);
    expect(await lNori.balanceOf(recipient)).to.eq(0);
    await expect(
      erc777.send(
        lNori.address,
        GRANT_AMOUNT,
        ethers.utils.defaultAbiCoder.encode(
          ['address', 'uint256'],
          [recipient, 0x0]
        )
      )
    )
      .to.emit(lNori, 'Transfer')
      .withArgs(hre.ethers.constants.AddressZero, recipient, GRANT_AMOUNT);
    expect(await lNori.balanceOf(recipient)).to.eq(GRANT_AMOUNT);

    // Now we upgrade

    const LockedNORIV2Factory = await ethers.getContractFactory('LockedNORI');
    const lNoriV2 = (await upgrades.upgradeProxy(
      lNori.address,
      LockedNORIV2Factory as any,
      { unsafeAllow: ['constructor'] }
    )) as any as LockedNORI;
    await lNoriV2.updateUnderlying(bpNori.address);
    expect(await lNoriV2.balanceOf(recipient)).to.eq(GRANT_AMOUNT);
    await bpNori.transfer(lNoriV2.address, GRANT_AMOUNT);

    // And assert that state is still intact

    await helper.assertSimplePastGrant(lNori.address, createdGrantDetail);

    await advanceTime({
      hre,
      timestamp: hre.ethers.BigNumber.from(
        createdGrantDetail.unlockEndTime
      ).toNumber(),
    });
    await lNoriV2
      .connect(hre.namedSigners.investor1)
      .withdrawTo(recipient, GRANT_AMOUNT);
    expect(await bpNori.balanceOf(recipient)).to.eq(GRANT_AMOUNT);
    expect(await lNoriV2.balanceOf(recipient)).to.eq(0);
  });
});
