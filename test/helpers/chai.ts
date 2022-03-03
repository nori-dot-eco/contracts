import chaiModule from 'chai';
import spies from 'chai-spies';
import { solidity } from 'ethereum-waffle';

import { hre } from '@/utils/hre';

export const hardhat = hre;
export const chai = chaiModule.use(solidity).use(spies);
export const expect = chai.expect;
