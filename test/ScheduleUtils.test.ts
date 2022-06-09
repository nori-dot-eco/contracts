import type { BigNumberish } from 'ethers';

import { expect } from '@/test/helpers';
import type { ScheduleTestHarness } from '@/typechain-types';

const NOW = Math.floor(Date.now() / 1000);

const setupTest = hre.deployments.createFixture(
  async (
    hre
  ): Promise<{
    scheduleTestHarness: ScheduleTestHarness;
  }> => {
    const ScheduleTestHarness = await hre.ethers.getContractFactory(
      'ScheduleTestHarness' as unknown as ContractNames
    );
    const scheduleTestHarness =
      (await ScheduleTestHarness.deploy()) as ScheduleTestHarness;
    return {
      scheduleTestHarness,
    };
  }
);

describe('ScheduleUtils', () => {
  it('Should create a simple Schedule', async () => {
    const { scheduleTestHarness: harness } = await setupTest();
    expect(harness.create(NOW, NOW + 86_400, 1_000_000))
      .to.emit(harness, 'ScheduleCreated')
      .withArgs(0, NOW, NOW + 86_400, 1_000_000);
    const schedule: BigNumberish = 0;
    expect(await harness.availableAmount(schedule, 0)).to.equal(0);
    expect(await harness.availableAmount(schedule, NOW - 1)).to.equal(0);
    expect(await harness.availableAmount(schedule, NOW + 86_400)).to.equal(
      1_000_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86_400 / 2)).to.equal(
      1_000_000 / 2
    );
    expect(
      await harness.availableAmount(schedule, NOW + 365 * 86_400)
    ).to.equal(1_000_000);
  });

  it('Should create a Schedule with one linear cliff', async () => {
    const { scheduleTestHarness: harness } = await setupTest();
    await harness.create(NOW, NOW + 86_400, 1_000_000);
    const schedule = 0;
    expect(harness.addCliff(schedule, NOW + 86_400 / 4, 250_000))
      .to.emit(harness, 'CliffAdded')
      .withArgs(0, NOW + 86_400 / 4, 250_000);
    expect(await harness.availableAmount(schedule, NOW - 1)).to.equal(0);
    expect(
      await harness.availableAmount(schedule, NOW + 86_400 / 4 - 1)
    ).to.equal(0);
    expect(await harness.availableAmount(schedule, NOW + 86_400 / 4)).to.equal(
      250_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86_400)).to.equal(
      1_000_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86_400 / 2)).to.equal(
      1_000_000 / 2
    );
  });

  it('Should create a Schedule with one sub-linear cliff', async () => {
    const { scheduleTestHarness: harness } = await setupTest();
    await harness.create(NOW, NOW + 86_400, 1_000_000);
    const schedule = 0;
    await harness.addCliff(schedule, NOW + 86_400 / 2, 250_000);
    expect(await harness.availableAmount(schedule, NOW - 1)).to.equal(0);
    expect(
      await harness.availableAmount(schedule, NOW + 86_400 / 2 - 1)
    ).to.equal(0);
    expect(await harness.availableAmount(schedule, NOW + 86_400 / 2)).to.equal(
      250_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86_400)).to.equal(
      1_000_000
    );
    expect(
      await harness.availableAmount(schedule, NOW + 86_400 * (3 / 4))
    ).to.equal(250_000 + 750_000 / 2);
  });

  it('Should create a Schedule with multiple cliffs', async () => {
    const { scheduleTestHarness: harness } = await setupTest();
    await harness.create(NOW, NOW + 86_400, 1_000_000);
    const schedule = 0;
    await harness.addCliff(schedule, NOW + 86_400 / 10, 100_000);
    expect(harness.addCliff(schedule, NOW + 86_400 / 5, 100_000))
      .to.emit(harness, 'CliffAdded')
      .withArgs(1, NOW + 86_400 / 5, 100_000);
    expect(await harness.availableAmount(schedule, NOW - 1)).to.equal(0);
    expect(
      await harness.availableAmount(schedule, NOW + 86_400 / 10 - 1)
    ).to.equal(0);
    expect(await harness.availableAmount(schedule, NOW + 86_400 / 10)).to.equal(
      100_000
    );
    expect(
      await harness.availableAmount(schedule, NOW + 86_400 / 5 - 1)
    ).to.equal(100_000);
    expect(await harness.availableAmount(schedule, NOW + 86_400 / 5)).to.equal(
      200_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86_400)).to.equal(
      1_000_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86_400 / 2)).to.equal(
      500_000
    );
  });

  it('Should handle truncation of the schedule amount', async () => {
    const { scheduleTestHarness: harness } = await setupTest();
    await harness.create(NOW, NOW + 86_400, 1_000_000);
    const schedule = 0;
    expect(harness.addCliff(schedule, NOW + 86_400 / 4, 250_000))
      .to.emit(harness, 'CliffAdded')
      .withArgs(0, NOW + 86_400 / 4, 250_000);
    expect(harness.addCliff(schedule, NOW + 86_400 / 2, 250_000))
      .to.emit(harness, 'CliffAdded')
      .withArgs(1, NOW + 86_400 / 2, 250_000);
    expect(await harness.availableAmount(schedule, NOW + 86_400 / 3)).to.equal(
      250_000
    );

    expect(harness.truncateScheduleAmount(schedule, NOW + 86_400 / 3))
      .to.emit(harness, 'ScheduleTruncated')
      .withArgs(schedule, 250_000);
    expect(await harness.availableAmount(schedule, NOW + 86_400 / 2)).to.equal(
      250_000
    );
    expect(await harness.availableAmount(schedule, NOW + 86_400)).to.equal(
      250_000
    );
  });
});
