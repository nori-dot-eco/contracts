import { expect } from 'chai';

import { hre } from '@/utils/hre';

it.only('vesting task', async () => {
  expect(await hre.run('vesting', { list: true })).to.be.true;
});
