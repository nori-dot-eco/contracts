import { upgrades } from 'hardhat';
import { expect, setupTest } from '@/test/helpers';
import { LockedNORIV2 } from '@/typechain-types';
import { LockedNORI } from '@/typechain-types/legacy-artifacts/contracts/LockedNORI';
// import LockedNORIArtifact from '@/legacy-artifacts/LockedNORI.sol/LockedNORI.json';

describe('LockedNORI V1 to V2 upgrade', () => {
  it('works before and after upgrading', async () => {
    const { bpNori, hre, ...rest } = await setupTest();

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

    const LockedNORIFactory = await hre.ethers.getContractFactory(
      'LockedNORI'
    );
    const lnori = (await upgrades.deployProxy(
      LockedNORIFactory,
      [testTokenInstance.address],
      { initializer: 'initialize(address)' }
    )) as LockedNORI;
    await lnori.grantRole(await lnori.TOKEN_GRANTER_ROLE(), helper.address);

    // Create state is LockedNORI v1

    await helper.createSimplePastGrant(
      lnori.address,
      ethers.utils.parseEther('100'),
      recipient
    );
    const createdGrantDetail = await helper.get(lnori.address, recipient);
    await helper.assertSimplePastGrant(lnori.address, createdGrantDetail);
    expect(await lnori.balanceOf(recipient)).to.eq(0);
    await expect(
      testTokenInstance.send(
        lnori.address,
        GRANT_AMOUNT,
        ethers.utils.defaultAbiCoder.encode(
          ['address', 'uint256'],
          [recipient, 0x0]
        )
      )
    )
      .to.emit(lnori, 'Transfer')
      .withArgs(hre.ethers.constants.AddressZero, recipient, GRANT_AMOUNT);
    expect(await lnori.balanceOf(recipient)).to.eq(GRANT_AMOUNT);

    // Now we upgrade

    const LockedNORIV2Factory = await ethers.getContractFactory('LockedNORIV2');
    const lNoriV2 = (await upgrades.upgradeProxy(
      lnori.address,
      LockedNORIV2Factory,
      { unsafeAllow: ['constructor'] }
    )) as LockedNORIV2;
    lNoriV2.updateUnderlying(bpNori.address);
    expect(await lNoriV2.balanceOf(recipient)).to.eq(GRANT_AMOUNT);
    await bpNori.transfer(lNoriV2.address, hre.ethers.utils.parseEther('1000'));

    // And assert that state is still intact

    await helper.assertSimplePastGrant(lnori.address, createdGrantDetail);
    await lNoriV2
      .connect(hre.namedSigners.investor1)
      .withdrawTo(recipient, GRANT_AMOUNT);
    expect(await bpNori.balanceOf(recipient)).to.eq(GRANT_AMOUNT);
    expect(await lNoriV2.balanceOf(recipient)).to.eq(0);
  });
});
