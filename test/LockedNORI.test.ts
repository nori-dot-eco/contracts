import { BigNumber } from 'ethers';

import type { LockedNORI } from '@/typechain-types/LockedNORI';
import {
  expect,
  setupTestEnvironment,
  advanceTime,
  getLatestBlockTime,
} from '@/test/helpers';
import { formatTokenAmount } from '@/utils/units';

interface TokenGrantUserData {
  recipient: string;
  startTime: number;
  vestEndTime: number;
  unlockEndTime: number;
  cliff1Time: number;
  cliff2Time: number;
  vestCliff1Amount: ReturnType<typeof formatTokenAmount>;
  vestCliff2Amount: ReturnType<typeof formatTokenAmount>;
  unlockCliff1Amount: ReturnType<typeof formatTokenAmount>;
  unlockCliff2Amount: ReturnType<typeof formatTokenAmount>;
}

interface TokenGrantOptions {
  grantAmount: ReturnType<typeof formatTokenAmount>;
  grant: TokenGrantUserData;
}
interface BuildTokenGrantOptionFunctionParams {
  hre: CustomHardHatRuntimeEnvironment;
  startTime: number;
}

type BuildTokenGrantOptionFunction = (
  params: BuildTokenGrantOptionFunctionParams
) => DeepPartial<TokenGrantOptions>;

interface PausableFunctionParams {
  lNori: LockedNORI;
  hre: CustomHardHatRuntimeEnvironment;
}

const NOW = Math.floor(Date.now() / 1_000);

const setupTest = setupTestEnvironment; // todo rename (stop using alias)

const CLIFF1_AMOUNT = formatTokenAmount(100);
const CLIFF2_AMOUNT = formatTokenAmount(100);
const CLIFF1_OFFSET = 5_000;
const CLIFF2_OFFSET = 10_000;
const END_OFFSET = 100_000;
const DELTA = 1_000; // useful offset to place time before / after the inflection points
const GRANT_AMOUNT = formatTokenAmount(1_000);
const INITIAL_SUPPLY = formatTokenAmount(100_000_000); // comes from polygon helper

const defaultParams = ({
  startTime = NOW, // todo use await getLatestBlockTime({hre}) instead
  hre,
}: {
  startTime?: number;
  hre: CustomHardHatRuntimeEnvironment;
}): TokenGrantOptions => {
  return {
    grantAmount: GRANT_AMOUNT,
    grant: {
      recipient: hre.namedAccounts.investor1,
      startTime,
      vestEndTime: startTime + END_OFFSET,
      unlockEndTime: startTime + END_OFFSET,
      cliff1Time: startTime + CLIFF1_OFFSET,
      cliff2Time: startTime + CLIFF2_OFFSET,
      vestCliff1Amount: CLIFF1_AMOUNT,
      vestCliff2Amount: CLIFF2_AMOUNT,
      unlockCliff1Amount: CLIFF1_AMOUNT,
      unlockCliff2Amount: CLIFF2_AMOUNT,
    },
  };
};

// specific to employee scenario
const VEST_REVOKED_OFFSET = 55_000; // halfway through the linear distribution of vesting
const VESTED_BALANCE_AFTER_REVOCATION = formatTokenAmount(750);
const FULLY_UNLOCKED_AFTER_REVOCATION_OFFSET = 72_000;

const employeeParams = ({
  startTime = NOW, // todo use await getLatestBlockTime({hre}) instead
  hre,
}: {
  startTime?: number;
  hre: CustomHardHatRuntimeEnvironment;
}): TokenGrantOptions => {
  const VEST_END_OFFSET = 80_000;
  const VEST_CLIFF1_AMOUNT = formatTokenAmount(150);
  const VEST_CLIFF2_AMOUNT = formatTokenAmount(150);
  return {
    grantAmount: GRANT_AMOUNT,
    grant: {
      recipient: hre.namedAccounts.employee,
      startTime,
      vestEndTime: startTime + VEST_END_OFFSET,
      unlockEndTime: startTime + END_OFFSET,
      cliff1Time: startTime + CLIFF1_OFFSET,
      cliff2Time: startTime + CLIFF2_OFFSET,
      vestCliff1Amount: VEST_CLIFF1_AMOUNT,
      vestCliff2Amount: VEST_CLIFF2_AMOUNT,
      unlockCliff1Amount: CLIFF1_AMOUNT,
      unlockCliff2Amount: CLIFF2_AMOUNT,
    },
  };
};

const investorParams = ({
  startTime = NOW, // todo use await getLatestBlockTime({hre}) instead
  hre,
}: {
  startTime?: number;
  hre: CustomHardHatRuntimeEnvironment;
}): TokenGrantOptions => {
  return {
    grantAmount: GRANT_AMOUNT,
    grant: {
      recipient: hre.namedAccounts.investor1,
      startTime,
      vestEndTime: startTime,
      unlockEndTime: startTime + END_OFFSET,
      cliff1Time: startTime + CLIFF1_OFFSET,
      cliff2Time: startTime + CLIFF2_OFFSET,
      vestCliff1Amount: BigNumber.from(0),
      vestCliff2Amount: BigNumber.from(0),
      unlockCliff1Amount: CLIFF1_AMOUNT,
      unlockCliff2Amount: CLIFF2_AMOUNT,
    },
  };
};

const linearParams = ({
  startTime = NOW, // todo use await getLatestBlockTime({hre}) instead
  hre,
}: {
  startTime?: number;
  hre: CustomHardHatRuntimeEnvironment;
}): TokenGrantOptions => {
  return {
    grantAmount: GRANT_AMOUNT,
    grant: {
      recipient: hre.namedAccounts.supplier,
      startTime,
      vestEndTime: startTime + END_OFFSET,
      unlockEndTime: startTime + END_OFFSET,
      cliff1Time: startTime,
      cliff2Time: startTime,
      vestCliff1Amount: BigNumber.from(0),
      vestCliff2Amount: BigNumber.from(0),
      unlockCliff1Amount: BigNumber.from(0),
      unlockCliff2Amount: BigNumber.from(0),
    },
  };
};

const formatGrantUserData = (grant: TokenGrantUserData): any => {
  return hre.ethers.utils.defaultAbiCoder.encode(
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
    Object.values(grant)
  );
};

const setupWithGrant = async (
  _options: DeepPartial<TokenGrantOptions> | BuildTokenGrantOptionFunction = {}
): Promise<Awaited<ReturnType<typeof setupTest>> & TokenGrantOptions> => {
  const { bpNori, lNori, hre, ...rest } = await setupTest();
  const options: DeepPartial<TokenGrantOptions> =
    typeof _options === 'function'
      ? _options({ hre, startTime: await getLatestBlockTime({ hre }) })
      : _options;
  const defaults = defaultParams({
    hre,
    startTime: await getLatestBlockTime({ hre }),
  });
  const { namedAccounts } = hre;
  const { grantAmount, grant } = {
    grantAmount: options?.grantAmount ?? defaults.grantAmount,
    grant: {
      ...defaults.grant,
      ...options.grant,
    },
  } as TokenGrantOptions;
  const userData = formatGrantUserData(grant);

  // eslint-disable-next-line jest/no-standalone-expect
  expect(await bpNori.send(lNori.address, grantAmount, userData))
    .to.emit(lNori, 'TokenGrantCreated')
    .withArgs(
      grant.recipient,
      grantAmount,
      grant.startTime,
      grant.vestEndTime,
      grant.unlockEndTime
    )
    .to.emit(lNori, 'Minted')
    .withArgs(bpNori.address, grant.recipient, grantAmount, userData, '0x')
    .to.emit(lNori, 'Transfer')
    .withArgs(hre.ethers.constants.AddressZero, grant.recipient, grantAmount)
    .to.emit(bpNori, 'Sent')
    .withArgs(
      namedAccounts.admin,
      namedAccounts.admin,
      lNori.address,
      grantAmount,
      userData,
      '0x'
    )
    .to.emit(bpNori, 'Transfer')
    .withArgs(namedAccounts.admin, lNori.address, grantAmount);
  return { bpNori, lNori, grant, grantAmount, ...rest, hre };
};

const setupGrantWithDirectCall = async (
  options: DeepPartial<TokenGrantOptions> = {}
): ReturnType<typeof setupWithGrant> => {
  const { bpNori, lNori, hre, ...rest } = await setupTest();
  const defaults = linearParams({
    hre,
    startTime: await getLatestBlockTime({ hre }),
  });
  const { grantAmount, grant } = {
    grantAmount: options?.grantAmount ?? defaults.grantAmount,
    grant: {
      ...defaults.grant,
      ...options.grant,
    },
  } as TokenGrantOptions;
  const { admin } = hre.namedAccounts;
  // eslint-disable-next-line jest/no-standalone-expect
  await expect(
    lNori.createGrant(
      grantAmount,
      grant.recipient,
      grant.startTime,
      grant.vestEndTime,
      grant.unlockEndTime,
      grant.cliff1Time,
      grant.cliff2Time,
      grant.vestCliff1Amount,
      grant.vestCliff2Amount,
      grant.unlockCliff1Amount,
      grant.unlockCliff2Amount
    )
  )
    // .not.to.emit(lNori, 'Minted')
    // .not.to.emit(lNori, 'Transfer')
    // .not.to.emit(bpNori, 'Sent')
    // .not.to.emit(lNori, 'Transfer')
    .to.emit(lNori, 'TokenGrantCreated')
    .withArgs(
      grant.recipient,
      grantAmount,
      grant.startTime,
      grant.vestEndTime,
      grant.unlockEndTime
    );
  // eslint-disable-next-line jest/no-standalone-expect
  await expect(bpNori.approve(lNori.address, grantAmount))
    .to.emit(bpNori, 'Approval')
    .withArgs(admin, lNori.address, grantAmount);
  // eslint-disable-next-line jest/no-standalone-expect
  expect(await bpNori.allowance(admin, lNori.address)).to.eq(grantAmount);
  return { bpNori, lNori, grantAmount, grant, hre, ...rest };
};

describe('LockedNori', () => {
  // todo test supported interfaces
  describe('when paused', () => {
    (
      [
        {
          method: 'authorizeOperator',
          pausableFunction: async ({ lNori, hre }: PausableFunctionParams) => {
            return lNori
              .connect(hre.namedSigners.investor1)
              .authorizeOperator(hre.namedAccounts.investor2);
          },
          postSetupHook: undefined,
        },
        {
          method: 'approve',
          pausableFunction: async ({ lNori, hre }: PausableFunctionParams) => {
            return lNori
              .connect(hre.namedSigners.investor1)
              .approve(hre.namedAccounts.investor2, formatTokenAmount(1));
          },
          postSetupHook: undefined,
        },
        {
          method: 'burnFrom',
          pausableFunction: async ({ lNori, hre }: PausableFunctionParams) => {
            return lNori
              .connect(hre.namedSigners.admin)
              .approve(hre.namedAccounts.investor1, formatTokenAmount(1));
          },
          postSetupHook: async ({ lNori, hre }: PausableFunctionParams) => {
            await lNori
              .connect(hre.namedSigners.investor1)
              .approve(
                hre.namedAccounts.admin,
                hre.ethers.utils.parseEther((1).toString())
              );
          },
        },
        {
          method: 'grantRole',
          pausableFunction: async ({ lNori, hre }: PausableFunctionParams) => {
            return lNori
              .connect(hre.namedSigners.admin)
              .grantRole(
                hre.ethers.utils.id('SOME_ROLE'),
                hre.namedAccounts.admin
              );
          },
          postSetupHook: undefined,
        },
        {
          method: 'renounceRole',
          pausableFunction: async ({ lNori, hre }: PausableFunctionParams) => {
            return lNori
              .connect(hre.namedSigners.admin)
              .renounceRole(
                hre.ethers.utils.id('MINTER_ROLE'),
                hre.namedAccounts.admin
              );
          },
          postSetupHook: undefined,
        },
        {
          method: 'revokeRole',
          pausableFunction: async ({ lNori, hre }: PausableFunctionParams) => {
            return lNori
              .connect(hre.namedSigners.admin)
              .revokeRole(
                hre.ethers.utils.id('MINTER_ROLE'),
                hre.namedAccounts.admin
              );
          },
          postSetupHook: async ({ lNori, hre }: PausableFunctionParams) => {
            await lNori
              .connect(hre.namedSigners.admin)
              .grantRole(
                hre.ethers.utils.id('MINTER_ROLE'),
                hre.namedAccounts.noriWallet
              );
          },
        },
      ] as const
    ).forEach(({ method, pausableFunction, postSetupHook }) => {
      it(`will disable the function ${method}`, async () => {
        const { lNori, hre } = await setupTest();
        if (postSetupHook != null) {
          await postSetupHook({ lNori, hre });
        }
        await lNori.connect(hre.namedSigners.admin).pause();
        await expect(pausableFunction({ lNori, hre })).revertedWith(
          'Pausable: paused'
        );
      });
    });

    it(`will not allow tokens to be deposited when the contract is paused`, async () => {
      const { lNori, bpNori, grant, hre } = await setupGrantWithDirectCall();
      const { namedAccounts, namedSigners } = hre;
      const userData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256'],
        [namedAccounts.supplier, 0]
      );
      await expect(
        bpNori.send(lNori.address, formatTokenAmount(10_000), userData)
      ).to.emit(lNori, 'Minted');
      await expect(
        bpNori
          .connect(namedSigners.supplier)
          .authorizeOperator(namedAccounts.admin)
      ).to.emit(bpNori, 'AuthorizedOperator');

      await advanceTime({ hre, timestamp: grant.unlockEndTime });
      await expect(lNori.connect(namedSigners.admin).pause()).to.emit(
        lNori,
        'Paused'
      );
      await expect(
        bpNori
          .connect(namedSigners.admin)
          .send(lNori.address, formatTokenAmount(10_000), userData)
      ).revertedWith('Pausable: paused');

      await expect(
        bpNori
          .connect(namedSigners.admin)
          .operatorSend(
            namedAccounts.admin,
            lNori.address,
            formatTokenAmount(10_000),
            userData,
            '0x'
          )
      ).revertedWith('Pausable: paused');
    });

    it(`will not allow tokens to be withdrawn when the contract is paused`, async () => {
      const { lNori, bpNori, grant, hre } = await setupGrantWithDirectCall();
      const { namedAccounts, namedSigners } = hre;
      const userData = hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256'],
        [namedAccounts.supplier, 0]
      );
      await expect(
        bpNori.send(lNori.address, formatTokenAmount(10_000), userData)
      ).to.emit(lNori, 'Minted');
      await expect(
        lNori
          .connect(namedSigners.supplier)
          .approve(namedAccounts.admin, formatTokenAmount(10_000))
      ).to.emit(lNori, 'Approval');
      await expect(
        bpNori
          .connect(namedSigners.supplier)
          .authorizeOperator(namedAccounts.admin)
      ).to.emit(bpNori, 'AuthorizedOperator');

      await advanceTime({ hre, timestamp: grant.unlockEndTime });

      await expect(lNori.connect(namedSigners.admin).pause()).to.emit(
        lNori,
        'Paused'
      );

      await expect(
        lNori
          .connect(namedSigners.admin)
          .operatorSend(
            namedAccounts.supplier,
            lNori.address,
            formatTokenAmount(1),
            userData,
            '0x'
          )
      ).revertedWith('Pausable: paused');

      await expect(
        lNori
          .connect(namedSigners.admin)
          .transferFrom(
            namedAccounts.supplier,
            namedAccounts.admin,
            formatTokenAmount(1)
          )
      ).revertedWith('Pausable: paused');
    });
  });

  describe('initialization', () => {
    // it.todo('should fire events');
    describe('roles', () => {
      (
        [
          { role: 'DEFAULT_ADMIN_ROLE' },
          { role: 'PAUSER_ROLE' },
          { role: 'TOKEN_GRANTER_ROLE' },
        ] as const
      ).forEach(({ role }) => {
        it(`will assign the role ${role} to the deployer and set the DEFAULT_ADMIN_ROLE as the role admin`, async () => {
          const { lNori, hre } = await setupTest();
          expect(
            await lNori.hasRole(await lNori[role](), hre.namedAccounts.admin)
          ).to.be.true;
          expect(await lNori.getRoleAdmin(await lNori[role]())).to.eq(
            await lNori.DEFAULT_ADMIN_ROLE()
          );
          expect(await lNori.getRoleMemberCount(await lNori[role]())).to.eq(1);
        });
      });
    });
  });

  describe('role access', () => {
    // it.todo('only the token granter role can deposit tokens')
    describe('roles', () => {
      describe('TOKEN_GRANTER_ROLE', () => {
        [
          {
            role: 'TOKEN_GRANTER_ROLE',
            accountWithRole: 'admin',
            accountWithoutRole: 'investor1',
          } as const,
        ].forEach(({ role, accountWithRole, accountWithoutRole }) => {
          it(`accounts with the role "${role}" can use "batchRevokeUnvestedTokenAmounts" whilst accounts without the role "${role}" cannot`, async () => {
            const { lNori, grantAmount, grant, hre } = await setupWithGrant(
              (params) => employeeParams(params)
            );
            const { namedAccounts, namedSigners } = hre;
            const roleId = await lNori[role]();
            expect(await lNori.hasRole(roleId, namedAccounts[accountWithRole]))
              .to.be.true;
            expect(
              await lNori
                .connect(namedSigners[accountWithRole])
                .batchRevokeUnvestedTokenAmounts(
                  [grant.recipient],
                  [namedAccounts.admin],
                  [grant.startTime + DELTA],
                  [0]
                )
            )
              .to.emit(lNori, 'UnvestedTokensRevoked')
              .withArgs(
                grant.startTime + DELTA,
                namedAccounts.employee,
                grantAmount
              );
            // todo test balance of admin is now the revoked token balance
            await expect(
              lNori
                .connect(namedSigners[accountWithoutRole])
                .batchRevokeUnvestedTokenAmounts(
                  [grant.recipient],
                  [namedAccounts.admin],
                  [grant.startTime + DELTA],
                  [0]
                )
            ).to.be.revertedWith(
              `AccessControl: account ${namedAccounts[
                accountWithoutRole
              ].toLowerCase()} is missing role ${roleId}`
            );
          });
          it(`accounts with the role "${role}" can use "createGrant" whilst accounts without the role "${role}" cannot`, async () => {
            const { lNori, hre } = await setupTest();
            const { namedAccounts, namedSigners } = hre;
            const roleId = await lNori[role]();
            expect(
              await lNori.hasRole(roleId, namedAccounts[accountWithoutRole])
            ).to.be.false;
            const { grant, grantAmount } = employeeParams({
              hre,
              startTime: await getLatestBlockTime({ hre }),
            });
            expect(
              await lNori
                .connect(namedSigners[accountWithRole])
                .createGrant(
                  grantAmount,
                  grant.recipient,
                  grant.startTime,
                  grant.vestEndTime,
                  grant.unlockEndTime,
                  grant.cliff1Time,
                  grant.cliff2Time,
                  grant.vestCliff1Amount,
                  grant.vestCliff2Amount,
                  grant.unlockCliff1Amount,
                  grant.unlockCliff2Amount
                )
            )
              .to.emit(lNori, 'TokenGrantCreated')
              .withArgs(
                grant.recipient,
                grantAmount,
                grant.startTime,
                grant.vestEndTime,
                grant.unlockEndTime
              );
            await expect(
              lNori
                .connect(namedSigners[accountWithoutRole])
                .createGrant(
                  grantAmount,
                  grant.recipient,
                  grant.startTime,
                  grant.vestEndTime,
                  grant.unlockEndTime,
                  grant.cliff1Time,
                  grant.cliff2Time,
                  grant.vestCliff1Amount,
                  grant.vestCliff2Amount,
                  grant.unlockCliff1Amount,
                  grant.unlockCliff2Amount
                )
            ).to.be.revertedWith(
              `AccessControl: account ${namedAccounts[
                accountWithoutRole
              ].toLowerCase()} is missing role ${roleId}`
            );
          });
          it(`accounts with the role "${role}" can send bpNori whilst accounts without the role "${role}" cannot`, async () => {
            const { bpNori, lNori, hre } = await setupTest();
            const { namedAccounts, namedSigners } = hre;
            const roleId = await lNori[role]();
            expect(
              await lNori.hasRole(roleId, namedAccounts[accountWithoutRole])
            ).to.be.false;
            const { grant, grantAmount } = employeeParams({
              hre,
              startTime: await getLatestBlockTime({ hre }),
            });
            await expect(
              bpNori
                .connect(namedSigners[accountWithRole])
                .send(lNori.address, grantAmount, formatGrantUserData(grant))
            )
              .to.emit(lNori, 'TokenGrantCreated')
              .withArgs(
                grant.recipient,
                grantAmount,
                grant.startTime,
                grant.vestEndTime,
                grant.unlockEndTime
              );
            await expect(
              bpNori.send(namedAccounts[accountWithoutRole], grantAmount, '0x')
            );
            const userData = hre.ethers.utils.defaultAbiCoder.encode(
              ['address', 'uint256'],
              [namedAccounts[accountWithoutRole], 0]
            );
            await expect(
              bpNori
                .connect(namedSigners[accountWithoutRole])
                .send(lNori.address, grantAmount, userData)
            ).to.be.revertedWith(
              `lNORI: sender is missing role TOKEN_GRANTER_ROLE`
            );
          });
        });

        // (
        //     {
        //       role: 'PAUSER_ROLE',
        //       accountWithRole: namedSigners.admin,
        //       accountWithoutRole: namedSigners.investor1,
        //     },
        //     {
        //       role: 'DEFAULT_ADMIN_ROLE',
        //       accountWithRole: namedSigners.admin,
        //       accountWithoutRole: namedSigners.investor1,
        //     },
        //   ] as const
        // ).forEach(({ role }) => {});
      });
    });
  });

  describe('getRoleAdmin', () => {
    (
      [
        { role: 'DEFAULT_ADMIN_ROLE' },
        { role: 'PAUSER_ROLE' },
        { role: 'TOKEN_GRANTER_ROLE' },
      ] as const
    ).forEach(({ role }) => {
      it(`will assign the admin of the role ${role} to the DEFAULT_ADMIN_ROLE role`, async () => {
        const { lNori } = await setupTest();
        expect(await lNori.getRoleAdmin(await lNori[role]())).to.eq(
          await lNori.DEFAULT_ADMIN_ROLE()
        );
      });
    });
  });

  describe('authorizeOperator', () => {
    it(`Will authorize the operator`, async () => {
      const { lNori, hre } = await setupWithGrant();
      await expect(
        lNori
          .connect(hre.namedSigners.investor1)
          .authorizeOperator(hre.namedAccounts.investor2)
      )
        .to.emit(lNori, 'AuthorizedOperator')
        .withArgs(hre.namedAccounts.investor2, hre.namedAccounts.investor1);
    });
  });

  it('Prevents wrapping bpNori when no grant is present', async () => {
    const { bpNori, lNori, hre } = await setupTest();
    const { investor1 } = hre.namedAccounts;
    expect(await bpNori.balanceOf(investor1)).to.equal(0);
    const depositAmount = formatTokenAmount(10);
    const userData = hre.ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256'],
      [investor1, 0]
    );
    await expect(
      bpNori.send(lNori.address, depositAmount, userData)
    ).to.be.revertedWith('lNORI: Cannot deposit without a grant');
  });

  it('Should return zero before startTime', async () => {
    const { lNori } = await setupWithGrant();
    const { investor1 } = await hre.getNamedAccounts();
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT); // todo use as options for setupWithGrant instead of constant
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(0);
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(0);
    expect((await lNori.getGrant(investor1)).grantAmount).to.equal(
      GRANT_AMOUNT
    );
    await expect(
      lNori
        .connect(await hre.ethers.getSigner(investor1))
        .withdrawTo(investor1, 1)
    ).to.be.revertedWith('lNORI: insufficient balance');
  });

  describe('createGrant', () => {
    it('Should fail to create a second grant for an address', async () => {
      const { lNori, hre } = await setupTest();
      const { grant, grantAmount } = employeeParams({
        hre,
        startTime: await getLatestBlockTime({ hre }),
      });
      const { namedSigners } = hre;
      await expect(
        lNori
          .connect(namedSigners['admin'])
          .createGrant(
            grantAmount,
            grant.recipient,
            grant.startTime,
            grant.vestEndTime,
            grant.unlockEndTime,
            grant.cliff1Time,
            grant.cliff2Time,
            grant.vestCliff1Amount,
            grant.vestCliff2Amount,
            grant.unlockCliff1Amount,
            grant.unlockCliff2Amount
          )
      )
        .to.emit(lNori, 'TokenGrantCreated')
        .withArgs(
          grant.recipient,
          grantAmount,
          grant.startTime,
          grant.vestEndTime,
          grant.unlockEndTime
        );

      await expect(
        lNori
          .connect(namedSigners['admin'])
          .createGrant(
            grantAmount,
            grant.recipient,
            grant.startTime,
            grant.vestEndTime,
            grant.unlockEndTime,
            grant.cliff1Time,
            grant.cliff2Time,
            grant.vestCliff1Amount,
            grant.vestCliff2Amount,
            grant.unlockCliff1Amount,
            grant.unlockCliff2Amount
          )
      ).to.be.revertedWith('lNORI: Grant already exists');
    });
  });

  describe('locked tokens', () => {
    it('Should fail to *send*', async () => {
      const { lNori, bpNori } = await setupWithGrant();
      const { investor1, investor2 } = await hre.getNamedAccounts();
      const addr1Signer = await hre.ethers.getSigner(investor1);
      expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
      await expect(
        lNori.connect(addr1Signer).send(investor2, 1, '0x')
      ).to.be.revertedWith('lNORI: insufficient balance');
      expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
      expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT);
      expect(await bpNori.balanceOf(investor1)).to.equal(0);
    });

    it('Should fail to *transfer*', async () => {
      const { lNori, bpNori } = await setupWithGrant();
      const { investor1, investor2 } = await hre.getNamedAccounts();
      const addr1Signer = await hre.ethers.getSigner(investor1);
      await expect(
        lNori.connect(addr1Signer).transfer(investor2, 1)
      ).to.be.revertedWith('lNORI: insufficient balance');
      expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
      expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT);
      expect(await bpNori.balanceOf(investor1)).to.equal(0);
    });

    it('Should fail to *operatorSend*', async () => {
      const { lNori, bpNori } = await setupWithGrant();
      const { admin, investor1, investor2 } = await hre.getNamedAccounts();
      const addr1Signer = await hre.ethers.getSigner(investor1);
      expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
      await expect(lNori.connect(addr1Signer).authorizeOperator(admin)).to.emit(
        lNori,
        'AuthorizedOperator'
      );
      await expect(
        lNori.operatorSend(investor1, investor2, 1, '0x', '0x')
      ).to.be.revertedWith('lNORI: insufficient balance');
      expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
      expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT);
      expect(await bpNori.balanceOf(investor1)).to.equal(0);
    });

    it('Should fail to *transferFrom*', async () => {
      const { lNori, bpNori } = await setupWithGrant();
      const { admin, investor1, investor2 } = await hre.getNamedAccounts();
      const addr1Signer = await hre.ethers.getSigner(investor1);
      expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
      await expect(lNori.connect(addr1Signer).approve(admin, 1)).to.emit(
        lNori,
        'Approval'
      );
      await expect(
        lNori.transferFrom(investor1, investor2, 1)
      ).to.be.revertedWith('lNORI: insufficient balance');
      expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
      expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT);
      expect(await bpNori.balanceOf(investor1)).to.equal(0);
    });
  });

  describe('Unlocking', () => {
    it('Should unlock cliff1', async () => {
      // cliff1 < now < cliff2
      const { lNori, grant, hre } = await setupWithGrant();
      const { investor1 } = hre.namedAccounts;
      await advanceTime({ hre, timestamp: grant.cliff1Time });
      expect(await lNori.unlockedBalanceOf(investor1)).to.equal(CLIFF1_AMOUNT);
      expect(await lNori.vestedBalanceOf(investor1)).to.equal(CLIFF1_AMOUNT);
      expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    });

    it('Should unlock cliff2', async () => {
      // cliff2 == now
      const { lNori, grant, hre } = await setupWithGrant();
      const { investor1 } = hre.namedAccounts;
      await advanceTime({ hre, timestamp: grant.cliff2Time });
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
      const { lNori, hre, grant } = await setupWithGrant();
      const { investor1 } = hre.namedAccounts;
      const addr1Signer = hre.namedSigners.investor1;
      await advanceTime({ hre, timestamp: grant.cliff1Time });
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
      const { lNori, hre, grant } = await setupWithGrant();
      const { investor1 } = await hre.getNamedAccounts();
      await advanceTime({
        hre,
        timestamp:
          grant.cliff2Time + (grant.vestEndTime - grant.cliff2Time) / 2,
      });
      expect(await lNori.unlockedBalanceOf(investor1)).to.equal(
        CLIFF1_AMOUNT.add(CLIFF2_AMOUNT).add(
          GRANT_AMOUNT.sub(CLIFF1_AMOUNT).sub(CLIFF2_AMOUNT).div(2)
        )
      );
    });

    it('Should unlock the full grant at endtime', async () => {
      // now == endTime
      const { bpNori, lNori, grantAmount, grant, hre } = await setupWithGrant();
      const { investor1 } = hre.namedAccounts;
      const { investor1: investor1Signer } = hre.namedSigners;
      await advanceTime({ hre, timestamp: grant.unlockEndTime });
      expect(await lNori.balanceOf(investor1)).to.equal(grantAmount);
      expect(await lNori.vestedBalanceOf(investor1)).to.equal(grantAmount);
      expect(await lNori.unlockedBalanceOf(investor1)).to.equal(grantAmount);
      const withdrawlAmount = hre.ethers.utils.parseUnits((100).toString());
      expect(
        await lNori
          .connect(investor1Signer)
          .withdrawTo(investor1, withdrawlAmount)
      )
        .to.emit(lNori, 'TokensClaimed')
        .withArgs(investor1, investor1, withdrawlAmount)
        .to.emit(lNori, 'Burned')
        .withArgs(investor1, investor1, withdrawlAmount, '0x', '0x')
        .to.emit(lNori, 'Transfer')
        .withArgs(investor1, hre.ethers.constants.AddressZero, withdrawlAmount)
        .to.emit(bpNori, 'Sent')
        .withArgs(
          lNori.address,
          lNori.address,
          investor1,
          withdrawlAmount,
          '0x',
          '0x'
        )
        .to.emit(bpNori, 'Transfer')
        .withArgs(lNori.address, investor1, withdrawlAmount);
      expect(await lNori.balanceOf(investor1)).to.equal(
        grantAmount.sub(withdrawlAmount)
      );
      expect(await lNori.vestedBalanceOf(investor1)).to.equal(
        grantAmount.sub(withdrawlAmount)
      );
      expect(await lNori.unlockedBalanceOf(investor1)).to.equal(
        grantAmount.sub(withdrawlAmount)
      );
      expect(
        await lNori
          .connect(investor1Signer)
          .withdrawTo(investor1, grantAmount.sub(withdrawlAmount))
      ).to.emit(lNori, 'Transfer');
      expect(await lNori.balanceOf(investor1)).to.equal(0);
      expect(await lNori.vestedBalanceOf(investor1)).to.equal(0);
      expect(await lNori.unlockedBalanceOf(investor1)).to.equal(0);
    });

    it('Should treat unlock lagging vest schedules correctly at end of vest', async () => {
      // now == endTime
      const { lNori, grant, grantAmount, hre } = await setupWithGrant(
        (params) => employeeParams(params)
      );
      const { namedAccounts } = hre;
      await advanceTime({ hre, timestamp: grant.vestEndTime });
      expect(await lNori.balanceOf(namedAccounts.employee)).to.equal(
        grantAmount
      );
      expect(await lNori.vestedBalanceOf(namedAccounts.employee)).to.equal(
        GRANT_AMOUNT
      );
      expect(await lNori.unlockedBalanceOf(namedAccounts.employee)).to.equal(
        '822222222222222222222' // todo double check
      );
    });

    it('Should treat larger vest cliffs than unlock cliffs correctly', async () => {
      // now == cliff1
      const { lNori, grant, hre } = await setupWithGrant((params) =>
        employeeParams(params)
      );
      const { employee } = await hre.getNamedAccounts();

      await advanceTime({ hre, timestamp: grant.cliff1Time });
      expect(await lNori.balanceOf(employee)).to.equal(GRANT_AMOUNT);
      expect(await lNori.vestedBalanceOf(employee)).to.equal(
        grant.vestCliff1Amount
      );
      expect(await lNori.unlockedBalanceOf(employee)).to.equal(
        grant.unlockCliff1Amount
      );
    });

    it('Should handle a linear unlock with funding lagging vesting', async () => {
      const { lNori, bpNori, grantAmount, grant, hre } =
        await setupGrantWithDirectCall();
      const userData = await hre.ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256'],
        [grant.recipient, 0]
      );
      await advanceTime({ hre, timestamp: grant.startTime + DELTA });

      expect(await lNori.balanceOf(grant.recipient)).to.equal(0);
      expect(await lNori.vestedBalanceOf(grant.recipient)).to.be.gt(0);
      expect(await lNori.unlockedBalanceOf(grant.recipient)).to.be.gt(0);

      expect(await bpNori.send(lNori.address, GRANT_AMOUNT.div(2), userData));
      expect(await lNori.balanceOf(grant.recipient)).to.equal(
        grantAmount.div(2)
      );
      expect(await lNori.vestedBalanceOf(grant.recipient)).to.be.gt(0);
      expect(await lNori.unlockedBalanceOf(grant.recipient)).to.be.gt(0);

      await bpNori.send(lNori.address, grantAmount.div(2), userData);
      await advanceTime({ hre, timestamp: grant.startTime + END_OFFSET / 4 });
      expect(await lNori.balanceOf(grant.recipient)).to.equal(grantAmount);
      expect(await lNori.vestedBalanceOf(grant.recipient)).to.equal(
        grantAmount.div(4)
      );
      expect(await lNori.unlockedBalanceOf(grant.recipient)).to.equal(
        grantAmount.div(4)
      );

      await advanceTime({ hre, timestamp: grant.startTime + END_OFFSET / 2 });
      expect(await lNori.balanceOf(grant.recipient)).to.equal(grantAmount);
      expect(await lNori.vestedBalanceOf(grant.recipient)).to.equal(
        grantAmount.div(2)
      );
      expect(await lNori.unlockedBalanceOf(grant.recipient)).to.equal(
        grantAmount.div(2)
      );

      await advanceTime({ hre, timestamp: grant.startTime + END_OFFSET });
      expect(await lNori.balanceOf(grant.recipient)).to.equal(grantAmount);
      expect(await lNori.vestedBalanceOf(grant.recipient)).to.equal(
        grantAmount
      );
      expect(await lNori.unlockedBalanceOf(grant.recipient)).to.equal(
        grantAmount
      );
    });
  });

  describe('Unlocking without vesting', () => {
    it('Should unlock cliff1', async () => {
      // cliff1 < now < cliff2
      const { lNori, hre, grant } = await setupWithGrant((params) =>
        investorParams(params)
      );
      const { investor1 } = hre.namedAccounts;
      await advanceTime({ hre, timestamp: grant.cliff1Time + DELTA });
      expect(await lNori.unlockedBalanceOf(investor1)).to.equal(CLIFF1_AMOUNT);
      expect(await lNori.vestedBalanceOf(investor1)).to.equal(GRANT_AMOUNT);
      expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    });
  });

  describe('withdrawTo', () => {
    it('Can withdraw to a different address', async () => {
      // cliff1 < now < cliff2
      const { bpNori, lNori, hre, grant } = await setupWithGrant((params) =>
        investorParams(params)
      );
      const { investor1, employee } = hre.namedAccounts;
      await advanceTime({ hre, timestamp: grant.cliff1Time + DELTA });
      expect(await lNori.unlockedBalanceOf(investor1)).to.equal(CLIFF1_AMOUNT);
      expect(await lNori.vestedBalanceOf(investor1)).to.equal(GRANT_AMOUNT);
      expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);

      const bpNoriSupplyBeforeWithdrawl = await bpNori.totalSupply();

      await expect(
        lNori
          .connect(hre.namedSigners.investor1)
          .withdrawTo(employee, CLIFF1_AMOUNT)
      )
        .to.emit(lNori, 'TokensClaimed')
        .withArgs(investor1, employee, CLIFF1_AMOUNT);
      // await hre.network.provider.send('evm_mine'); // todo remove?

      expect(await lNori.totalSupply()).to.equal(
        GRANT_AMOUNT.sub(CLIFF1_AMOUNT)
      );
      expect(await lNori.balanceOf(investor1)).to.equal(
        GRANT_AMOUNT.sub(CLIFF1_AMOUNT)
      );
      expect(await lNori.unlockedBalanceOf(investor1)).to.equal(0);
      expect(await lNori.vestedBalanceOf(investor1)).to.equal(
        GRANT_AMOUNT.sub(CLIFF1_AMOUNT)
      );

      expect(await bpNori.totalSupply()).to.equal(bpNoriSupplyBeforeWithdrawl);
      expect(await bpNori.balanceOf(investor1)).to.equal(0);
      expect(await bpNori.balanceOf(employee)).to.equal(CLIFF1_AMOUNT);
    });
  });

  describe('batchRevokeUnvestedTokenAmounts', () => {
    it('Should revoke *all* unvested tokens by specifying 0 as the amount', async () => {
      // now == CLIFF2
      const { bpNori, lNori, grantAmount, grant, hre } = await setupWithGrant(
        (params) => employeeParams(params)
      );
      const { employee, admin } = hre.namedAccounts;
      await advanceTime({
        hre,
        timestamp: grant.startTime + VEST_REVOKED_OFFSET - DELTA,
      });
      expect(await lNori.balanceOf(employee)).to.equal(grantAmount);
      const newBalance = VESTED_BALANCE_AFTER_REVOCATION;
      const quantityRevoked = grantAmount.sub(newBalance);
      expect(await bpNori.balanceOf(admin)).to.eq(
        INITIAL_SUPPLY.sub(grantAmount)
      );

      expect(await lNori.vestedBalanceOf(employee)).to.be.lt(newBalance);
      await expect(
        lNori
          .connect(await hre.ethers.getSigner(admin))
          .batchRevokeUnvestedTokenAmounts(
            [employee],
            [admin],
            [grant.startTime + VEST_REVOKED_OFFSET],
            [0]
          )
      )
        .to.emit(lNori, 'UnvestedTokensRevoked')
        .withArgs(
          grant.startTime + VEST_REVOKED_OFFSET,
          employee,
          quantityRevoked
        )
        .to.emit(lNori, 'Burned')
        .withArgs(
          hre.namedAccounts.admin,
          hre.namedAccounts.employee,
          quantityRevoked,
          '0x',
          '0x'
        )
        .to.emit(lNori, 'Transfer')
        .withArgs(
          hre.namedAccounts.employee,
          hre.ethers.constants.AddressZero,
          quantityRevoked
        )
        .to.emit(bpNori, 'Sent')
        .withArgs(
          lNori.address,
          lNori.address,
          hre.namedAccounts.admin,
          quantityRevoked,
          '0x',
          '0x'
        )
        .to.emit(bpNori, 'Transfer')
        .withArgs(lNori.address, hre.namedAccounts.admin, quantityRevoked);

      await advanceTime({
        hre,
        timestamp: grant.startTime + VEST_REVOKED_OFFSET,
      });

      expect(await lNori.vestedBalanceOf(employee)).to.equal(newBalance);
      expect(await lNori.balanceOf(employee)).to.equal(newBalance);

      expect(await lNori.totalSupply()).to.eq(newBalance);
      expect(await lNori.unlockedBalanceOf(employee)).to.eq(
        formatTokenAmount(600)
      );

      expect(await bpNori.balanceOf(admin)).to.eq(
        INITIAL_SUPPLY.sub(newBalance)
      );

      // TODO: Might be worth reworking the times in all these fixtures
      // with actual seconds and calculate these thresholds more carefully.
      await advanceTime({
        hre,
        timestamp:
          grant.startTime + FULLY_UNLOCKED_AFTER_REVOCATION_OFFSET - DELTA,
      });
      expect(await lNori.unlockedBalanceOf(employee)).to.be.lt(newBalance);

      await advanceTime({
        hre,
        timestamp:
          grant.startTime + FULLY_UNLOCKED_AFTER_REVOCATION_OFFSET + DELTA,
      });
      expect(await lNori.unlockedBalanceOf(employee)).to.be.eq(newBalance);
    });

    it('Should revoke a specific amount of unvested tokens and use the block timestamp as the revocation time by specifying 0', async () => {
      const { lNori, grantAmount, hre, grant } = await setupWithGrant(
        (params) => employeeParams(params)
      );
      const { employee, admin } = hre.namedAccounts;
      const quantityToRevoke = 1_000;
      const newBalance = grantAmount.sub(quantityToRevoke);
      await advanceTime({
        hre,
        timestamp: grant.startTime + VEST_REVOKED_OFFSET,
      });
      await expect(
        lNori
          .connect(await hre.ethers.getSigner(admin))
          .batchRevokeUnvestedTokenAmounts(
            [employee],
            [admin],
            [0],
            [quantityToRevoke]
          )
      )
        .to.emit(lNori, 'UnvestedTokensRevoked') // todo test that the revocation timestamp is the block timestamp
        .withArgs(expect(Number), employee, quantityToRevoke);

      expect(await lNori.balanceOf(employee)).to.equal(newBalance);
      expect(await lNori.totalSupply()).to.eq(newBalance);

      // Ensures grantAmount is set correctly after a revocation
      const grantDetail = await lNori.getGrant(employee);
      expect(grantDetail.grantAmount).to.equal(
        grantAmount.sub(quantityToRevoke)
      );
      expect(grantDetail.originalAmount).to.equal(grantAmount);
    });

    it('Should revoke a specific amount of unvested tokens repeatedly', async () => {
      const { lNori, grantAmount, grant, hre } = await setupWithGrant(
        (params) => linearParams(params)
      );
      const { admin } = hre.namedAccounts;
      await advanceTime({
        hre,
        timestamp: grant.startTime + DELTA,
      });
      const quantityToRevoke = 100;
      const newBalance = grantAmount.sub(quantityToRevoke);
      await expect(
        lNori
          .connect(await hre.ethers.getSigner(admin))
          .batchRevokeUnvestedTokenAmounts(
            [grant.recipient],
            [admin],
            [0],
            [quantityToRevoke]
          )
      )
        .to.emit(lNori, 'UnvestedTokensRevoked')
        .withArgs(expect(Number), grant.recipient, quantityToRevoke);

      expect(await lNori.balanceOf(grant.recipient)).to.equal(newBalance);

      const postRevocationBalance = newBalance.sub(quantityToRevoke);
      await expect(
        lNori
          .connect(await hre.ethers.getSigner(admin))
          .batchRevokeUnvestedTokenAmounts(
            [grant.recipient],
            [admin],
            [0],
            [quantityToRevoke]
          )
      )
        .to.emit(lNori, 'UnvestedTokensRevoked')
        .withArgs(expect(Number), grant.recipient, quantityToRevoke);

      expect(await lNori.balanceOf(grant.recipient)).to.equal(
        postRevocationBalance
      );
      expect(await lNori.totalSupply()).to.eq(postRevocationBalance);

      // Ensures grantAmount is set correctly after a revocation
      const postRevocationGrantDetails = await lNori.getGrant(grant.recipient);
      expect(postRevocationGrantDetails.grantAmount).to.equal(
        postRevocationBalance
      );
      expect(postRevocationGrantDetails.originalAmount).to.equal(grantAmount);
    });

    it('Should revert when revoking more than remain unvested', async () => {
      const { lNori, grantAmount, grant, hre } = await setupWithGrant(
        (params) => employeeParams(params)
      );
      const { namedAccounts } = hre;
      const quantityToRevoke = grantAmount.add(1);
      await expect(
        lNori
          .connect(await hre.ethers.getSigner(namedAccounts.admin))
          .batchRevokeUnvestedTokenAmounts(
            [grant.recipient],
            [namedAccounts.admin],
            [0],
            [quantityToRevoke]
          )
      ).to.revertedWith('lNORI: too few unvested tokens');
      expect(await lNori.balanceOf(grant.recipient)).to.equal(grantAmount);
      expect(await lNori.totalSupply()).to.eq(grantAmount);
    });

    it('Should revert when revoking in the past', async () => {
      const { lNori, grantAmount, grant, hre } = await setupWithGrant(
        (params) => linearParams(params)
      );
      const { namedAccounts } = hre;
      await expect(
        lNori
          .connect(await hre.ethers.getSigner(namedAccounts.admin))
          .batchRevokeUnvestedTokenAmounts(
            [grant.recipient],
            [namedAccounts.admin],
            [grant.startTime - DELTA],
            [0]
          )
      ).to.revertedWith('lNORI: Revocation cannot be in the past');
      expect(await lNori.balanceOf(grant.recipient)).to.equal(grantAmount);
      expect(await lNori.totalSupply()).to.eq(grantAmount);
    });
    it('Should revert when revoking from a non-vesting grant', async () => {
      const { lNori, grantAmount, grant, hre } = await setupWithGrant(
        (params) => investorParams(params)
      );
      const { namedAccounts } = hre;
      await expect(
        lNori
          .connect(hre.namedSigners.admin)
          .batchRevokeUnvestedTokenAmounts(
            [grant.recipient],
            [namedAccounts.admin],
            [0],
            [100]
          )
      ).to.revertedWith('lNORI: no vesting schedule for this grant');
      expect(await lNori.balanceOf(grant.recipient)).to.equal(grantAmount);
      expect(await lNori.totalSupply()).to.eq(grantAmount);
    });
  });

  it('Should return details of a grant', async () => {
    const { lNori, grant, grantAmount, hre } = await setupWithGrant((params) =>
      employeeParams(params)
    );
    const { employee } = hre.namedAccounts;
    const grantFromContract = await lNori.getGrant(employee);
    expect(grantFromContract.grantAmount).to.eq(grantAmount);
    expect(grantFromContract.recipient).to.eq(employee);
    expect(grantFromContract.startTime).to.eq(grant.startTime);
    expect(grantFromContract.vestEndTime).to.eq(grant.vestEndTime);
    expect(grantFromContract.unlockEndTime).to.eq(grant.unlockEndTime);
    expect(grantFromContract.cliff1Time).to.eq(grant.cliff1Time);
    expect(grantFromContract.cliff2Time).to.eq(grant.cliff2Time);
    expect(grantFromContract.vestCliff1Amount).to.eq(grant.vestCliff1Amount);
    expect(grantFromContract.vestCliff2Amount).to.eq(grant.vestCliff2Amount);
    expect(grantFromContract.unlockCliff1Amount).to.eq(
      grant.unlockCliff1Amount
    );
    expect(grantFromContract.unlockCliff2Amount).to.eq(
      grant.unlockCliff2Amount
    );
    expect(grantFromContract.claimedAmount).to.eq(BigNumber.from(0));
    expect(grantFromContract.originalAmount).to.eq(grantAmount);
    expect(grantFromContract.lastRevocationTime).to.eq(BigNumber.from(0));
    expect(grantFromContract.lastQuantityRevoked).to.eq(BigNumber.from(0));
  });
  describe('Creating vesting schedules in a batch', () => {
    it('should be able to create multiple vesting schedules in a single transaction', async () => {
      const { bpNori, lNori, hre } = await setupTest();
      const defaults = defaultParams({
        hre,
        startTime: await getLatestBlockTime({ hre }),
      });
      const { grantAmount, grant } = {
        grantAmount: defaults.grantAmount,
        grant: defaults.grant,
      } as TokenGrantOptions;
      const buildUserData = ({ recipient }: { recipient: string }): string => {
        return hre.ethers.utils.defaultAbiCoder.encode(
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
            recipient,
            grant.startTime,
            grant.vestEndTime,
            grant.unlockEndTime,
            grant.cliff1Time,
            grant.cliff2Time,
            grant.vestCliff1Amount,
            grant.vestCliff2Amount,
            grant.unlockCliff1Amount,
            grant.unlockCliff2Amount,
          ]
        );
      };
      const unnamedAccounts = await ethers.provider.listAccounts();
      const recipients = [...Array(10)].map((_) => lNori.address);
      const amounts = [...Array(10)].map((_) => grantAmount);
      const userData = [...Array(10)].map((_, i) =>
        buildUserData({ recipient: unnamedAccounts[i] })
      ); // todo
      const operatorData = [...Array(10)].map((_) => '0x');
      const requireReceptionAck = [...Array(10)].map((_) => true);
      await expect(
        bpNori.batchSend(
          recipients,
          amounts,
          userData,
          operatorData,
          requireReceptionAck
        )
      )
        .to.emit(bpNori, 'SentBatch')
        .withArgs(
          hre.namedAccounts.admin,
          recipients,
          amounts,
          userData,
          operatorData,
          requireReceptionAck
        );
    });
    // todo batch createGrant
    // todo batch withdraw
    // todo balanceOfBatch
    // todo emit revoked tokens event multiple times
  });
});
