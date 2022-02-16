import chaiModule from 'chai';
import { solidity } from 'ethereum-waffle';

import { hre } from '@/utils/hre';

export const hardhat = hre;
export const chai = chaiModule.use(solidity);
export const expect = chai.expect;
