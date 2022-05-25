import { BigNumber } from 'ethers';

import type { EscrowedNORI } from '@/typechain-types/EscrowedNORI';
import {
  expect,
  setupTest,
  advanceTime,
  getLatestBlockTime,
} from '@/test/helpers';
import { formatTokenAmount } from '@/utils/units';

describe('EscrowedNORI', () => {
  describe('initialization', () => {
    // it.todo('should fire events');
    describe('roles', () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const { role } of [
        { role: 'DEFAULT_ADMIN_ROLE' },
        { role: 'PAUSER_ROLE' },
        { role: 'ESCROW_CREATOR_ROLE' },
      ] as const) {
        it(`will assign the role ${role} to the deployer and set the DEFAULT_ADMIN_ROLE as the role admin`, async () => {
          const { eNori, hre } = await setupTest();
          expect(
            await eNori.hasRole(await eNori[role](), hre.namedAccounts.admin)
          ).to.be.true;
          expect(await eNori.getRoleAdmin(await eNori[role]())).to.eq(
            await eNori.DEFAULT_ADMIN_ROLE()
          );
          expect(await eNori.getRoleMemberCount(await eNori[role]())).to.eq(1);
        });
      }
    });
  });
});
