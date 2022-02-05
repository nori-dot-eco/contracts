import type { NORI } from '../typechain-types/NORI';
import type { LockedNORI } from '../typechain-types/LockedNORI';
import type { LockedNORI__factory, NORI__factory } from '../typechain-types';

import { expect, hardhat } from '@/test/helpers';
import { hre } from '@/utils/hre';
import { formatTokenAmount } from '@/utils/units';

const {
  ethers: { BigNumber },
  namedAccounts,
  namedSigners,
} = hre;

const NOW = Math.floor(Date.now() / 1_000);
// todo expect(await -> await expect(
// todo trace events and expect them all
const CLIFF1_AMOUNT = formatTokenAmount(100);
const CLIFF2_AMOUNT = formatTokenAmount(100);
const CLIFF1_OFFSET = 5_000;
const CLIFF2_OFFSET = 10_000;
const END_OFFSET = 100_000;
const DELTA = 1_000; // useful offset to place time before / after the inflection points
const GRANT_AMOUNT = formatTokenAmount(1_000);
const INITIAL_SUPPLY = formatTokenAmount(500_000_000);

// specific to employee scenario
const VEST_END_OFFSET = 80_000;
const VEST_REVOKED_OFFSET = 55_000; // halfway through the linear distribution of vesting
const VESTED_BALANCE_AFTER_REVOCATION = formatTokenAmount(750);
const FULLY_UNLOCKED_AFTER_REVOCATION_OFFSET = 72_000;
const VEST_CLIFF1_AMOUNT = formatTokenAmount(150); // todo use named account "employee"
const VEST_CLIFF2_AMOUNT = formatTokenAmount(150);

const setup = hardhat.deployments.createFixture(
  async (): Promise<{
    nori: NORI;
    lNori: LockedNORI;
  }> => {
    const { upgrades, run, ethers } = hre;
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
    return {
      nori,
      lNori,
    };
  }
);

const setupWithGrant = hardhat.deployments.createFixture(
  async (
    _,
    { startTime = NOW }: { startTime?: number } = { startTime: NOW }
  ): ReturnType<typeof setup> => {
    const { nori, lNori } = await setup();
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
        namedAccounts.investor1,
        startTime,
        startTime + END_OFFSET,
        startTime + END_OFFSET,
        startTime + CLIFF1_OFFSET,
        startTime + CLIFF2_OFFSET,
        CLIFF1_AMOUNT,
        CLIFF2_AMOUNT,
        CLIFF1_AMOUNT,
        CLIFF2_AMOUNT,
      ]
    );
    expect(await nori.send(lNori.address, GRANT_AMOUNT, userData)) // eslint-disable-line jest/no-standalone-expect
      .to.emit(
        lNori,
        'TokenGrantCreated' // todo  overload expectGrantCreated withArgs
      )
      .to.emit(lNori, 'Minted');
    return {
      nori,
      lNori,
    };
  }
);

const setupWithEmployeeStyleGrant = hardhat.deployments.createFixture(
  async (
    _,
    options?: { startTime: number }
  ): Promise<ReturnType<typeof setup>> => {
    const { nori, lNori } = await setup();
    const start = options?.startTime || NOW;
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
        namedAccounts.employee,
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
    // eslint-disable-next-line jest/no-standalone-expect
    expect(await nori.send(lNori.address, GRANT_AMOUNT, userData))
      .to.emit(lNori, 'TokenGrantCreated')
      .withArgs(
        namedAccounts.employee,
        GRANT_AMOUNT,
        start,
        start + VEST_END_OFFSET,
        start + END_OFFSET
      );
    return { nori, lNori };
  }
);

const expectGrantCreated = async ({
  options,
  nori,
  lNori,
}: Awaited<ReturnType<typeof setup>> & {
  options?: { startTime: number };
}): Promise<void> => {
  const { admin, supplier } = await hre.getNamedAccounts();
  const start = options?.startTime || NOW;
  expect(
    await lNori.grantTo(
      GRANT_AMOUNT,
      supplier,
      start,
      start + END_OFFSET,
      start + END_OFFSET,
      start,
      start,
      0,
      0,
      0,
      0
    )
  )
    .to.emit(
      lNori,
      'TokenGrantCreated' // todo withArgs
    )
    .withArgs(
      supplier,
      GRANT_AMOUNT,
      start,
      start + END_OFFSET,
      start + END_OFFSET
    );
  expect(await nori.approve(lNori.address, GRANT_AMOUNT))
    .to.emit(nori, 'Approval')
    .withArgs(admin, lNori.address, GRANT_AMOUNT);
  expect(await nori.allowance(admin, lNori.address)).to.eq(GRANT_AMOUNT);
};

const setupGrantWithDirectCall = hardhat.deployments.createFixture(
  async (_, options?: { startTime: number }): ReturnType<typeof setup> => {
    const { nori, lNori } = await setup();
    await expectGrantCreated({ options, nori, lNori });
    return { nori, lNori };
  }
);

describe('LockedNori', () => {
  // todo test supported interfaces
  describe('when paused', () => {
    (
      [
        {
          method: 'authorizeOperator',
          pausableFunction: async ({ lNori }: { lNori: LockedNORI }) => {
            return lNori
              .connect(hre.namedSigners.investor1)
              .authorizeOperator(hre.namedAccounts.investor2);
          },
          postSetupHook: undefined,
        },
        {
          method: 'decreaseAllowance',
          pausableFunction: async ({ lNori }: { lNori: LockedNORI }) => {
            return lNori
              .connect(hre.namedSigners.investor1)
              .decreaseAllowance(
                hre.namedAccounts.investor2,
                formatTokenAmount(1)
              );
          },
          postSetupHook: undefined,
        },
        {
          method: 'approve',
          pausableFunction: async ({ lNori }: { lNori: LockedNORI }) => {
            return lNori
              .connect(hre.namedSigners.investor1)
              .approve(hre.namedAccounts.investor2, formatTokenAmount(1));
          },
          postSetupHook: undefined,
        },
        {
          method: 'burnFrom',
          pausableFunction: async ({ lNori }: { lNori: LockedNORI }) => {
            return lNori
              .connect(namedSigners.admin)
              .approve(namedAccounts.investor1, formatTokenAmount(1));
          },
          postSetupHook: async ({ lNori }: { lNori: LockedNORI }) => {
            await lNori
              .connect(namedSigners.investor1)
              .approve(
                namedAccounts.admin,
                hre.ethers.utils.parseEther((1).toString())
              );
          },
        },
        {
          method: 'grantRole',
          pausableFunction: async ({ lNori }: { lNori: LockedNORI }) => {
            return lNori
              .connect(namedSigners.admin)
              .grantRole(ethers.utils.id('SOME_ROLE'), namedAccounts.admin);
          },
          postSetupHook: undefined,
        },
        {
          method: 'renounceRole',
          pausableFunction: async ({ lNori }: { lNori: LockedNORI }) => {
            return lNori
              .connect(namedSigners.admin)
              .renounceRole(
                ethers.utils.id('MINTER_ROLE'),
                namedAccounts.admin
              );
          },
          postSetupHook: undefined,
        },
        {
          method: 'revokeRole',
          pausableFunction: async ({ lNori }: { lNori: LockedNORI }) => {
            return lNori
              .connect(namedSigners.admin)
              .revokeRole(ethers.utils.id('MINTER_ROLE'), namedAccounts.admin);
          },
          postSetupHook: async ({ lNori }: { lNori: LockedNORI }) => {
            await lNori
              .connect(namedSigners.admin)
              .grantRole(
                ethers.utils.id('MINTER_ROLE'),
                namedAccounts.noriWallet
              );
          },
        },
      ] as const
    ).forEach(({ method, pausableFunction, postSetupHook }) => {
      it(`will disable the function ${method}`, async () => {
        const { lNori } = await setupWithGrant();
        if (postSetupHook) {
          await postSetupHook({ lNori });
        }
        await lNori.connect(namedSigners.admin).pause();
        await expect(pausableFunction({ lNori })).revertedWith(
          'Pausable: paused'
        );
      });
    });
  });

  describe('initialization', () => {
    // it.todo('should fire events');
    it('should be deployed from the admin', async () => {
      const { lNori } = await setup();
      expect(lNori.deployTransaction.from).to.eq(namedAccounts.admin);
      // todo check that initialization happens at deployment
    });
    describe('roles', () => {
      (
        [
          { role: 'DEFAULT_ADMIN_ROLE' },
          { role: 'MINTER_ROLE' },
          { role: 'PAUSER_ROLE' },
          { role: 'TOKEN_GRANTER_ROLE' },
        ] as const
      ).forEach(({ role }) => {
        it(`will assign the role ${role} to the deployer and set the DEFAULT_ADMIN_ROLE as the role admin`, async () => {
          const { lNori } = await setup();
          expect(await lNori.hasRole(await lNori[role](), namedAccounts.admin))
            .to.be.true;
          expect(await lNori.getRoleAdmin(await lNori[role]())).to.eq(
            await lNori.DEFAULT_ADMIN_ROLE()
          );
          expect(await lNori.getRoleMemberCount(await lNori[role]())).to.eq(1);
        });
      });
    });
  });

  describe('getRoleAdmin', () => {
    (
      [
        { role: 'DEFAULT_ADMIN_ROLE' },
        { role: 'MINTER_ROLE' },
        { role: 'PAUSER_ROLE' },
        { role: 'TOKEN_GRANTER_ROLE' },
      ] as const
    ).forEach(({ role }) => {
      it(`will assign the admin of the role ${role} to the DEFAULT_ADMIN_ROLE role`, async () => {
        const { lNori } = await setup();
        expect(await lNori.getRoleAdmin(await lNori[role]())).to.eq(
          await lNori.DEFAULT_ADMIN_ROLE()
        );
      });
    });
  });

  describe('authorizeOperator', () => {
    it(`Will authorize the operator`, async () => {
      const { lNori } = await setupWithGrant();
      await expect(
        lNori
          .connect(namedSigners.investor1)
          .authorizeOperator(namedAccounts.investor2)
      )
        .to.emit(lNori, 'AuthorizedOperator')
        .withArgs(namedAccounts.investor2, namedAccounts.investor1);
    });
  });

  // it.todo('test that the admin cannot revoke vested tokens');

  it('Functions like ERC20Wrapped when no grant is present', async () => {
    const { nori, lNori } = await setup();
    const { admin, investor1 } = await hre.getNamedAccounts();
    const adminBalance = await nori.balanceOf(admin);
    expect(await nori.balanceOf(investor1)).to.equal(0);
    const depositAmount = hre.ethers.utils.parseUnits((10_000).toString());
    const userData = hre.ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256'],
      [investor1, 0]
    );
    expect(await nori.send(lNori.address, depositAmount, userData))
      .to.emit(nori, 'Sent')
      .withArgs(admin, admin, lNori.address, depositAmount, userData, '0x')
      .to.emit(lNori, 'Transfer')
      .withArgs(hre.ethers.constants.AddressZero, investor1, depositAmount);
    expect(await nori.balanceOf(admin)).to.equal(
      adminBalance.sub(depositAmount)
    );
    expect(await lNori.balanceOf(admin)).to.equal(0);
    // With no lockup schedule balanceOf == wrapped quantity
    // and vestedBalanceOf == unlockedBalanceOf == 0
    expect(await lNori.balanceOf(investor1)).to.equal(depositAmount);
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(depositAmount);
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(depositAmount);
    expect(
      await lNori
        .connect(await hre.ethers.getSigner(investor1))
        .withdrawTo(investor1, depositAmount)
    ).to.emit(lNori, 'TokensClaimed');
    expect(await lNori.totalSupply()).to.equal(0);
    expect(await nori.totalSupply()).to.equal(INITIAL_SUPPLY);
  });

  it('Should return zero before startTime', async () => {
    const { lNori, nori } = await setupWithGrant();
    const { investor1 } = await hre.getNamedAccounts();
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT); // todo use as options for setupWithGrant instead of constant
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(0);
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(0);
    expect((await lNori.getGrant(investor1)).grantAmount).to.equal(
      GRANT_AMOUNT
    );
    expect(await nori.totalSupply()).to.equal(INITIAL_SUPPLY);
    await expect(
      lNori
        .connect(await hre.ethers.getSigner(investor1))
        .withdrawTo(investor1, 1)
    ).to.be.revertedWith('lNORI: insufficient balance');
  });

  it('Should fail to transfer locked tokens', async () => {
    const { lNori, nori } = await setupWithGrant();
    const { investor1, investor2 } = await hre.getNamedAccounts();
    const addr1Signer = await hre.ethers.getSigner(investor1); // todo name
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    await expect(
      lNori.connect(addr1Signer).transfer(investor2, 1)
    ).to.be.revertedWith('lNORI: insufficient balance');
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT);
    expect(await nori.balanceOf(investor1)).to.equal(0);
  });

  it('Should fail to send locked tokens', async () => {
    const { lNori, nori } = await setupWithGrant();
    const { investor1, investor2 } = await hre.getNamedAccounts();
    const addr1Signer = await hre.ethers.getSigner(investor1);
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    await expect(
      lNori.connect(addr1Signer).send(investor2, 1, '0x')
    ).to.be.revertedWith('lNORI: insufficient balance');
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT);
    expect(await nori.balanceOf(investor1)).to.equal(0);
  });

  it('Should unlock cliff1', async () => {
    // cliff1 < now < cliff2
    const startTime = NOW;
    const { lNori } = await setupWithGrant({ startTime });
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
    const { lNori } = await setupWithGrant({ startTime });
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
    const { lNori } = await setupWithGrant({ startTime });
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
    ).to.be.revertedWith('lNORI: insufficient balance');
  });

  it('Should unlock smoothly after cliff2', async () => {
    // cliff2 < now < endTime
    const startTime = NOW;
    const { lNori } = await setupWithGrant({ startTime });
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
    const { lNori } = await setupWithGrant({ startTime });
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
    expect(
      await lNori
        .connect(addr1Signer)
        .withdrawTo(investor1, GRANT_AMOUNT.sub(withdrawlAmount))
    ).to.emit(lNori, 'Transfer');
    expect(await lNori.balanceOf(investor1)).to.equal(0);
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(0);
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(0);
  });

  it('Should treat unlock lagging vest schedules correctly at end of vest', async () => {
    // now == endTime
    const { lNori } = await setupWithEmployeeStyleGrant();
    const { employee } = await hre.getNamedAccounts();
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + VEST_END_OFFSET,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.balanceOf(employee)).to.equal(GRANT_AMOUNT);
    expect(await lNori.vestedBalanceOf(employee)).to.equal(GRANT_AMOUNT);
    expect(await lNori.unlockedBalanceOf(employee)).to.equal(
      '822222222222222222222' // todo double check
    );
  });

  it('Should treat larger vest cliffs than unlock cliffs correctly', async () => {
    // now == cliff1
    const { lNori } = await setupWithEmployeeStyleGrant();
    const { employee } = await hre.getNamedAccounts();

    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + CLIFF1_OFFSET,
    ]);
    await hardhat.network.provider.send('evm_mine');

    expect(await lNori.balanceOf(employee)).to.equal(GRANT_AMOUNT);
    expect(await lNori.vestedBalanceOf(employee)).to.equal(VEST_CLIFF1_AMOUNT);
    expect(await lNori.unlockedBalanceOf(employee)).to.equal(CLIFF1_AMOUNT);
  });

  it('Should handle a linear unlock with funding lagging vesting', async () => {
    const { lNori, nori } = await setupGrantWithDirectCall();
    const { supplier } = await hre.getNamedAccounts();
    const userData = await hre.ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256'],
      [supplier, 0]
    );
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + DELTA,
    ]);
    await hardhat.network.provider.send('evm_mine');

    expect(await lNori.balanceOf(supplier)).to.equal(0);
    expect(await lNori.vestedBalanceOf(supplier)).to.be.gt(0);
    expect(await lNori.unlockedBalanceOf(supplier)).to.be.gt(0);

    expect(await nori.send(lNori.address, GRANT_AMOUNT.div(2), userData));
    expect(await lNori.balanceOf(supplier)).to.equal(GRANT_AMOUNT.div(2));
    expect(await lNori.vestedBalanceOf(supplier)).to.be.gt(0);
    expect(await lNori.unlockedBalanceOf(supplier)).to.be.gt(0);

    await nori.send(lNori.address, GRANT_AMOUNT.div(2), userData);
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + END_OFFSET / 4,
    ]);
    await hardhat.network.provider.send('evm_mine');

    expect(await lNori.balanceOf(supplier)).to.equal(GRANT_AMOUNT);
    expect(await lNori.vestedBalanceOf(supplier)).to.equal(GRANT_AMOUNT.div(4));
    expect(await lNori.unlockedBalanceOf(supplier)).to.equal(
      GRANT_AMOUNT.div(4)
    );

    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + END_OFFSET / 2,
    ]);
    await hardhat.network.provider.send('evm_mine');

    expect(await lNori.balanceOf(supplier)).to.equal(GRANT_AMOUNT);
    expect(await lNori.vestedBalanceOf(supplier)).to.equal(GRANT_AMOUNT.div(2));
    expect(await lNori.unlockedBalanceOf(supplier)).to.equal(
      GRANT_AMOUNT.div(2)
    );

    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + END_OFFSET,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.balanceOf(supplier)).to.equal(GRANT_AMOUNT);
    expect(await lNori.vestedBalanceOf(supplier)).to.equal(GRANT_AMOUNT);
    expect(await lNori.unlockedBalanceOf(supplier)).to.equal(GRANT_AMOUNT);
  });

  it('Should revoke unvested tokens', async () => {
    // now == CLIFF2

    const { lNori } = await setupWithEmployeeStyleGrant();
    const { employee, admin } = await hre.getNamedAccounts();
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + VEST_REVOKED_OFFSET,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.balanceOf(employee)).to.equal(GRANT_AMOUNT);
    const newBalance = VESTED_BALANCE_AFTER_REVOCATION;
    expect(await lNori.vestedBalanceOf(employee)).to.equal(newBalance);
    expect(
      await lNori
        .connect(await hre.ethers.getSigner(admin))
        .revokeUnvestedTokens(NOW + VEST_REVOKED_OFFSET, employee, admin)
    )
      .to.emit(lNori, 'UnvestedTokensRevoked')
      .withArgs(
        NOW + VEST_REVOKED_OFFSET,
        employee,
        GRANT_AMOUNT.sub(newBalance)
      );
    expect(await lNori.vestedBalanceOf(employee)).to.equal(newBalance);
    expect(await lNori.balanceOf(employee)).to.equal(newBalance);

    // await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
    //   NOW + VEST_REVOKED_OFFSET + DELTA,
    // ]);
    // await hardhat.network.provider.send('evm_mine');
    // console.log({
    //   unlocked: await (await lNori.unlockedBalanceOf(investor1)).toString(),
    //   CLIFF1_AMOUNT: CLIFF1_AMOUNT.toString(),
    //   CLIFF2_AMOUNT: CLIFF2_AMOUNT.toString(),
    // });
    expect(await lNori.unlockedBalanceOf(employee)).to.eq(
      BigNumber.from('600008888888888888888')
    );
    expect(await lNori.balanceOf(admin)).to.equal(GRANT_AMOUNT.sub(newBalance));

    // TODO: Might be worth reworking the times in all these fixtures
    // with actual seconds and calculate these thresholds more carefully.
    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + FULLY_UNLOCKED_AFTER_REVOCATION_OFFSET - DELTA,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.unlockedBalanceOf(employee)).to.be.lt(newBalance);

    await hardhat.network.provider.send('evm_setNextBlockTimestamp', [
      NOW + FULLY_UNLOCKED_AFTER_REVOCATION_OFFSET + DELTA,
    ]);
    await hardhat.network.provider.send('evm_mine');
    expect(await lNori.unlockedBalanceOf(employee)).to.be.eq(newBalance);
  });

  it('Should return details of a grant', async () => {
    const startTime = NOW;
    const { lNori } = await setupWithEmployeeStyleGrant({ startTime });
    const { employee } = await hre.getNamedAccounts();
    const grant = await lNori.getGrant(employee);
    const expected = [
      GRANT_AMOUNT,
      employee,
      BigNumber.from(startTime),
      BigNumber.from(startTime + VEST_END_OFFSET),
      BigNumber.from(startTime + END_OFFSET),
      BigNumber.from(startTime + CLIFF1_OFFSET),
      BigNumber.from(startTime + CLIFF2_OFFSET),
      VEST_CLIFF1_AMOUNT,
      VEST_CLIFF2_AMOUNT,
      CLIFF1_AMOUNT,
      CLIFF2_AMOUNT,
      BigNumber.from(0),
      GRANT_AMOUNT,
    ];
    for (let i = 0; i < grant.length; i++) {
      expect(grant[i]).to.eq(
        expected[i],
        `${i}: ${expected[i].toString()} == ${grant[i].toString()}`
      );
    }
  });

  // it.todo('Wallet granted TOKEN_GRANTER_ROLE after initialization can revoke');
});
