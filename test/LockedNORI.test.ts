import type { NORI } from '../typechain-types/NORI';
import type { LockedNORI } from '../typechain-types/LockedNORI';
import type { LockedNORI__factory, NORI__factory } from '../typechain-types';

import { expect, hardhat } from '@/test/helpers';

const NOW = Math.floor(Date.now() / 1_000);
// todo expect(await -> await expect(
// todo trace events and expect them all
const CLIFF1_AMOUNT = hardhat.ethers.utils.parseUnits((100).toString());
const CLIFF2_AMOUNT = hardhat.ethers.utils.parseUnits((100).toString());
const CLIFF1_OFFSET = 5_000;
const CLIFF2_OFFSET = 10_000;
const START_OFFSET = 1_000;
const END_OFFSET = 100_000;
const DELTA = 1_000; // useful offset to place time before / after the inflection points
const GRANT_AMOUNT = hardhat.ethers.utils.parseUnits((1_000).toString());
const INITIAL_SUPPLY = hardhat.ethers.utils.parseUnits(
  (500_000_000).toString()
);

// specific to employee scenario
const VEST_END_OFFSET = 80_000;
const VEST_CLIFF1_AMOUNT = hardhat.ethers.utils.parseUnits((150).toString()); // todo use named account "employee"
const VEST_CLIFF2_AMOUNT = hardhat.ethers.utils.parseUnits((150).toString());

const setup = hardhat.deployments.createFixture(
  async (
    hre
  ): Promise<{
    nori: NORI;
    lNori: LockedNORI;
    hre: CustomHardHatRuntimeEnvironment;
  }> => {
    const { upgrades, run, ethers, getNamedAccounts } = hre;
    const { admin } = await getNamedAccounts();
    await run('deploy:erc1820');
    const NORIFactory = await ethers.getContractFactory<NORI__factory>('NORI');
    const LockedNoriFactory =
      await ethers.getContractFactory<LockedNORI__factory>('LockedNORI');
    const nori = await upgrades.deployProxy<NORI>(NORIFactory, []);
    await nori.deployed();
    const lNori = await upgrades.deployProxy<LockedNORI>(
      LockedNoriFactory,
      [nori.address],
      {
        initializer: 'initialize(address)',
      }
    );
    await lNori.deployed();
    await lNori.grantRole(await lNori.TOKEN_GRANTER_ROLE(), admin);
    return {
      nori,
      lNori,
      hre,
    };
  }
);

const setupWithGrant = hardhat.deployments.createFixture(
  async (hre, options?: { startTime: number }): ReturnType<typeof setup> => {
    const { nori, lNori } = await setup();
    const { investor1 } = await hre.getNamedAccounts();
    const start = options?.startTime || NOW + START_OFFSET;
    console.log({ start, options });
    const userData = hre.ethers.utils.defaultAbiCoder.encode(
      [
        'address',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
      ],
      [
        investor1,
        start,
        start + END_OFFSET,
        start + END_OFFSET,
        start + CLIFF1_OFFSET,
        start + CLIFF2_OFFSET,
        CLIFF1_AMOUNT,
        CLIFF2_AMOUNT,
        CLIFF1_AMOUNT,
        CLIFF2_AMOUNT,
      ]
    );
    // eslint-disable-next-line jest/no-standalone-expect
    expect(await nori.send(lNori.address, GRANT_AMOUNT, userData))
      .to.emit(
        lNori,
        'TokenGrantCreated' // todo withArgs
      )
      .to.emit(lNori, 'Minted');
    return { nori, lNori, hre };
  }
);

const setupWithEmployeeStyleGrant = hardhat.deployments.createFixture(
  async (
    hre,
    options?: { startTime: number }
  ): Promise<ReturnType<typeof setup>> => {
    const { nori, lNori } = await setup();
    const { investor1 } = await hre.getNamedAccounts();
    const start = options?.startTime || NOW + START_OFFSET;
    const userData = hre.ethers.utils.defaultAbiCoder.encode(
      [
        'address',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
      ],
      [
        investor1,
        start,
        start + VEST_END_OFFSET,
        start + END_OFFSET,
        start + CLIFF1_OFFSET,
        start + CLIFF2_OFFSET,
        VEST_CLIFF1_AMOUNT,
        VEST_CLIFF2_AMOUNT,
        CLIFF1_AMOUNT,
        CLIFF2_AMOUNT,
      ]
    );
    // investor1,
    //     GRANT_AMOUNT,
    //     start,
    //     start + VEST_END_OFFSET,
    //     start + END_OFFSET,
    //     start + CLIFF1_OFFSET,
    //     start + CLIFF2_OFFSET,
    //     VEST_CLIFF1_AMOUNT,
    //     VEST_CLIFF2_AMOUNT,
    //     CLIFF1_AMOUNT,
    //     CLIFF2_AMOUNT
    // eslint-disable-next-line jest/no-standalone-expect
    expect(await nori.send(lNori.address, GRANT_AMOUNT, userData)).to.emit(
      lNori,
      'TokenGrantCreated'
    );
    return { nori, lNori, hre };
  }
);

describe('LockedNori', () => {
  // todo
  // it.todo('test that the admin cannot revoke vested tokens')
  // todo should revoking redeem the NORI too?
  // it.only('Should deposit NORI', async () => {
  //   const { nori, lNori, hre } = await setup();
  //   const { admin, investor1 } = await hre.getNamedAccounts();
  //   const adminBalance = await nori.balanceOf(admin);
  //   expect(await nori.balanceOf(investor1)).to.equal(0);
  //   const depositAmount = hre.ethers.utils.parseUnits((10_000).toString());
  //   const userData = hre.ethers.utils.defaultAbiCoder.encode(
  //     [
  //       'address',
  //       'uint256',
  //       'uint256',
  //       'uint256',
  //       'uint256',
  //       'uint256',
  //       'uint256',
  //       'uint256',
  //       'uint256',
  //       'uint256',
  //     ],
  //     [investor1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  //   );
  //   expect(await nori.send(lNori.address, depositAmount, userData))
  //     .to.emit(nori, 'Sent')
  //     .withArgs(admin, admin, lNori.address, depositAmount, userData, '0x')
  //     .to.emit(lNori, 'Transfer')
  //     .withArgs(hre.ethers.constants.AddressZero, investor1, depositAmount);
  //   expect(await nori.balanceOf(admin)).to.equal(
  //     adminBalance.sub(depositAmount)
  //   );
  //   expect(await lNori.balanceOf(admin)).to.equal(0);
  //   // With no lockup schedule balanceOf == wrapped quantity
  //   // and vestedBalanceOf == unlockedBalanceOf == 0
  //   expect(await lNori.balanceOf(investor1)).to.equal(depositAmount);
  //   expect(await lNori.vestedBalanceOf(investor1)).to.equal(0);
  //   expect(await lNori.unlockedBalanceOf(investor1)).to.equal(0);
  //   await expect(lNori.withdrawTo(investor1, depositAmount)).to.be.revertedWith(
  //     'Withdrawl amount unavailable'
  //   );
  //   expect(await lNori.totalSupply()).to.equal(depositAmount);
  //   expect(await nori.totalSupply()).to.equal(INITIAL_SUPPLY);
  // });

  it('Should return zero before startTime', async () => {
    const { lNori, nori, hre } = await setupWithGrant();
    const { investor1 } = await hre.getNamedAccounts();
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT); // todo use as options for setupWithGrant instead of constant
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(0);
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(0);
    expect((await lNori.getGrant(investor1)).amount).to.equal(GRANT_AMOUNT);
    expect(await nori.totalSupply()).to.equal(INITIAL_SUPPLY);
    await expect(
      lNori
        .connect(await hre.ethers.getSigner(investor1))
        .withdrawTo(investor1, 1)
    ).to.be.revertedWith('LockedNORI: Withdrawl amount unavailable');
  });

  it('Should fail to transfer locked tokens', async () => {
    const { lNori, nori, hre } = await setupWithGrant();
    const { investor1, investor2 } = await hre.getNamedAccounts();
    const addr1Signer = await hre.ethers.getSigner(investor1); // todo name
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    await expect(
      lNori.connect(addr1Signer).transfer(investor2, 1)
    ).to.be.revertedWith('LockedNORI: Withdrawl amount unavailable');
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT);
    expect(await nori.balanceOf(investor1)).to.equal(0);
  });

  it('Should fail to send locked tokens', async () => {
    const { lNori, nori, hre } = await setupWithGrant();
    const { investor1, investor2 } = await hre.getNamedAccounts();
    const addr1Signer = await hre.ethers.getSigner(investor1);
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    await expect(
      lNori.connect(addr1Signer).send(investor2, 1, '0x')
    ).to.be.revertedWith('Withdrawl amount unavailable');
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT);
    expect(await nori.balanceOf(investor1)).to.equal(0);
  });

  it('Should unlock cliff1', async () => {
    // cliff1 < now < cliff2
    const startTime = NOW;
    const { lNori, hre } = await setupWithGrant({ startTime });
    const { investor1 } = await hre.getNamedAccounts();
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + CLIFF1_OFFSET + DELTA,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(CLIFF1_AMOUNT);
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(CLIFF1_AMOUNT);
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
  });

  it('Should unlock cliff2', async () => {
    // cliff2 == now
    const startTime = NOW;
    const { lNori, hre } = await setupWithGrant({ startTime });
    const { investor1 } = await hre.getNamedAccounts();
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + CLIFF2_OFFSET,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(
      CLIFF1_AMOUNT.add(CLIFF2_AMOUNT)
    );
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(
      CLIFF1_AMOUNT.add(CLIFF2_AMOUNT)
    );
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
  });

  it('Should revert if N wrapped tokens < N requested (even if unlocked)', async () => {
    // cliff1 == now
    const startTime = NOW;
    const { lNori, hre } = await setupWithGrant({ startTime });
    const { investor1 } = await hre.getNamedAccounts();
    const addr1Signer = await hre.ethers.getSigner(investor1); // todo
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + CLIFF1_OFFSET,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(CLIFF1_AMOUNT);
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(CLIFF1_AMOUNT);
    await expect(
      lNori
        .connect(addr1Signer)
        .withdrawTo(investor1, hre.ethers.utils.parseUnits((500).toString()))
    ).to.be.revertedWith('Withdrawl amount unavailable');
  });

  it('Should unlock smoothly after cliff2', async () => {
    // cliff2 < now < endTime
    const startTime = NOW;
    const { lNori, hre } = await setupWithGrant({ startTime });
    const { investor1 } = await hre.getNamedAccounts();
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + CLIFF2_OFFSET + (END_OFFSET - CLIFF2_OFFSET) / 2,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(
      CLIFF1_AMOUNT.add(CLIFF2_AMOUNT).add(
        GRANT_AMOUNT.sub(CLIFF1_AMOUNT).sub(CLIFF2_AMOUNT).div(2)
      )
    );
  });

  it('Should unlock the full grant at endtime', async () => {
    // now == endTime
    const startTime = NOW;
    const { lNori, hre } = await setupWithGrant({ startTime });
    const { investor1 } = await hre.getNamedAccounts();
    const addr1Signer = await hre.ethers.getSigner(investor1);
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + END_OFFSET,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(GRANT_AMOUNT);
    const withdrawlAmount = hre.ethers.utils.parseUnits((100).toString());
    expect(
      await lNori.connect(addr1Signer).withdrawTo(investor1, withdrawlAmount)
    )
      .to.emit(lNori, 'TokensClaimed')
      .withArgs(investor1, withdrawlAmount);
    expect(await lNori.balanceOf(investor1)).to.equal(
      GRANT_AMOUNT.sub(withdrawlAmount)
    );
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(
      GRANT_AMOUNT.sub(withdrawlAmount)
    );
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(
      GRANT_AMOUNT.sub(withdrawlAmount)
    );
    const tx2 = await lNori
      .connect(addr1Signer)
      .withdrawTo(investor1, GRANT_AMOUNT.sub(withdrawlAmount));
    await tx2.wait();
    expect(await lNori.balanceOf(investor1)).to.equal(0);
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(0);
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(0);
  });

  it('Should treat unlock lagging vest schedules correctly at end of vest', async () => {
    // now == endTime
    const startTime = NOW;
    const { lNori, hre } = await setupWithEmployeeStyleGrant({ startTime });
    const { investor1 } = await hre.getNamedAccounts();
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + VEST_END_OFFSET,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(
      '822222222222222222222' // todo double check
    );
  });

  it('Should treat larger vest cliffs than unlock cliffs correctly', async () => {
    // now == endTime
    const startTime = NOW - CLIFF1_OFFSET - DELTA;
    const { lNori, hre } = await setupWithEmployeeStyleGrant({ startTime });
    const { investor1 } = await hre.getNamedAccounts();
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(VEST_CLIFF1_AMOUNT);
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(CLIFF1_AMOUNT);
  });

  it('Should revoke unvested tokens', async () => {
    // now == CLIFF2
    const startTime = NOW;
    const { lNori, hre } = await setupWithEmployeeStyleGrant({ startTime });
    const { investor1, admin } = await hre.getNamedAccounts();
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + CLIFF2_OFFSET,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    const newBalance = VEST_CLIFF1_AMOUNT.add(VEST_CLIFF2_AMOUNT);
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(newBalance);
    expect(
      await lNori
        .connect(await hre.ethers.getSigner(admin))
        .revokeUnvestedTokens(NOW + CLIFF2_OFFSET, investor1, admin)
    )
      .to.emit(lNori, 'UnvestedTokensRevoked')
      .withArgs(NOW + CLIFF2_OFFSET, investor1, GRANT_AMOUNT.sub(newBalance));
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(newBalance);
    expect(await lNori.balanceOf(investor1)).to.equal(newBalance);
    // await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
    //   NOW + CLIFF2_OFFSET,
    // ]);
    // await hardhat.network.provider.send('evm_mine');
    console.log({
      unlocked: await (await lNori.unlockedBalanceOf(investor1)).toString(),
      CLIFF1_AMOUNT: CLIFF1_AMOUNT.toString(),
      CLIFF2_AMOUNT: CLIFF2_AMOUNT.toString(),
    });
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(newBalance);
    expect(await lNori.balanceOf(admin)).to.equal(GRANT_AMOUNT.sub(newBalance));
  });

  it('Should return details of a grant', async () => {
    const startTime = NOW;
    const {
      lNori,
      hre,
      hre: {
        ethers: { BigNumber },
      },
    } = await setupWithEmployeeStyleGrant({ startTime });
    const { investor1 } = await hre.getNamedAccounts();
    expect(await lNori.getGrant(investor1)).to.deep.equal([
      BigNumber.from(GRANT_AMOUNT),
      BigNumber.from(startTime),
      BigNumber.from(startTime + VEST_END_OFFSET),
      BigNumber.from(startTime + END_OFFSET),
      BigNumber.from(startTime + CLIFF1_OFFSET),
      BigNumber.from(startTime + CLIFF2_OFFSET),
      BigNumber.from(VEST_CLIFF1_AMOUNT),
      BigNumber.from(VEST_CLIFF2_AMOUNT),
      BigNumber.from(CLIFF1_AMOUNT),
      BigNumber.from(CLIFF2_AMOUNT),
      BigNumber.from(0),
    ]);
  });
});
