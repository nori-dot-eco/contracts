import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { NORI } from '../typechain-types/NORI';
import {
  LockedNORI,
  TokenGrantCreatedEvent,
} from '../typechain-types/LockedNORI';
import { BigNumber, BigNumberish } from 'ethers';

const NOW = Math.floor(Date.now() / 1000);

const CLIFF1_AMOUNT = 100;
const CLIFF2_AMOUNT = 100;
const CLIFF1_OFFSET = 5000;
const CLIFF2_OFFSET = 10_000;
const START_OFFSET = 1_000;
const END_OFFSET = 100_000;
const DELTA = 1000; // useful offset to place time before / after the inflection points
const GRANT_AMOUNT = 1000;

// specific to employee scenario
const VEST_END_OFFSET = 80_000;
const VEST_CLIFF1_AMOUNT = 150;
const VEST_CLIFF2_AMOUNT = 150;

const setup = async (): Promise<{
  nori: NORI;
  lnori: LockedNORI;
  owner: string;
  addr1: string;
  addr2: string;
}> => {
  const { getNamedAccounts, upgrades, run, ethers } = hre;
  const [owner, addr1, addr2] = await ethers.getSigners();
  await run('deploy:erc1820');
  const NORIFactory = await ethers.getContractFactory('NORI');

  const LockedNoriFactory = await ethers.getContractFactory('LockedNORI');
  const nori = (await upgrades.deployProxy(NORIFactory, [
    ethers.utils.parseUnits('100', 'ether'),
  ])) as NORI;

  const lnori = (await upgrades.deployProxy(LockedNoriFactory, [nori.address], {
    initializer: 'initialize(address)',
  })) as LockedNORI;
  await lnori.deployed();

  await lnori.grantRole(await lnori.TOKEN_GRANTER_ROLE(), owner.address);
  // is this an operator usecase?
  await nori.approve(lnori.address, 10000);

  //   console.log(`owner: ${await owner.getAddress()}`);
  //   console.log(`addr1: ${await addr1.getAddress()}`);
  //   console.log(`addr2: ${await addr2.getAddress()}`);
  return {
    nori,
    lnori,
    owner: await owner.getAddress(),
    addr1: await addr1.getAddress(),
    addr2: await addr2.getAddress(),
  };
};

const setupWithGrant = async (
  startTime?: number
): Promise<ReturnType<typeof setup>> => {
  const { nori, lnori, owner, addr1, addr2 } = await setup();
  const start = startTime || NOW + START_OFFSET;
  expect(
    lnori.grantTo(
      addr1,
      GRANT_AMOUNT,
      start,
      start + END_OFFSET,
      start + END_OFFSET,
      start + CLIFF1_OFFSET,
      start + CLIFF2_OFFSET,
      CLIFF1_AMOUNT,
      CLIFF2_AMOUNT,
      CLIFF1_AMOUNT,
      CLIFF2_AMOUNT
    )
  ).to.emit(lnori, 'TokenGrantCreated');
  expect(lnori.depositFor(addr1, GRANT_AMOUNT)).to.emit(lnori, 'Minted');
  return { nori, lnori, owner, addr1, addr2 };
};

const setupWithLockupOnlyGrant = async (
  startTime?: number
): Promise<ReturnType<typeof setup>> => {
  const { nori, lnori, owner, addr1, addr2 } = await setup();
  // await nori.increaseAllowance(lnori.address, 10000);
  const start = startTime || NOW + START_OFFSET;
  expect(
    await lnori.grantTo(
      addr1,
      GRANT_AMOUNT,
      start,
      start,
      start + END_OFFSET,
      start + CLIFF1_OFFSET,
      start + CLIFF2_OFFSET,
      0,
      0,
      CLIFF1_AMOUNT,
      CLIFF2_AMOUNT
    )
  ).to.emit(lnori, 'TokenGrantCreated');
  await lnori.depositFor(addr1, GRANT_AMOUNT);
  return { nori, lnori, owner, addr1, addr2 };
};

const setupWithEmployeeStyleGrant = async (
  startTime?: number
): Promise<ReturnType<typeof setup>> => {
  const { nori, lnori, owner, addr1, addr2 } = await setup();
  await nori.approve(lnori.address, 10000);
  const start = startTime || NOW + START_OFFSET;
  expect(
    lnori.grantTo(
      addr1,
      GRANT_AMOUNT,
      start,
      start + VEST_END_OFFSET,
      start + END_OFFSET,
      start + CLIFF1_OFFSET,
      start + CLIFF2_OFFSET,
      VEST_CLIFF1_AMOUNT,
      VEST_CLIFF2_AMOUNT,
      CLIFF1_AMOUNT,
      CLIFF2_AMOUNT
    )
  ).to.emit(lnori, 'TokenGrantCreated');
  await lnori.depositFor(addr1, GRANT_AMOUNT);
  return { nori, lnori, owner, addr1, addr2 };
};

describe('LockedNori', function () {
  it('Should deposit NORI', async function () {
    const { nori, lnori, owner, addr1 } = await setup();

    const ownerBalance = await nori.balanceOf(owner);
    expect(await nori.balanceOf(addr1)).to.equal(0);
    await nori.approve(lnori.address, 10000);

    expect(await lnori.depositFor(addr1, 100))
      .to.emit(lnori, 'Transfer')
      .withArgs(ethers.constants.AddressZero, addr1, 100);
    expect(await nori.balanceOf(owner)).to.equal(ownerBalance.sub(100));
    expect(await lnori.balanceOf(owner)).to.equal(0);
    // With no lockup schedule balanceOf == wrapped quantity
    // and vestedBalanceOf == unlockedBalanceOf == 0
    expect(await lnori.balanceOf(addr1)).to.equal(100);
    expect(await lnori.vestedBalanceOf(addr1)).to.equal(0);
    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(0);

    expect(lnori.withdrawTo(addr1, 100)).to.be.revertedWith(
      'Withdrawl amount unavailable'
    );

    // standard erc20 stuff
    expect(await lnori.totalSupply()).to.equal(100);
  });

  it('Should return zero before startTime', async function () {
    const { lnori, addr1 } = await setupWithGrant();
    const addr1Signer = (await ethers.getSigners())[1];

    expect(await lnori.balanceOf(addr1)).to.equal(1000);
    expect(await lnori.vestedBalanceOf(addr1)).to.equal(0);
    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(0);
    expect((await lnori.getGrant(addr1)).amount).to.equal(1000);

    await expect(
      lnori.connect(addr1Signer).withdrawTo(addr1, 100)
    ).to.be.revertedWith('Withdrawl amount unavailable');
  });

  it('Should fail to transfer locked tokens', async function () {
    const { lnori, addr1, addr2 } = await setupWithGrant();
    const addr1Signer = (await ethers.getSigners())[1];

    expect(await lnori.balanceOf(addr1)).to.equal(1000);
    await expect(
      lnori.connect(addr1Signer).transfer(addr2, 100)
    ).to.be.revertedWith('Withdrawl amount unavailable');
  });

  it('Should fail to send locked tokens', async function () {
    const { lnori, addr1, addr2 } = await setupWithGrant();
    const addr1Signer = (await ethers.getSigners())[1];

    expect(await lnori.balanceOf(addr1)).to.equal(1000);
    await expect(
      lnori.connect(addr1Signer).send(addr2, 100, '')
    ).to.be.revertedWith('Withdrawl amount unavailable');
  });

  it('Should unlock cliff1', async function () {
    // cliff1 < now < cliff2
    const start = NOW - CLIFF1_OFFSET - DELTA;
    const { lnori, addr1 } = await setupWithGrant(start);

    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(CLIFF1_AMOUNT);
    expect(await lnori.vestedBalanceOf(addr1)).to.equal(CLIFF1_AMOUNT);
    expect(await lnori.balanceOf(addr1)).to.equal(GRANT_AMOUNT);
  });

  it('Should unlock cliff2', async function () {
    // cliff2 == now
    const start = NOW - CLIFF2_OFFSET;
    const { lnori, addr1 } = await setupWithGrant(start);

    expect(await lnori.vestedBalanceOf(addr1)).to.equal(
      CLIFF1_AMOUNT + CLIFF2_AMOUNT
    );
    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(
      CLIFF1_AMOUNT + CLIFF2_AMOUNT
    );
    expect(await lnori.balanceOf(addr1)).to.equal(GRANT_AMOUNT);
  });

  it('Should revert if N wrapped tokens < N requested (even if unlocked)', async function () {
    // cliff1 == now
    const start = NOW - CLIFF1_OFFSET;
    const { lnori, addr1 } = await setupWithGrant(start);
    const addr1Signer = (await ethers.getSigners())[1];

    expect(await lnori.balanceOf(addr1)).to.equal(GRANT_AMOUNT);
    expect(await lnori.vestedBalanceOf(addr1)).to.equal(CLIFF1_AMOUNT);
    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(CLIFF1_AMOUNT);

    await expect(
      lnori.connect(addr1Signer).withdrawTo(addr1, 500)
    ).to.be.revertedWith('Withdrawl amount unavailable');
  });

  it('Should unlock smoothly after cliff2', async function () {
    // cliff2 < now < endTime
    const start = NOW - CLIFF2_OFFSET - (END_OFFSET - CLIFF2_OFFSET) / 2;
    const { lnori, addr1 } = await setupWithGrant(start);

    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(
      CLIFF1_AMOUNT +
        CLIFF2_AMOUNT +
        (GRANT_AMOUNT - CLIFF1_AMOUNT - CLIFF2_AMOUNT) / 2
    );
  });

  it('Should unlock the full grant at endtime', async function () {
    // now == endTime
    const start = NOW - END_OFFSET;
    const { lnori, addr1 } = await setupWithGrant(start);
    const addr1Signer = (await ethers.getSigners())[1];

    expect(await lnori.balanceOf(addr1)).to.equal(GRANT_AMOUNT);
    expect(await lnori.vestedBalanceOf(addr1)).to.equal(GRANT_AMOUNT);
    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(GRANT_AMOUNT);

    expect(await lnori.connect(addr1Signer).withdrawTo(addr1, 100))
      .to.emit(lnori, 'TokensClaimed')
      .withArgs(addr1, 100);

    expect(await lnori.balanceOf(addr1)).to.equal(GRANT_AMOUNT - 100);
    expect(await lnori.vestedBalanceOf(addr1)).to.equal(GRANT_AMOUNT - 100);
    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(GRANT_AMOUNT - 100);

    const tx2 = await lnori
      .connect(addr1Signer)
      .withdrawTo(addr1, GRANT_AMOUNT - 100);
    await tx2.wait();

    expect(await lnori.balanceOf(addr1)).to.equal(0);
    expect(await lnori.vestedBalanceOf(addr1)).to.equal(0);
    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(0);
  });

  it('Should treat unlock lagging vest schedules correctly at end of vest', async function () {
    // now == endTime
    const start = NOW - VEST_END_OFFSET;
    const { lnori, addr1 } = await setupWithEmployeeStyleGrant(start);

    expect(await lnori.balanceOf(addr1)).to.equal(GRANT_AMOUNT);
    expect(await lnori.vestedBalanceOf(addr1)).to.equal(GRANT_AMOUNT);
    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(822);
  });

  it('Should treat larger vest cliffs than unlock cliffs correctly', async function () {
    // now == endTime
    const start = NOW - CLIFF1_OFFSET - DELTA;
    const { lnori, addr1 } = await setupWithEmployeeStyleGrant(start);

    expect(await lnori.balanceOf(addr1)).to.equal(GRANT_AMOUNT);
    expect(await lnori.vestedBalanceOf(addr1)).to.equal(VEST_CLIFF1_AMOUNT);
    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(CLIFF1_AMOUNT);
  });

  it('Should revoke unvested tokens', async function () {
    // now == CLIFF2
    const start = NOW - CLIFF2_OFFSET;
    const { lnori, owner, addr1 } = await setupWithEmployeeStyleGrant(start);
    const addr1Signer = (await ethers.getSigners())[1];

    expect(await lnori.balanceOf(addr1)).to.equal(GRANT_AMOUNT);
    const newBalance = VEST_CLIFF1_AMOUNT + VEST_CLIFF2_AMOUNT;
    expect(await lnori.vestedBalanceOf(addr1)).to.equal(newBalance);

    // TODO: Need to figure out how to use operators check for claw-back
    // @jaycen
    await lnori.connect(addr1Signer).increaseAllowance(owner, GRANT_AMOUNT);
    expect(await lnori.revokeUnvestedTokens(NOW, addr1, owner))
      .to.emit(lnori, 'UnvestedTokensRevoked')
      .withArgs(NOW, addr1, GRANT_AMOUNT - newBalance);

    expect(await lnori.vestedBalanceOf(addr1)).to.equal(newBalance);
    expect(await lnori.balanceOf(addr1)).to.equal(newBalance);
    expect(await lnori.unlockedBalanceOf(addr1)).to.equal(
      CLIFF1_AMOUNT + CLIFF2_AMOUNT
    );

    expect(await lnori.balanceOf(owner)).to.equal(GRANT_AMOUNT - newBalance);
  });

  it('Should return details of a grant', async function () {
    const start = NOW;
    const { lnori, addr1 } = await setupWithEmployeeStyleGrant(start);

    expect(await lnori.getGrant(addr1)).to.deep.equal([
      BigNumber.from(GRANT_AMOUNT),
      BigNumber.from(start),
      BigNumber.from(start + VEST_END_OFFSET),
      BigNumber.from(start + END_OFFSET),
      BigNumber.from(start + CLIFF1_OFFSET),
      BigNumber.from(start + CLIFF2_OFFSET),
      BigNumber.from(VEST_CLIFF1_AMOUNT),
      BigNumber.from(VEST_CLIFF2_AMOUNT),
      BigNumber.from(CLIFF1_AMOUNT),
      BigNumber.from(CLIFF2_AMOUNT),
      BigNumber.from(0),
    ]);
  });
});
