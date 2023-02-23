import type { ContractTransaction } from 'ethers';
import { BigNumber } from 'ethers';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';

import type { BridgedPolygonNORI, LockedNORI } from '@/typechain-types';
import {
  expect,
  setupTest,
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
interface BuildTokenGrantOptionFunctionParameters {
  hre: HardhatRuntimeEnvironment;
  startTime: number;
}

type BuildTokenGrantOptionFunction = (
  parameters: BuildTokenGrantOptionFunctionParameters
) => DeepPartial<TokenGrantOptions>;

interface PausableFunctionParameters {
  lNori: LockedNORI;
  hre: HardhatRuntimeEnvironment;
}

const NOW = Math.floor(Date.now() / 1000);

const CLIFF1_AMOUNT = formatTokenAmount(100);
const CLIFF2_AMOUNT = formatTokenAmount(100);
const CLIFF1_OFFSET = 5000;
const CLIFF2_OFFSET = 10_000;
const END_OFFSET = 100_000;
const DELTA = 1000; // useful offset to place time before / after the inflection points
const GRANT_AMOUNT = formatTokenAmount(1000);
const INITIAL_SUPPLY = formatTokenAmount(100_000_000); // comes from polygon helper

const createGrant = async (
  grant: TokenGrantUserData,
  grantAmount: BigNumber,
  lNori: LockedNORI,
  bpNori: BridgedPolygonNORI,
  hre: HardhatRuntimeEnvironment
): Promise<ContractTransaction> => {
  const { namedAccounts, ethers } = hre;
  const { admin } = namedAccounts;
  const userData = ethers.utils.defaultAbiCoder.encode(
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
      grant.recipient,
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
  const eip712Domain = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };
  const signer = await ethers.getSigner(admin);
  const latestBlock = await signer.provider?.getBlock('latest');
  const deadline = latestBlock!.timestamp + 3600; // one hour into the future
  const owner = await signer.getAddress();
  const name = await bpNori.name();
  const nonce = await bpNori.nonces(owner);
  const chainId = await signer.getChainId();
  const signature = await signer._signTypedData(
    {
      name,
      version: '1',
      chainId,
      verifyingContract: bpNori.address,
    },
    eip712Domain,
    {
      owner,
      spender: lNori.address,
      value: grantAmount,
      nonce,
      deadline,
    }
  );
  const { v, r, s } = ethers.utils.splitSignature(signature);
  return lNori.batchCreateGrants([grantAmount], [userData], deadline, v, r, s);
};

const defaultParameters = ({
  startTime = NOW, // todo use await getLatestBlockTime({hre}) instead
  hre,
}: {
  startTime?: number;
  hre: HardhatRuntimeEnvironment;
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

const employeeParameters = ({
  startTime = NOW, // todo use await getLatestBlockTime({hre}) instead
  hre,
}: {
  startTime?: number;
  hre: HardhatRuntimeEnvironment;
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

const investorParameters = ({
  startTime = NOW,
  hre,
}: {
  startTime?: number;
  hre: HardhatRuntimeEnvironment;
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

const linearParameters = ({
  startTime = NOW, // todo use await getLatestBlockTime({hre}) instead
  hre,
}: {
  startTime?: number;
  hre: HardhatRuntimeEnvironment;
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

const setupWithGrant = async (
  _options: DeepPartial<TokenGrantOptions> | BuildTokenGrantOptionFunction = {}
): Promise<Awaited<ReturnType<typeof setupTest>> & TokenGrantOptions> => {
  const { bpNori, lNori, hre, ...rest } = await setupTest();
  const options: DeepPartial<TokenGrantOptions> =
    typeof _options === 'function'
      ? _options({ hre, startTime: await getLatestBlockTime({ hre }) })
      : _options;
  const defaults = defaultParameters({
    hre,
    startTime: await getLatestBlockTime({ hre }),
  });
  const { namedAccounts, ethers } = hre;
  const { admin } = namedAccounts;
  const { grantAmount, grant } = {
    grantAmount: options?.grantAmount ?? defaults.grantAmount,
    grant: {
      ...defaults.grant,
      ...options.grant,
    },
  } as TokenGrantOptions;

  await expect(createGrant(grant, grantAmount, lNori, bpNori, hre))
    .to.emit(lNori, 'TokenGrantCreated')
    .withArgs(
      grant.recipient,
      grantAmount,
      grant.startTime,
      grant.vestEndTime,
      grant.unlockEndTime
    )
    .to.emit(lNori, 'Mint')
    .withArgs(ethers.constants.AddressZero, grant.recipient, grantAmount)
    .to.emit(bpNori, 'Transfer')
    .withArgs(admin, lNori.address, grantAmount);

  await expect(bpNori.approve(lNori.address, grantAmount))
    .to.emit(bpNori, 'Approval')
    .withArgs(admin, lNori.address, grantAmount);
  expect(await bpNori.allowance(admin, lNori.address)).to.eq(grantAmount);

  return { bpNori, lNori, grant, grantAmount, hre, ...rest };
};

describe('LockedNORI', () => {
  describe('when paused', () => {
    for (const { method, pausableFunction, postSetupHook } of [
      {
        method: 'approve',
        pausableFunction: async ({
          lNori,
          hre,
        }: PausableFunctionParameters) => {
          return lNori
            .connect(hre.namedSigners.investor1)
            .approve(hre.namedAccounts.investor2, formatTokenAmount(1));
        },
        postSetupHook: undefined,
      },
      {
        method: 'grantRole',
        pausableFunction: async ({
          lNori,
          hre,
        }: PausableFunctionParameters) => {
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
        pausableFunction: async ({
          lNori,
          hre,
        }: PausableFunctionParameters) => {
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
        pausableFunction: async ({
          lNori,
          hre,
        }: PausableFunctionParameters) => {
          return lNori
            .connect(hre.namedSigners.admin)
            .revokeRole(
              hre.ethers.utils.id('MINTER_ROLE'),
              hre.namedAccounts.admin
            );
        },
        postSetupHook: async ({ lNori, hre }: PausableFunctionParameters) => {
          await lNori
            .connect(hre.namedSigners.admin)
            .grantRole(
              hre.ethers.utils.id('MINTER_ROLE'),
              hre.namedAccounts.noriWallet
            );
        },
      },
    ] as const) {
      it(`will disable the function ${method}`, async () => {
        const { lNori, hre } = await setupTest();
        if (typeof postSetupHook === 'function') {
          await postSetupHook({ lNori, hre });
        }
        await lNori.connect(hre.namedSigners.admin).pause();
        await expect(pausableFunction({ lNori, hre })).revertedWith(
          'Pausable: paused'
        );
      });
    }

    it(`will not allow tokens to be deposited when the contract is paused`, async () => {
      const { lNori, bpNori, hre } = await setupTest();
      const { namedSigners } = hre;

      await expect(lNori.connect(namedSigners.admin).pause()).to.emit(
        lNori,
        'Paused'
      );
      const { grant, grantAmount } = employeeParameters({
        hre,
        startTime: await getLatestBlockTime({ hre }),
      });

      await expect(
        createGrant(grant, grantAmount, lNori, bpNori, hre)
      ).revertedWith('Pausable: paused');
    });
  });

  it(`will not allow tokens to be withdrawn when the contract is paused`, async () => {
    const { lNori, grant, hre } = await setupWithGrant();
    const { namedAccounts, namedSigners } = hre;

    await advanceTime({ hre, timestamp: grant.unlockEndTime });

    await expect(lNori.connect(namedSigners.admin).pause()).to.emit(
      lNori,
      'Paused'
    );

    await expect(
      lNori
        .connect(namedSigners.supplier)
        .withdrawTo(namedAccounts.supplier, formatTokenAmount(1))
    ).revertedWith('Pausable: paused');
  });
});

describe('initialization', () => {
  describe('roles', () => {
    for (const { role } of [
      { role: 'DEFAULT_ADMIN_ROLE' },
      { role: 'PAUSER_ROLE' },
      { role: 'TOKEN_GRANTER_ROLE' },
    ] as const) {
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
    }
  });
});

describe('role access', () => {
  describe('roles', () => {
    describe('TOKEN_GRANTER_ROLE', () => {
      for (const { role, accountWithRole, accountWithoutRole } of [
        {
          role: 'TOKEN_GRANTER_ROLE',
          accountWithRole: 'admin',
          accountWithoutRole: 'investor1',
        } as const,
      ]) {
        it(`accounts with the role "${role}" can use "batchRevokeUnvestedTokenAmounts" whilst accounts without the role "${role}" cannot`, async () => {
          const { lNori, grantAmount, grant, hre } = await setupWithGrant(
            (parameters) => employeeParameters(parameters)
          );
          const { namedAccounts, namedSigners } = hre;
          const roleId = await lNori[role]();
          expect(await lNori.hasRole(roleId, namedAccounts[accountWithRole])).to
            .be.true;
          await expect(
            lNori
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
      }
    });
  });
});

describe('getRoleAdmin', () => {
  for (const { role } of [
    { role: 'DEFAULT_ADMIN_ROLE' },
    { role: 'PAUSER_ROLE' },
    { role: 'TOKEN_GRANTER_ROLE' },
  ] as const) {
    it(`will assign the admin of the role ${role} to the DEFAULT_ADMIN_ROLE role`, async () => {
      const { lNori } = await setupTest();
      expect(await lNori.getRoleAdmin(await lNori[role]())).to.eq(
        await lNori.DEFAULT_ADMIN_ROLE()
      );
    });
  }
});

describe('authorizeOperator', () => {
  it(`Will revert with operator actions disabled`, async () => {
    const { lNori, hre } = await setupWithGrant();
    await expect(
      lNori
        .connect(hre.namedSigners.investor1)
        .authorizeOperator(hre.namedAccounts.investor2)
    ).to.revertedWith('lNORI: operator actions disabled');
  });
});

describe('unlockedBalanceOf', () => {
  it('returns zero before startTime', async () => {
    const { lNori, grantAmount, hre } = await setupWithGrant();
    const { investor1 } = await hre.getNamedAccounts();
    expect(await lNori.balanceOf(investor1)).to.equal(grantAmount);
    expect(await lNori.vestedBalanceOf(investor1)).to.equal(0);
    expect(await lNori.unlockedBalanceOf(investor1)).to.equal(0);
    const grant = await lNori.getGrant(investor1);
    expect(grant.grantAmount).to.equal(grantAmount);
    await expect(
      lNori
        .connect(await hre.ethers.getSigner(investor1))
        .withdrawTo(investor1, grantAmount)
    ).to.be.revertedWith('lNORI: insufficient balance');
  });
});

describe('grantRole', () => {
  it('should fail to grant TOKEN_GRANTER_ROLE to an address having a grant', async () => {
    const { lNori, hre } = await setupWithGrant();
    await expect(
      lNori.grantRole(
        await lNori.TOKEN_GRANTER_ROLE(),
        hre.namedAccounts.investor1
      )
    ).to.be.revertedWith('lNORI: Cannot assign role to a grant holder address');
  });
});

describe('batchCreateGrants', () => {
  it('Should fail to create a second grant for an address', async () => {
    const { lNori, bpNori, hre } = await setupTest();
    const { grant, grantAmount } = employeeParameters({
      hre,
      startTime: await getLatestBlockTime({ hre }),
    });
    await createGrant(grant, grantAmount, lNori, bpNori, hre);
    await expect(
      createGrant(grant, grantAmount, lNori, bpNori, hre)
    ).to.be.revertedWith('lNORI: Grant already exists');
  });

  it('Should fail to create a grant for an address having TOKEN_GRANTER_ROLE', async () => {
    const { lNori, bpNori, hre } = await setupTest();
    const { grant, grantAmount } = employeeParameters({
      hre,
      startTime: await getLatestBlockTime({ hre }),
    });
    grant.recipient = hre.namedAccounts.admin; // has TOKEN_GRANTER_ROLE
    await expect(
      createGrant(grant, grantAmount, lNori, bpNori, hre)
    ).to.be.revertedWith('lNORI: Recipient cannot be grant admin');
  });
});

describe('locked tokens', () => {
  it('Should fail to *send*', async () => {
    const { lNori, bpNori, hre } = await setupWithGrant();
    const { investor1, investor2 } = await hre.getNamedAccounts();
    const addr1Signer = await hre.ethers.getSigner(investor1);
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    await expect(
      lNori.connect(addr1Signer).send(investor2, 1, '0x')
    ).to.be.revertedWith('lNORI: send disabled');
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT);
    expect(await bpNori.balanceOf(investor1)).to.equal(0);
  });

  it('Should fail to *transfer*', async () => {
    const { lNori, bpNori, hre } = await setupWithGrant();
    const { investor1, investor2 } = await hre.getNamedAccounts();
    const addr1Signer = await hre.ethers.getSigner(investor1);
    await expect(
      lNori.connect(addr1Signer).transfer(investor2, 1)
    ).to.be.revertedWith('lNORI: transfer disabled');
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT);
    expect(await bpNori.balanceOf(investor1)).to.equal(0);
  });

  it('Should fail to *operatorSend*', async () => {
    const { lNori, bpNori } = await setupWithGrant();
    const { admin, investor1, investor2, hre } = await hre.getNamedAccounts();
    const addr1Signer = await hre.ethers.getSigner(investor1);
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    await expect(
      lNori.connect(addr1Signer).authorizeOperator(admin)
    ).to.be.revertedWith('lNORI: operator actions disabled');
    await expect(
      lNori.operatorSend(investor1, investor2, 1, '0x', '0x')
    ).to.be.revertedWith('lNORI: operatorSend disabled');
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT);
    expect(await bpNori.balanceOf(investor1)).to.equal(0);
  });

  it('Should fail to *transferFrom*', async () => {
    const { lNori, bpNori } = await setupWithGrant();
    const { admin, investor1, investor2 } = await hre.getNamedAccounts();
    const addr1Signer = await hre.ethers.getSigner(investor1);
    expect(await lNori.balanceOf(investor1)).to.equal(GRANT_AMOUNT);
    await expect(
      lNori.connect(addr1Signer).approve(admin, 1)
    ).to.be.revertedWith('lNORI: operator actions disabled');
    await expect(
      lNori.transferFrom(investor1, investor2, 1)
    ).to.be.revertedWith('lNORI: transferFrom disabled');
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

  it('Should unlock smoothly after cliff2', async () => {
    // cliff2 < now < endTime
    const { lNori, hre, grant } = await setupWithGrant();
    const { investor1 } = await hre.getNamedAccounts();
    await advanceTime({
      hre,
      timestamp: grant.cliff2Time + (grant.vestEndTime - grant.cliff2Time) / 2,
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
    await expect(
      lNori.connect(investor1Signer).withdrawTo(investor1, withdrawlAmount)
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
    await expect(
      lNori
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
      (parameters) => employeeParameters(parameters)
    );
    const { namedAccounts } = hre;
    await advanceTime({ hre, timestamp: grant.vestEndTime });
    expect(await lNori.balanceOf(namedAccounts.employee)).to.equal(grantAmount);
    expect(await lNori.vestedBalanceOf(namedAccounts.employee)).to.equal(
      GRANT_AMOUNT
    );
    expect(await lNori.unlockedBalanceOf(namedAccounts.employee)).to.equal(
      '822222222222222222222' // todo double check
    );
  });

  it('Should treat larger vest cliffs than unlock cliffs correctly', async () => {
    // now == cliff1
    const { lNori, grant, hre } = await setupWithGrant((parameters) =>
      employeeParameters(parameters)
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
});

describe('Unlocking without vesting', () => {
  it('Should unlock cliff1', async () => {
    // cliff1 < now < cliff2
    const { lNori, hre, grant } = await setupWithGrant((parameters) =>
      investorParameters(parameters)
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
    const { bpNori, lNori, hre, grant } = await setupWithGrant((parameters) =>
      investorParameters(parameters)
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

    expect(await lNori.totalSupply()).to.equal(GRANT_AMOUNT.sub(CLIFF1_AMOUNT));
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
      (parameters) => employeeParameters(parameters)
    );
    const { ethers, namedAccounts } = hre;
    const { employee, admin } = namedAccounts;
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
        .connect(await ethers.getSigner(admin))
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
      .withArgs(admin, employee, quantityRevoked, '0x', '0x')
      .to.emit(lNori, 'Transfer')
      .withArgs(employee, ethers.constants.AddressZero, quantityRevoked)
      .to.emit(bpNori, 'Sent')
      .withArgs(
        lNori.address,
        lNori.address,
        admin,
        quantityRevoked,
        '0x',
        '0x'
      )
      .to.emit(bpNori, 'Transfer')
      .withArgs(lNori.address, admin, quantityRevoked);

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

    expect(await bpNori.balanceOf(admin)).to.eq(INITIAL_SUPPLY.sub(newBalance));

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
      (parameters) => employeeParameters(parameters)
    );
    const { employee, admin } = hre.namedAccounts;
    const quantityToRevoke = 1000;
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
    expect(grantDetail.grantAmount).to.equal(grantAmount.sub(quantityToRevoke));
    expect(grantDetail.originalAmount).to.equal(grantAmount);
  });

  it('Should revoke a specific amount of unvested tokens repeatedly', async () => {
    const { lNori, grantAmount, grant, hre } = await setupWithGrant(
      (parameters) => linearParameters(parameters)
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
      (parameters) => employeeParameters(parameters)
    );
    const { namedAccounts, namedSigners } = hre;
    const quantityToRevoke = grantAmount.add(1);
    await expect(
      lNori
        .connect(namedSigners.admin)
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
      (parameters) => linearParameters(parameters)
    );
    const { ethers, namedAccounts } = hre;
    await expect(
      lNori
        .connect(await ethers.getSigner(namedAccounts.admin))
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
      (parameters) => investorParameters(parameters)
    );
    const { namedAccounts, namedSigners } = hre;
    await expect(
      lNori
        .connect(namedSigners.admin)
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

describe('getGrant', () => {
  it('Should return details of a grant', async () => {
    const { lNori, grant, grantAmount, hre } = await setupWithGrant(
      (parameters) => employeeParameters(parameters)
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
});
