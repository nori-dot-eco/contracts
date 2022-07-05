import { ethers, constants } from 'ethers';

export const FINNEY = ethers.utils.parseUnits('1', 'finney');
export const { Zero, MaxUint256, AddressZero } = constants;
