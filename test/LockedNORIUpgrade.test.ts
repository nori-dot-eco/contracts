import { upgrades } from 'hardhat';

import { expect, setupTest } from '@/test/helpers';
import type { LockedNORIV2 } from '@/typechain-types';
import type { LockedNORI } from '@/typechain-types/legacy-artifacts/contracts/LockedNORI';
// import LockedNORIArtifact from '@/legacy-artifacts/LockedNORI.sol/LockedNORI.json';

describe('LockedNORI V1 to V2 upgrade', () => {
  it('works before and after upgrading', async () => {
    const { bpNori, hre } = await setupTest();

    const recipient = hre.namedAccounts.investor1;
    const GRANT_AMOUNT = ethers.utils.parseEther('100');

    const helperFactory = await hre.ethers.getContractFactory(
      'LockedNORIV2Helper'
    );
    const helper = await helperFactory.deploy();
    await helper.deployed();

    const TestToken777Factory = await hre.ethers.getContractFactory(
      'TestToken777'
    );
    const testTokenInstance = await TestToken777Factory.deploy();
    await testTokenInstance.deployed();

    const LockedNORIFactory = await hre.ethers.getContractFactory('LockedNORI');
    const lNori = (await upgrades.deployProxy(
      LockedNORIFactory as any,
      [testTokenInstance.address],
      { initializer: 'initialize(address)' }
    )) as any as LockedNORI;
    await lNori.grantRole(await lNori.TOKEN_GRANTER_ROLE(), helper.address);

    // Create state is LockedNORI v1

    await helper.createSimplePastGrant(
      lNori.address,
      ethers.utils.parseEther('100'),
      recipient
    );
    const createdGrantDetail = await helper.get(lNori.address, recipient);
    await helper.assertSimplePastGrant(lNori.address, createdGrantDetail);
    expect(await lNori.balanceOf(recipient)).to.eq(0);
    await expect(
      testTokenInstance.send(
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

    const LockedNORIV2Factory = await ethers.getContractFactory('LockedNORIV2');
    const lNoriV2 = (await upgrades.upgradeProxy(
      lNori.address,
      LockedNORIV2Factory as any,
      { unsafeAllow: ['constructor'] }
    )) as any as LockedNORIV2;
    await lNoriV2.updateUnderlying(bpNori.address);
    expect(await lNoriV2.balanceOf(recipient)).to.eq(GRANT_AMOUNT);
    await bpNori.transfer(lNoriV2.address, hre.ethers.utils.parseEther('1000'));

    // And assert that state is still intact

    await helper.assertSimplePastGrant(lNori.address, createdGrantDetail);
    await lNoriV2
      .connect(hre.namedSigners.investor1)
      .withdrawTo(recipient, GRANT_AMOUNT);
    expect(await bpNori.balanceOf(recipient)).to.eq(GRANT_AMOUNT);
    expect(await lNoriV2.balanceOf(recipient)).to.eq(0);
  });
});
