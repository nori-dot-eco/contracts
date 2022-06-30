import { ethers, upgrades } from 'hardhat';
import { expect, setupTest } from '@/test/helpers';
import { LockedNORIV2 } from '../typechain-types';
// Not sure if this will exist in a clean build?  Does typechain build from artifacts or source?
import { LockedNORI } from '../typechain-types/contracts/LockedNORI';
import {
  abi,
  bytecode,
} from '../legacy-artifacts/LockedNORI.sol/LockedNORI.json';
import { TestToken777 } from '../typechain-types/contracts/test/TestToken777';

describe('LockedNORI V1 to V2 upgrade', () => {
  it('works before and after upgrading', async function () {
    const { bpNori, hre, ...rest } = await setupTest();

    const recipient = hre.namedAccounts.investor1;
    const GRANT_AMOUNT = ethers.utils.parseEther('100');

    const helperFactory = await ethers.getContractFactory('LockedNORIV2Helper');
    const helper = await helperFactory.deploy();
    await helper.deployed();

    const TestToken777Factory = await ethers.getContractFactory('TestToken777');
    const testTokenInstance = (await upgrades.deployProxy(
      TestToken777Factory,
      [],
      { initializer: 'initialize()' }
    )) as TestToken777;

    const LockedNORIFactory = await ethers.getContractFactory(abi, bytecode);
    const lnori = (await upgrades.deployProxy(
      LockedNORIFactory,
      [testTokenInstance.address],
      { initializer: 'initialize(address)' }
    )) as LockedNORI;
    lnori.grantRole(await lnori.TOKEN_GRANTER_ROLE(), helper.address);

    // Create state is LockedNORI v1

    await helper.createSimplePastGrant(
      lnori.address,
      ethers.utils.parseEther('100'),
      recipient
    );
    const createdGrantDetail = await helper.get(lnori.address, recipient);
    helper.assertSimplePastGrant(lnori.address, createdGrantDetail);
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
      LockedNORIV2Factory
    )) as LockedNORIV2;
    lNoriV2.updateUnderlying(bpNori.address);
    expect(await lNoriV2.balanceOf(recipient)).to.eq(GRANT_AMOUNT);
    await bpNori.transfer(lNoriV2.address, hre.ethers.utils.parseEther('1000'));

    // And assert that state is still intact

    helper.assertSimplePastGrant(lnori.address, createdGrantDetail);
    await lNoriV2
      .connect(hre.namedSigners.investor1)
      .withdrawTo(recipient, GRANT_AMOUNT);
    expect(await bpNori.balanceOf(recipient)).to.eq(GRANT_AMOUNT);
    expect(await lNoriV2.balanceOf(recipient)).to.eq(0);
  });
});