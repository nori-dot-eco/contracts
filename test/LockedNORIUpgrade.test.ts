import { ethers, upgrades } from 'hardhat';
import { setupTest } from '@/test/helpers';
import { LockedNORIV2 } from '../typechain-types';

describe('LockedNORI V1 to V2 upgrade', () => {
  it('works before and after upgrading', async function () {
    const LockedNORI = await ethers.getContractFactory('LockedNORI');
    const LockedNORIV2 = await ethers.getContractFactory('LockedNORIV2');
    const { bpNori, hre, ...rest } = await setupTest();

    const instance = await upgrades.deployProxy(
      LockedNORI,
      [(await hre.deployments.get('BridgedPolygonNORI'))!.address],
      { initializer: 'initialize(address)' }
    );
    await instance.deployed();

    const upgraded = await upgrades.upgradeProxy(instance.address, LockedNORIV2);
    const lNoriV2: LockedNORIV2 = upgraded as LockedNORIV2;
    lNoriV2.updateUnderlying(bpNori.address);
  });
});
